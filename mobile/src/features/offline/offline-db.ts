import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface OfflineCourse {
  id: string;
  code: string;
  title: string;
  titleAm?: string | null;
  description?: string | null;
  descriptionAm?: string | null;
  objectives?: string | null;
  objectivesAm?: string | null;
  level: string;
  deliveryMode: string;
  thumbnailUrl?: string | null;
  localThumbnailUri?: string | null;
  downloadedAt: number;
  sizeBytes: number;
  version: number;
}

export interface OfflineModule {
  id: string;
  courseId: string;
  title: string;
  titleAm?: string | null;
  description?: string | null;
  descriptionAm?: string | null;
  objectives?: string | null;
  objectivesAm?: string | null;
  sortOrder: number;
  durationMinutes?: number | null;
}

export interface OfflineLesson {
  id: string;
  courseId: string;
  moduleId: string;
  parentId?: string | null;
  title: string;
  titleAm?: string | null;
  sortOrder: number;
  contentType: string;
  durationMinutes?: number | null;
  content?: string | null;
  contentAm?: string | null;
  resourceUrl?: string | null;
  localMediaUri?: string | null;
  requiredSeconds: number;
  isCompleted: number; // 0 or 1
  timeSpentSeconds: number;
  lastPosition: number;
  unlocked: number; // 0 or 1
}

export interface OfflineAttachment {
  id: string;
  lessonId: string;
  fileName: string;
  fileUrl: string;
  localFileUri?: string | null;
  sizeBytes: number;
  fileType: string;
}

export interface OfflineAssessment {
  id: string;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  type: string;
  title: string;
  titleAm?: string | null;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes?: number | null;
  questionsJson: string; // Serialized questions array
}

export interface OfflineQuizAttempt {
  id: string;
  assessmentId: string;
  courseId: string;
  answersJson: string; // Serialized SubmitAnswer[]
  startedAt: number;
  submittedAt: number;
  score: number;
  passed: number; // 0 or 1
  /** PENDING → waiting for a connection; SYNCED → graded by the server; FAILED → rejected. */
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  syncError?: string | null;
  attemptNumber: number;
  /** Server GradedResult (JSON) once synced, so the learner can review it later. */
  resultJson?: string | null;
}

export interface OfflineProgressQueueItem {
  id: string;
  courseId: string;
  lessonId: string;
  type: 'HEARTBEAT' | 'COMPLETION' | 'PLAYHEAD';
  payloadJson: string;
  createdAt: number;
  syncStatus: 'QUEUED' | 'SYNCING' | 'FAILED';
  attempts: number;
}

class OfflineDatabaseManager {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  private getDb(): SQLite.SQLiteDatabase {
    if (this.db) return this.db;
    if (Platform.OS === 'web') {
      // In web browser dev preview, openDatabaseSync is polyfilled or memory-backed
      this.db = SQLite.openDatabaseSync('offline_learning.db');
    } else {
      this.db = SQLite.openDatabaseSync('offline_learning.db');
    }
    return this.db;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const db = this.getDb();

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS offline_courses (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        title TEXT NOT NULL,
        titleAm TEXT,
        description TEXT,
        descriptionAm TEXT,
        level TEXT,
        deliveryMode TEXT,
        thumbnailUrl TEXT,
        localThumbnailUri TEXT,
        downloadedAt INTEGER NOT NULL,
        sizeBytes INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS offline_modules (
        id TEXT PRIMARY KEY,
        courseId TEXT NOT NULL,
        title TEXT NOT NULL,
        titleAm TEXT,
        description TEXT,
        descriptionAm TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        durationMinutes INTEGER
      );

      CREATE TABLE IF NOT EXISTS offline_lessons (
        id TEXT PRIMARY KEY,
        courseId TEXT NOT NULL,
        moduleId TEXT NOT NULL,
        parentId TEXT,
        title TEXT NOT NULL,
        titleAm TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        contentType TEXT NOT NULL,
        durationMinutes INTEGER,
        content TEXT,
        contentAm TEXT,
        resourceUrl TEXT,
        localMediaUri TEXT,
        requiredSeconds INTEGER NOT NULL DEFAULT 0,
        isCompleted INTEGER NOT NULL DEFAULT 0,
        timeSpentSeconds INTEGER NOT NULL DEFAULT 0,
        lastPosition INTEGER NOT NULL DEFAULT 0,
        unlocked INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS offline_attachments (
        id TEXT PRIMARY KEY,
        lessonId TEXT NOT NULL,
        fileName TEXT NOT NULL,
        fileUrl TEXT NOT NULL,
        localFileUri TEXT,
        sizeBytes INTEGER NOT NULL DEFAULT 0,
        fileType TEXT NOT NULL DEFAULT 'DOCUMENT'
      );

      CREATE TABLE IF NOT EXISTS offline_assessments (
        id TEXT PRIMARY KEY,
        courseId TEXT NOT NULL,
        moduleId TEXT,
        lessonId TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        titleAm TEXT,
        passingScore INTEGER NOT NULL DEFAULT 70,
        maxAttempts INTEGER NOT NULL DEFAULT 3,
        timeLimitMinutes INTEGER,
        questionsJson TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_quiz_attempts (
        id TEXT PRIMARY KEY,
        assessmentId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        answersJson TEXT NOT NULL,
        startedAt INTEGER NOT NULL,
        submittedAt INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        syncStatus TEXT NOT NULL DEFAULT 'PENDING',
        syncError TEXT,
        attemptNumber INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS offline_progress_queue (
        id TEXT PRIMARY KEY,
        courseId TEXT NOT NULL,
        lessonId TEXT NOT NULL,
        type TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        syncStatus TEXT NOT NULL DEFAULT 'QUEUED',
        attempts INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_modules_course ON offline_modules(courseId);
      CREATE INDEX IF NOT EXISTS idx_lessons_course ON offline_lessons(courseId);
      CREATE INDEX IF NOT EXISTS idx_lessons_module ON offline_lessons(moduleId);
      CREATE INDEX IF NOT EXISTS idx_attachments_lesson ON offline_attachments(lessonId);
      CREATE INDEX IF NOT EXISTS idx_assessments_course ON offline_assessments(courseId);
      CREATE INDEX IF NOT EXISTS idx_attempts_assessment ON offline_quiz_attempts(assessmentId);
      CREATE INDEX IF NOT EXISTS idx_attempts_status ON offline_quiz_attempts(syncStatus);
      CREATE INDEX IF NOT EXISTS idx_queue_status ON offline_progress_queue(syncStatus);
    `);

    // Columns added after the first release; ALTER fails harmlessly when they already exist.
    const addedColumns = [
      'ALTER TABLE offline_courses ADD COLUMN objectives TEXT;',
      'ALTER TABLE offline_courses ADD COLUMN objectivesAm TEXT;',
      'ALTER TABLE offline_modules ADD COLUMN objectives TEXT;',
      'ALTER TABLE offline_modules ADD COLUMN objectivesAm TEXT;',
      'ALTER TABLE offline_quiz_attempts ADD COLUMN resultJson TEXT;',
    ];
    for (const sql of addedColumns) {
      try {
        await db.execAsync(sql);
      } catch {
        // column already exists
      }
    }

    this.initialized = true;
  }

  // ── Courses ──────────────────────────────────────────────
  async saveCourse(course: OfflineCourse): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_courses (
        id, code, title, titleAm, description, descriptionAm, objectives, objectivesAm, level,
        deliveryMode, thumbnailUrl, localThumbnailUri, downloadedAt, sizeBytes, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      course.id,
      course.code,
      course.title,
      course.titleAm ?? null,
      course.description ?? null,
      course.descriptionAm ?? null,
      course.objectives ?? null,
      course.objectivesAm ?? null,
      course.level,
      course.deliveryMode,
      course.thumbnailUrl ?? null,
      course.localThumbnailUri ?? null,
      course.downloadedAt,
      course.sizeBytes,
      course.version,
    );
  }

  async getCourse(courseId: string): Promise<OfflineCourse | null> {
    await this.init();
    const db = this.getDb();
    return db.getFirstAsync<OfflineCourse>('SELECT * FROM offline_courses WHERE id = ?;', courseId);
  }

  async getAllCourses(): Promise<OfflineCourse[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineCourse>(
      'SELECT * FROM offline_courses ORDER BY downloadedAt DESC;',
    );
  }

  async deleteCourse(courseId: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync('DELETE FROM offline_courses WHERE id = ?;', courseId);
    await db.runAsync('DELETE FROM offline_modules WHERE courseId = ?;', courseId);
    await db.runAsync('DELETE FROM offline_lessons WHERE courseId = ?;', courseId);
    await db.runAsync('DELETE FROM offline_assessments WHERE courseId = ?;', courseId);
  }

  // ── Modules ──────────────────────────────────────────────
  async saveModules(modules: OfflineModule[]): Promise<void> {
    await this.init();
    const db = this.getDb();
    for (const m of modules) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_modules (
          id, courseId, title, titleAm, description, descriptionAm, objectives, objectivesAm,
          sortOrder, durationMinutes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        m.id,
        m.courseId,
        m.title,
        m.titleAm ?? null,
        m.description ?? null,
        m.descriptionAm ?? null,
        m.objectives ?? null,
        m.objectivesAm ?? null,
        m.sortOrder,
        m.durationMinutes ?? null,
      );
    }
  }

  async getModulesForCourse(courseId: string): Promise<OfflineModule[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineModule>(
      'SELECT * FROM offline_modules WHERE courseId = ? ORDER BY sortOrder ASC;',
      courseId,
    );
  }

  async deleteModule(moduleId: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync('DELETE FROM offline_modules WHERE id = ?;', moduleId);
  }

  // ── Lessons ──────────────────────────────────────────────
  async saveLessons(lessons: OfflineLesson[]): Promise<void> {
    await this.init();
    const db = this.getDb();
    for (const l of lessons) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_lessons (
          id, courseId, moduleId, parentId, title, titleAm, sortOrder,
          contentType, durationMinutes, content, contentAm, resourceUrl,
          localMediaUri, requiredSeconds, isCompleted, timeSpentSeconds, lastPosition, unlocked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        l.id,
        l.courseId,
        l.moduleId,
        l.parentId ?? null,
        l.title,
        l.titleAm ?? null,
        l.sortOrder,
        l.contentType,
        l.durationMinutes ?? null,
        l.content ?? null,
        l.contentAm ?? null,
        l.resourceUrl ?? null,
        l.localMediaUri ?? null,
        l.requiredSeconds,
        l.isCompleted,
        l.timeSpentSeconds,
        l.lastPosition,
        l.unlocked,
      );
    }
  }

  async getLesson(lessonId: string): Promise<OfflineLesson | null> {
    await this.init();
    const db = this.getDb();
    return db.getFirstAsync<OfflineLesson>('SELECT * FROM offline_lessons WHERE id = ?;', lessonId);
  }

  async getLessonsForModule(moduleId: string): Promise<OfflineLesson[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineLesson>(
      'SELECT * FROM offline_lessons WHERE moduleId = ? ORDER BY sortOrder ASC;',
      moduleId,
    );
  }

  async getLessonsForCourse(courseId: string): Promise<OfflineLesson[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineLesson>(
      'SELECT * FROM offline_lessons WHERE courseId = ? ORDER BY sortOrder ASC;',
      courseId,
    );
  }

  async deleteLesson(lessonId: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync('DELETE FROM offline_lessons WHERE id = ?;', lessonId);
    await db.runAsync('DELETE FROM offline_attachments WHERE lessonId = ?;', lessonId);
  }

  async updateLessonProgress(
    lessonId: string,
    updates: {
      isCompleted?: boolean;
      timeSpentDelta?: number;
      lastPosition?: number;
    },
  ): Promise<void> {
    await this.init();
    const db = this.getDb();
    const current = await this.getLesson(lessonId);
    if (!current) return;

    const newCompleted =
      updates.isCompleted !== undefined ? (updates.isCompleted ? 1 : 0) : current.isCompleted;
    const newTime = current.timeSpentSeconds + (updates.timeSpentDelta ?? 0);
    const newPos = updates.lastPosition ?? current.lastPosition;

    await db.runAsync(
      `UPDATE offline_lessons
       SET isCompleted = ?, timeSpentSeconds = ?, lastPosition = ?
       WHERE id = ?;`,
      newCompleted,
      newTime,
      newPos,
      lessonId,
    );
  }

  // ── Attachments ──────────────────────────────────────────
  async saveAttachments(attachments: OfflineAttachment[]): Promise<void> {
    await this.init();
    const db = this.getDb();
    for (const a of attachments) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_attachments (
          id, lessonId, fileName, fileUrl, localFileUri, sizeBytes, fileType
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        a.id,
        a.lessonId,
        a.fileName,
        a.fileUrl,
        a.localFileUri ?? null,
        a.sizeBytes,
        a.fileType,
      );
    }
  }

  async getAttachmentsForLesson(lessonId: string): Promise<OfflineAttachment[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineAttachment>(
      'SELECT * FROM offline_attachments WHERE lessonId = ?;',
      lessonId,
    );
  }

  // ── Assessments ──────────────────────────────────────────
  async saveAssessments(assessments: OfflineAssessment[]): Promise<void> {
    await this.init();
    const db = this.getDb();
    for (const a of assessments) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_assessments (
          id, courseId, moduleId, lessonId, type, title, titleAm,
          passingScore, maxAttempts, timeLimitMinutes, questionsJson
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        a.id,
        a.courseId,
        a.moduleId ?? null,
        a.lessonId ?? null,
        a.type,
        a.title,
        a.titleAm ?? null,
        a.passingScore,
        a.maxAttempts,
        a.timeLimitMinutes ?? null,
        a.questionsJson,
      );
    }
  }

  async getAssessment(id: string): Promise<OfflineAssessment | null> {
    await this.init();
    const db = this.getDb();
    return db.getFirstAsync<OfflineAssessment>(
      'SELECT * FROM offline_assessments WHERE id = ?;',
      id,
    );
  }

  async getAssessmentsForCourse(courseId: string): Promise<OfflineAssessment[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineAssessment>(
      'SELECT * FROM offline_assessments WHERE courseId = ?;',
      courseId,
    );
  }

  async deleteAssessment(id: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync('DELETE FROM offline_assessments WHERE id = ?;', id);
  }

  async deleteAssessmentsForModule(moduleId: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync('DELETE FROM offline_assessments WHERE moduleId = ?;', moduleId);
  }

  // ── Quiz Attempts ────────────────────────────────────────
  async saveQuizAttempt(attempt: OfflineQuizAttempt): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_quiz_attempts (
        id, assessmentId, courseId, answersJson, startedAt, submittedAt,
        score, passed, syncStatus, syncError, attemptNumber, resultJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      attempt.id,
      attempt.assessmentId,
      attempt.courseId,
      attempt.answersJson,
      attempt.startedAt,
      attempt.submittedAt,
      attempt.score,
      attempt.passed,
      attempt.syncStatus,
      attempt.syncError ?? null,
      attempt.attemptNumber,
      attempt.resultJson ?? null,
    );
  }

  async getPendingQuizAttempts(): Promise<OfflineQuizAttempt[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineQuizAttempt>(
      "SELECT * FROM offline_quiz_attempts WHERE syncStatus = 'PENDING' ORDER BY submittedAt ASC;",
    );
  }

  /** Most recent offline attempt for an assessment (any sync status). */
  async getLatestQuizAttempt(assessmentId: string): Promise<OfflineQuizAttempt | null> {
    await this.init();
    const db = this.getDb();
    return db.getFirstAsync<OfflineQuizAttempt>(
      'SELECT * FROM offline_quiz_attempts WHERE assessmentId = ? ORDER BY submittedAt DESC LIMIT 1;',
      assessmentId,
    );
  }

  async markQuizAttemptSynced(
    id: string,
    result: { score: number; passed: boolean; resultJson: string },
  ): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync(
      "UPDATE offline_quiz_attempts SET syncStatus = 'SYNCED', syncError = NULL, score = ?, passed = ?, resultJson = ? WHERE id = ?;",
      result.score,
      result.passed ? 1 : 0,
      result.resultJson,
      id,
    );
  }

  async markQuizAttemptFailed(id: string, error: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync(
      "UPDATE offline_quiz_attempts SET syncStatus = 'FAILED', syncError = ? WHERE id = ?;",
      error,
      id,
    );
  }

  // ── Progress Queue ───────────────────────────────────────
  async enqueueProgress(
    courseId: string,
    lessonId: string,
    type: 'HEARTBEAT' | 'COMPLETION' | 'PLAYHEAD',
    payload: unknown,
  ): Promise<void> {
    await this.init();
    const db = this.getDb();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await db.runAsync(
      `INSERT INTO offline_progress_queue (
        id, courseId, lessonId, type, payloadJson, createdAt, syncStatus, attempts
      ) VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', 0);`,
      id,
      courseId,
      lessonId,
      type,
      JSON.stringify(payload),
      Date.now(),
    );
  }

  async getQueuedProgress(): Promise<OfflineProgressQueueItem[]> {
    await this.init();
    const db = this.getDb();
    return db.getAllAsync<OfflineProgressQueueItem>(
      "SELECT * FROM offline_progress_queue WHERE syncStatus = 'QUEUED' ORDER BY createdAt ASC;",
    );
  }

  async removeProgressItem(id: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync('DELETE FROM offline_progress_queue WHERE id = ?;', id);
  }

  async incrementProgressAttempts(id: string): Promise<void> {
    await this.init();
    const db = this.getDb();
    await db.runAsync(
      'UPDATE offline_progress_queue SET attempts = attempts + 1 WHERE id = ?;',
      id,
    );
  }

  async getPendingCountForCourse(courseId: string): Promise<number> {
    await this.init();
    const db = this.getDb();
    const attempts = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM offline_quiz_attempts WHERE courseId = ? AND syncStatus = 'PENDING';",
      courseId,
    );
    const queue = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM offline_progress_queue WHERE courseId = ? AND syncStatus = 'QUEUED';",
      courseId,
    );
    return (attempts?.count ?? 0) + (queue?.count ?? 0);
  }
}

export const offlineDb = new OfflineDatabaseManager();
