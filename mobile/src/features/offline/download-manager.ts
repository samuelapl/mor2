import { Directory, File, Paths } from 'expo-file-system';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';

import type { ApiAssessment } from '../assessments/types/assessment.types';
import type {
  ApiAttachment,
  ApiCourseDetail,
  ApiCourseLesson,
  ApiCourseModule,
} from '../courses/types/course.types';
import {
  offlineDb,
  type OfflineAssessment,
  type OfflineAttachment,
  type OfflineCourse,
  type OfflineLesson,
  type OfflineModule,
} from './offline-db';

export interface DownloadCourseOptions {
  moduleIds?: string[];
  lessonIds?: string[];
}

export interface CourseDownloadProgress {
  courseId: string;
  status: 'idle' | 'downloading' | 'completed' | 'error';
  percent: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  currentStep?: string;
  error?: string;
}

function safeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(-120) || 'file';
}

function isPlayableRemoteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (/youtu\.?be/.test(url)) return false; // YouTube embeds cannot be downloaded as raw media files
  return true;
}

/**
 * Enterprise offline download manager.
 * Explicit learner action only: downloads course metadata, lessons, media, attachments,
 * and assessments into local SQLite + device document storage.
 */
class OfflineDownloadManager {
  private activeDownloads = new Map<string, AbortController>();

  /**
   * Downloads an enrolled course or selected modules/lessons for offline learning.
   */
  async downloadCourse(
    courseId: string,
    onProgress?: (progress: CourseDownloadProgress) => void,
    options?: DownloadCourseOptions,
  ): Promise<void> {
    const notify = (update: Partial<CourseDownloadProgress>) => {
      onProgress?.({
        courseId,
        status: update.status ?? 'downloading',
        percent: update.percent ?? 0,
        downloadedBytes: update.downloadedBytes ?? 0,
        totalBytes: update.totalBytes ?? 0,
        currentStep: update.currentStep,
        error: update.error,
      });
    };

    const abortController = new AbortController();
    this.activeDownloads.set(courseId, abortController);

    try {
      notify({ percent: 5, currentStep: 'Fetching course structure…' });

      // 1. Fetch course details
      const courseDetail = await api.get<ApiCourseDetail>(endpoints.courses.detail(courseId));
      if (!courseDetail) throw new Error('Course not found');

      // 2. Fetch all assessments for this course
      notify({ percent: 15, currentStep: 'Fetching quizzes & assessments…' });
      const assessmentIds = new Set<string>();

      if (courseDetail.assessments) {
        for (const a of courseDetail.assessments) assessmentIds.add(a.id);
      }
      for (const m of courseDetail.modules ?? []) {
        for (const a of m.assessments ?? []) assessmentIds.add(a.id);
        for (const l of m.lessons ?? []) {
          for (const a of l.assessments ?? []) assessmentIds.add(a.id);
          for (const sub of l.subLessons ?? []) {
            for (const a of sub.assessments ?? []) assessmentIds.add(a.id);
          }
        }
      }

      const fetchedAssessments: ApiAssessment[] = [];
      for (const aId of assessmentIds) {
        if (abortController.signal.aborted) throw new Error('Download cancelled');
        try {
          const detail = await api.get<ApiAssessment>(endpoints.assessments.detail(aId));
          if (detail) fetchedAssessments.push(detail);
        } catch (e) {
          console.warn(`[OfflineDownloadManager] Assessment ${aId} fetch error:`, e);
        }
      }

      // 3. Prepare storage directories in document folder
      const baseDir = new Directory(Paths.document, 'offline_courses');
      if (!baseDir.exists) baseDir.create({ intermediates: true });

      const courseDir = new Directory(baseDir, courseId);
      if (!courseDir.exists) courseDir.create({ intermediates: true });

      // 4. Download thumbnail
      notify({ percent: 25, currentStep: 'Downloading course cover…' });
      let localThumbnailUri: string | null = null;
      if (courseDetail.thumbnailUrl) {
        const thumbUrl = resolveMediaUrl(courseDetail.thumbnailUrl);
        if (thumbUrl) {
          try {
            const ext = thumbUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const targetThumb = new File(courseDir, `cover.${ext}`);
            const downloaded = await File.downloadFileAsync(thumbUrl, targetThumb, {
              idempotent: true,
            });
            localThumbnailUri = downloaded.uri;
          } catch (e) {
            console.warn('[OfflineDownloadManager] Cover download failed:', e);
          }
        }
      }

      // 5. Collect lessons and media
      notify({ percent: 35, currentStep: 'Preparing media files…' });
      const allLessons: ApiCourseLesson[] = [];
      for (const m of courseDetail.modules ?? []) {
        for (const l of m.lessons ?? []) {
          allLessons.push(l);
          for (const sub of l.subLessons ?? []) {
            allLessons.push(sub);
          }
        }
      }

      const targetModuleIds = options?.moduleIds?.length ? new Set(options.moduleIds) : null;
      const targetLessonIds = options?.lessonIds?.length ? new Set(options.lessonIds) : null;

      const isTargeted = (l: ApiCourseLesson) => {
        if (!targetModuleIds && !targetLessonIds) return true;
        if (targetModuleIds && targetModuleIds.has(l.moduleId)) return true;
        if (targetLessonIds && targetLessonIds.has(l.id)) return true;
        return false;
      };

      const existingLessons = await offlineDb.getLessonsForCourse(courseId).catch(() => []);
      const existingMap = new Map(existingLessons.map((l) => [l.id, l]));

      // Only eligible/unlocked lessons targeted in this download have their media downloaded!
      const eligibleLessons = allLessons.filter((l) => Boolean(l.unlocked) && isTargeted(l));
      const totalMediaItems = eligibleLessons.filter((l) => isPlayableRemoteUrl(l.resourceUrl)).length;
      let completedMedia = 0;
      let totalBytesAccumulated = 0;

      const offlineLessonsToSave: OfflineLesson[] = [];
      const offlineAttachmentsToSave: OfflineAttachment[] = [];

      for (const lesson of allLessons) {
        if (abortController.signal.aborted) throw new Error('Download cancelled');

        let localMediaUri: string | null = null;
        const isEligible = Boolean(lesson.unlocked);
        const shouldDownload = isEligible && isTargeted(lesson);

        // Download media ONLY if the lesson is targeted and eligible
        if (shouldDownload && isPlayableRemoteUrl(lesson.resourceUrl)) {
          const resolvedMedia = resolveMediaUrl(lesson.resourceUrl);
          if (resolvedMedia) {
            try {
              const ext = resolvedMedia.split('.').pop()?.split('?')[0] || 'mp4';
              const target = new File(courseDir, `lesson_${lesson.id}.${ext}`);
              const downloaded = await File.downloadFileAsync(resolvedMedia, target, {
                idempotent: true,
              });
              localMediaUri = downloaded.uri;
              if (downloaded.size) totalBytesAccumulated += downloaded.size;
            } catch (err) {
              console.warn(`[OfflineDownloadManager] Lesson ${lesson.id} media failed:`, err);
            }
          }
          completedMedia++;
          const mediaPercent = 35 + Math.round((completedMedia / (totalMediaItems || 1)) * 40);
          notify({
            percent: Math.min(75, mediaPercent),
            currentStep: `Downloading content (${completedMedia}/${totalMediaItems})…`,
            downloadedBytes: totalBytesAccumulated,
          });
        } else if (existingMap.has(lesson.id)) {
          localMediaUri = existingMap.get(lesson.id)?.localMediaUri ?? null;
        }

        offlineLessonsToSave.push({
          id: lesson.id,
          courseId,
          moduleId: lesson.moduleId,
          parentId: lesson.parentId,
          title: lesson.title ?? lesson.titleEn ?? 'Lesson',
          titleAm: lesson.titleAm ?? null,
          sortOrder: lesson.order,
          contentType: lesson.contentType,
          durationMinutes: lesson.durationMinutes,
          content: isEligible ? (lesson.content ?? lesson.contentEn ?? null) : null,
          contentAm: isEligible ? (lesson.contentAm ?? null) : null,
          resourceUrl: isEligible ? lesson.resourceUrl : null,
          localMediaUri: isEligible ? localMediaUri : null,
          requiredSeconds: (lesson.durationMinutes ?? 0) * 60,
          isCompleted: existingMap.get(lesson.id)?.isCompleted ?? 0,
          timeSpentSeconds: existingMap.get(lesson.id)?.timeSpentSeconds ?? 0,
          lastPosition: existingMap.get(lesson.id)?.lastPosition ?? 0,
          unlocked: isEligible ? 1 : 0,
        });

        // Download attachments for targeted lessons, or retain existing
        if (shouldDownload) {
          for (const att of lesson.attachments ?? []) {
            let localAttUri: string | null = null;
            if (att.fileUrl) {
              const resolvedAtt = resolveMediaUrl(att.fileUrl);
              if (resolvedAtt) {
                try {
                  const targetAtt = new File(
                    courseDir,
                    `att_${att.id}_${safeFilename(att.fileName)}`,
                  );
                  const downloaded = await File.downloadFileAsync(resolvedAtt, targetAtt, {
                    idempotent: true,
                  });
                  localAttUri = downloaded.uri;
                  if (downloaded.size) totalBytesAccumulated += downloaded.size;
                } catch (err) {
                  console.warn(`[OfflineDownloadManager] Attachment ${att.id} failed:`, err);
                }
              }
            }
            offlineAttachmentsToSave.push({
              id: att.id,
              lessonId: lesson.id,
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              localFileUri: localAttUri,
              sizeBytes: att.sizeBytes ?? 0,
              fileType: att.fileType ?? 'DOCUMENT',
            });
          }
        } else {
          const existingAtts = await offlineDb.getAttachmentsForLesson(lesson.id).catch(() => []);
          for (const att of existingAtts) {
            offlineAttachmentsToSave.push(att);
          }
        }
      }

      // 6. Save Course, Modules, Lessons, Attachments, and Assessments into SQLite
      notify({ percent: 85, currentStep: 'Saving offline database records…' });

      const offlineCourse: OfflineCourse = {
        id: courseDetail.id,
        code: courseDetail.code,
        title: courseDetail.title ?? courseDetail.titleEn ?? '',
        titleAm: courseDetail.titleAm ?? null,
        description: courseDetail.description ?? courseDetail.descriptionEn ?? null,
        descriptionAm: courseDetail.descriptionAm ?? null,
        level: courseDetail.level,
        deliveryMode: courseDetail.deliveryMode,
        thumbnailUrl: courseDetail.thumbnailUrl,
        localThumbnailUri,
        downloadedAt: Date.now(),
        sizeBytes: totalBytesAccumulated,
        version: 1,
      };

      const offlineModules: OfflineModule[] = (courseDetail.modules ?? []).map((m) => ({
        id: m.id,
        courseId,
        title: m.title ?? m.titleEn ?? '',
        titleAm: m.titleAm ?? null,
        description: m.description ?? m.descriptionEn ?? null,
        descriptionAm: m.descriptionAm ?? null,
        sortOrder: m.order,
        durationMinutes: m.durationMinutes,
      }));

      const offlineAssessments: OfflineAssessment[] = fetchedAssessments.map((a) => ({
        id: a.id,
        courseId,
        moduleId: a.moduleId,
        lessonId: a.lessonId,
        type: a.type,
        title: a.title ?? a.titleEn ?? 'Quiz',
        titleAm: a.titleAm ?? null,
        passingScore: a.passingScore,
        maxAttempts: a.maxAttempts,
        timeLimitMinutes: a.timeLimitMinutes,
        questionsJson: JSON.stringify(a.questions ?? []),
      }));

      await offlineDb.saveCourse(offlineCourse);
      await offlineDb.saveModules(offlineModules);
      await offlineDb.saveLessons(offlineLessonsToSave);
      await offlineDb.saveAttachments(offlineAttachmentsToSave);
      await offlineDb.saveAssessments(offlineAssessments);

      notify({
        status: 'completed',
        percent: 100,
        downloadedBytes: totalBytesAccumulated,
        totalBytes: totalBytesAccumulated,
        currentStep: 'Downloaded for offline learning',
      });
    } catch (err: any) {
      notify({
        status: 'error',
        error: err?.message || 'Download failed',
        currentStep: 'Download failed',
      });
      throw err;
    } finally {
      this.activeDownloads.delete(courseId);
    }
  }

  /**
   * Cancels an ongoing download.
   */
  cancelDownload(courseId: string): void {
    const controller = this.activeDownloads.get(courseId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(courseId);
    }
  }

  /**
   * Removes all downloaded files and SQLite records for a course.
   */
  async deleteDownloadedCourse(courseId: string): Promise<void> {
    this.cancelDownload(courseId);

    try {
      const baseDir = new Directory(Paths.document, 'offline_courses');
      const courseDir = new Directory(baseDir, courseId);
      if (courseDir.exists) {
        courseDir.delete();
      }
    } catch (e) {
      console.warn(`[OfflineDownloadManager] Directory cleanup error for ${courseId}:`, e);
    }

    await offlineDb.deleteCourse(courseId);
  }

  /**
   * Checks whether a course is stored locally.
   */
  async isCourseDownloaded(courseId: string): Promise<boolean> {
    const course = await offlineDb.getCourse(courseId);
    return Boolean(course);
  }

  /**
   * Retrieves all downloaded courses for offline display.
   */
  async getDownloadedCourses(): Promise<OfflineCourse[]> {
    return offlineDb.getAllCourses();
  }

  /**
   * Reconstructs an ApiCourseDetail from the offline SQLite database.
   */
  async getOfflineCourseDetail(courseId: string): Promise<ApiCourseDetail | null> {
    const c = await offlineDb.getCourse(courseId);
    if (!c) return null;

    const modules = await offlineDb.getModulesForCourse(courseId);
    const lessons = await offlineDb.getLessonsForCourse(courseId);
    const assessments = await offlineDb.getAssessmentsForCourse(courseId);

    const moduleDetails: ApiCourseModule[] = [];

    for (const m of modules) {
      const moduleLessons = lessons.filter((l) => l.moduleId === m.id && !l.parentId);
      const builtLessons: ApiCourseLesson[] = [];

      for (const l of moduleLessons) {
        const subLessons: ApiCourseLesson[] = lessons
          .filter((sub) => sub.parentId === l.id)
          .map((sub) => ({
            id: sub.id,
            moduleId: m.id,
            parentId: l.id,
            order: sub.sortOrder,
            title: sub.title,
            titleEn: sub.title,
            titleAm: sub.titleAm ?? undefined,
            contentType: sub.contentType as any,
            durationMinutes: sub.durationMinutes ?? null,
            content: sub.content ?? null,
            contentEn: sub.content ?? null,
            contentAm: sub.contentAm ?? undefined,
            resourceUrl: sub.localMediaUri || sub.resourceUrl || null,
            unlocked: sub.unlocked === 1,
            attachments: [],
            assessments: assessments
              .filter((a) => a.lessonId === sub.id)
              .map((a) => ({
                id: a.id,
                title: a.title,
                passingScore: a.passingScore,
                timeLimitMinutes: a.timeLimitMinutes ?? null,
              })),
          }));

        const lessonAttachments = await offlineDb.getAttachmentsForLesson(l.id);
        builtLessons.push({
          id: l.id,
          moduleId: m.id,
          parentId: null,
          order: l.sortOrder,
          title: l.title,
          titleEn: l.title,
          titleAm: l.titleAm ?? undefined,
          contentType: l.contentType as any,
          durationMinutes: l.durationMinutes ?? null,
          content: l.content ?? null,
          contentEn: l.content ?? null,
          contentAm: l.contentAm ?? undefined,
          resourceUrl: l.localMediaUri || l.resourceUrl || null,
          unlocked: l.unlocked === 1,
          attachments: lessonAttachments.map((att) => ({
            id: att.id,
            fileName: att.fileName,
            fileUrl: att.localFileUri || att.fileUrl,
            fileType: att.fileType,
            sizeBytes: att.sizeBytes,
          })),
          assessments: assessments
            .filter((a) => a.lessonId === l.id)
            .map((a) => ({
              id: a.id,
              title: a.title,
              passingScore: a.passingScore,
              timeLimitMinutes: a.timeLimitMinutes ?? null,
            })),
          subLessons,
        });
      }

      moduleDetails.push({
        id: m.id,
        order: m.sortOrder,
        title: m.title,
        titleEn: m.title,
        titleAm: m.titleAm ?? undefined,
        description: m.description ?? null,
        descriptionEn: m.description ?? null,
        descriptionAm: m.descriptionAm ?? undefined,
        objectives: null,
        objectivesEn: null,
        objectivesAm: undefined,
        durationMinutes: m.durationMinutes ?? null,
        passingScore: 70,
        unlocked: true,
        attachments: [],
        assessments: assessments
          .filter((a) => a.moduleId === m.id)
          .map((a) => ({
            id: a.id,
            title: a.title,
            passingScore: a.passingScore,
            timeLimitMinutes: a.timeLimitMinutes ?? null,
          })),
        lessons: builtLessons,
      });
    }

    return {
      id: c.id,
      code: c.code,
      title: c.title,
      titleEn: c.title,
      titleAm: c.titleAm ?? undefined,
      description: c.description ?? null,
      descriptionEn: c.description ?? null,
      descriptionAm: c.descriptionAm ?? undefined,
      objectives: null,
      objectivesEn: null,
      objectivesAm: undefined,
      category: null,
      department: null,
      targetAudience: null,
      language: 'en',
      prerequisites: null,
      estimatedHours: null,
      version: c.version || 1,
      publishedAt: new Date(c.downloadedAt).toISOString(),
      level: c.level as any,
      deliveryMode: c.deliveryMode as any,
      status: 'PUBLISHED',
      thumbnailUrl: c.localThumbnailUri || c.thumbnailUrl || null,
      enrolled: true,
      enrollmentStatus: 'ACTIVE',
      enrolledAt: new Date(c.downloadedAt).toISOString(),
      trainers: [],
      attachments: [],
      assessments: assessments
        .filter((a) => !a.moduleId && !a.lessonId)
        .map((a) => ({
          id: a.id,
          title: a.title,
          passingScore: a.passingScore,
          timeLimitMinutes: a.timeLimitMinutes ?? null,
        })),
      modules: moduleDetails,
    };
  }
}

export const downloadManager = new OfflineDownloadManager();
