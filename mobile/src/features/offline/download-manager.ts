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
import type { CourseProgress } from '../progress/types/progress.types';
import {
  offlineDb,
  type OfflineAssessment,
  type OfflineAttachment,
  type OfflineCourse,
  type OfflineLesson,
  type OfflineModule,
} from './offline-db';

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

export interface DownloadCourseOptions {
  moduleIds?: string[];
  lessonIds?: string[];
  subLessonIds?: string[];
  assessmentIds?: string[];
}

/**
 * Enterprise offline download manager.
 * Explicit learner action only: downloads course metadata, lessons, media, attachments,
 * and assessments into local SQLite + device document storage.
 */
class OfflineDownloadManager {
  private activeDownloads = new Map<string, AbortController>();

  /**
   * Downloads an enrolled course (or selected modules/lessons/quizzes) for offline learning.
   */
  async downloadCourse(
    courseId: string,
    optionsOrProgress?: DownloadCourseOptions | ((progress: CourseDownloadProgress) => void),
    maybeProgress?: (progress: CourseDownloadProgress) => void,
  ): Promise<void> {
    const options: DownloadCourseOptions | undefined =
      typeof optionsOrProgress === 'object' ? optionsOrProgress : undefined;
    const onProgress: ((progress: CourseDownloadProgress) => void) | undefined =
      typeof optionsOrProgress === 'function' ? optionsOrProgress : maybeProgress;
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

      // 1. Fetch progress to verify unlock status
      let progressData: CourseProgress | null = null;
      try {
        progressData = await api.get<CourseProgress>(endpoints.progress.course(courseId));
      } catch {
        // Ignored if offline or not enrolled
      }

      // Collect all lessons to check hierarchical unlock status
      const allLessons: ApiCourseLesson[] = [];
      for (const m of courseDetail.modules ?? []) {
        for (const l of m.lessons ?? []) {
          allLessons.push(l);
          for (const sub of l.subLessons ?? []) {
            allLessons.push(sub);
          }
        }
      }

      const isLessonUnlockedInCourse = (lesson: ApiCourseLesson): boolean => {
        if (progressData?.modules) {
          for (const m of progressData.modules) {
            if (m.moduleId === lesson.moduleId) {
              if (!m.unlocked) return false;
              const lp = m.lessons?.find((l) => l.lessonId === lesson.id);
              if (lp) return lp.unlocked === true;
              for (const pl of m.lessons ?? []) {
                const sp = pl.subLessons?.find((s) => s.lessonId === lesson.id);
                if (sp) return sp.unlocked === true;
              }
            }
          }
        }
        return Boolean(lesson.unlocked);
      };

      const isAssessmentUnlockedInCourse = (
        aId: string,
        modId?: string | null,
        lesId?: string | null,
      ): boolean => {
        // Course final assessment: ONLY if content is completed
        if (!modId && !lesId) {
          return progressData ? progressData.courseCompletion?.contentCompleted === true : false;
        }
        if (modId) {
          const modProg = progressData?.modules?.find((m) => m.moduleId === modId);
          if (modProg && !modProg.unlocked) return false;
        }
        if (lesId) {
          const lesItem = allLessons.find((l) => l.id === lesId);
          if (lesItem && !isLessonUnlockedInCourse(lesItem)) return false;
        }
        return true;
      };

      // Check if selective filtering was requested
      const hasSpecificFilter = Boolean(
        (options?.moduleIds && options.moduleIds.length > 0) ||
        (options?.lessonIds && options.lessonIds.length > 0) ||
        (options?.subLessonIds && options.subLessonIds.length > 0) ||
        (options?.assessmentIds && options.assessmentIds.length > 0),
      );

      const isLessonSelected = (lesson: ApiCourseLesson) => {
        if (!hasSpecificFilter) return true;
        if (options?.lessonIds?.includes(lesson.id)) return true;
        if (options?.subLessonIds?.includes(lesson.id)) return true;
        if (options?.moduleIds?.includes(lesson.moduleId)) return true;
        return false;
      };

      const isAssessmentSelected = (aId: string, modId?: string | null, lesId?: string | null) => {
        if (!hasSpecificFilter) return true;
        if (options?.assessmentIds?.includes(aId)) return true;
        if (modId && options?.moduleIds?.includes(modId)) return true;
        if (lesId && options?.lessonIds?.includes(lesId)) return true;
        return false;
      };

      // 2. Load existing stored offline data to preserve previously downloaded content
      const existingLessons = await offlineDb.getLessonsForCourse(courseId);
      const existingLessonMap = new Map(existingLessons.map((l) => [l.id, l]));

      const existingAssessments = await offlineDb.getAssessmentsForCourse(courseId);
      const existingAssessmentMap = new Map(existingAssessments.map((a) => [a.id, a]));

      // 3. Fetch assessments for this course (UNLOCKED ONLY)
      notify({ percent: 15, currentStep: 'Fetching quizzes & assessments…' });
      const assessmentIds = new Set<string>();

      if (courseDetail.assessments) {
        for (const a of courseDetail.assessments) {
          if (isAssessmentSelected(a.id) && isAssessmentUnlockedInCourse(a.id)) {
            assessmentIds.add(a.id);
          }
        }
      }
      for (const m of courseDetail.modules ?? []) {
        for (const a of m.assessments ?? []) {
          if (isAssessmentSelected(a.id, m.id) && isAssessmentUnlockedInCourse(a.id, m.id)) {
            assessmentIds.add(a.id);
          }
        }
        for (const l of m.lessons ?? []) {
          for (const a of l.assessments ?? []) {
            if (
              isAssessmentSelected(a.id, m.id, l.id) &&
              isAssessmentUnlockedInCourse(a.id, m.id, l.id)
            ) {
              assessmentIds.add(a.id);
            }
          }
          for (const sub of l.subLessons ?? []) {
            for (const a of sub.assessments ?? []) {
              if (
                isAssessmentSelected(a.id, m.id, sub.id) &&
                isAssessmentUnlockedInCourse(a.id, m.id, sub.id)
              ) {
                assessmentIds.add(a.id);
              }
            }
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

      // Merge fetched assessments with previously saved assessments that were not re-fetched
      const mergedAssessments: OfflineAssessment[] = fetchedAssessments.map((a) => ({
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
      for (const prevA of existingAssessments) {
        if (!mergedAssessments.some((a) => a.id === prevA.id)) {
          mergedAssessments.push(prevA);
        }
      }

      // 4. Prepare storage directories in document folder
      const baseDir = new Directory(Paths.document, 'offline_courses');
      if (!baseDir.exists) baseDir.create({ intermediates: true });

      const courseDir = new Directory(baseDir, courseId);
      if (!courseDir.exists) courseDir.create({ intermediates: true });

      // 5. Download thumbnail if not already present
      notify({ percent: 25, currentStep: 'Downloading course cover…' });
      let localThumbnailUri: string | null = null;
      if (courseDetail.thumbnailUrl) {
        const thumbUrl = resolveMediaUrl(courseDetail.thumbnailUrl);
        if (thumbUrl) {
          try {
            const ext = thumbUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const targetThumb = new File(courseDir, `cover.${ext}`);
            if (targetThumb.exists) {
              localThumbnailUri = targetThumb.uri;
            } else {
              const downloaded = await File.downloadFileAsync(thumbUrl, targetThumb, {
                idempotent: true,
              });
              localThumbnailUri = downloaded.uri;
            }
          } catch (e) {
            console.warn('[OfflineDownloadManager] Cover download failed:', e);
          }
        }
      }

      // 6. Collect lessons and media (UNLOCKED ONLY)
      notify({ percent: 35, currentStep: 'Preparing media files…' });

      // Eligible lessons that match current selection and are UNLOCKED
      const targetLessons = allLessons.filter(
        (l) => isLessonUnlockedInCourse(l) && isLessonSelected(l),
      );
      const totalMediaItems = targetLessons.filter((l) => isPlayableRemoteUrl(l.resourceUrl)).length;
      let completedMedia = 0;
      let totalBytesAccumulated = 0;

      const offlineLessonsToSave: OfflineLesson[] = [];
      const offlineAttachmentsToSave: OfflineAttachment[] = [];

      for (const lesson of allLessons) {
        if (abortController.signal.aborted) throw new Error('Download cancelled');

        const prevLesson = existingLessonMap.get(lesson.id);
        const isEligible = isLessonUnlockedInCourse(lesson);
        const shouldDownload = isEligible && isLessonSelected(lesson);

        // Never save locked content into offline storage
        if (!isEligible && !prevLesson) {
          continue;
        }

        let localMediaUri: string | null = prevLesson?.localMediaUri ?? null;

        // Download media if selected and eligible
        if (shouldDownload && isEligible && isPlayableRemoteUrl(lesson.resourceUrl)) {
          const resolvedMedia = resolveMediaUrl(lesson.resourceUrl);
          if (resolvedMedia) {
            try {
              const ext = resolvedMedia.split('.').pop()?.split('?')[0] || 'mp4';
              const target = new File(courseDir, `lesson_${lesson.id}.${ext}`);
              if (!target.exists) {
                const downloaded = await File.downloadFileAsync(resolvedMedia, target, {
                  idempotent: true,
                });
                localMediaUri = downloaded.uri;
                if (downloaded.size) totalBytesAccumulated += downloaded.size;
              } else {
                localMediaUri = target.uri;
                if (target.size) totalBytesAccumulated += target.size;
              }
            } catch (err) {
              console.warn(`[OfflineDownloadManager] Lesson ${lesson.id} media failed:`, err);
            }
          }
          completedMedia++;
          const mediaPercent = 35 + Math.round((completedMedia / (totalMediaItems || 1)) * 40);
          notify({
            percent: Math.min(75, mediaPercent),
            currentStep: `Downloading eligible content (${completedMedia}/${totalMediaItems})…`,
            downloadedBytes: totalBytesAccumulated,
          });
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
          localMediaUri,
          requiredSeconds: (lesson.durationMinutes ?? 0) * 60,
          isCompleted: prevLesson?.isCompleted ?? 0,
          timeSpentSeconds: prevLesson?.timeSpentSeconds ?? 0,
          lastPosition: prevLesson?.lastPosition ?? 0,
          unlocked: isEligible ? 1 : 0,
        });

        // Download attachments if selected and eligible
        if (shouldDownload && isEligible) {
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
                  if (!targetAtt.exists) {
                    const downloaded = await File.downloadFileAsync(resolvedAtt, targetAtt, {
                      idempotent: true,
                    });
                    localAttUri = downloaded.uri;
                    if (downloaded.size) totalBytesAccumulated += downloaded.size;
                  } else {
                    localAttUri = targetAtt.uri;
                    if (targetAtt.size) totalBytesAccumulated += targetAtt.size;
                  }
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

      await offlineDb.saveCourse(offlineCourse);
      await offlineDb.saveModules(offlineModules);
      await offlineDb.saveLessons(offlineLessonsToSave);
      await offlineDb.saveAttachments(offlineAttachmentsToSave);
      await offlineDb.saveAssessments(mergedAssessments);

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
