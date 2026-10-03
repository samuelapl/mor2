import { create } from 'zustand';

import {
  downloadManager,
  type CourseDownloadProgress,
} from './download-manager';
import { offlineDb, type OfflineCourse } from './offline-db';

interface OfflineStoreState {
  downloadedCourses: OfflineCourse[];
  downloads: Record<string, CourseDownloadProgress>;
  isInitialized: boolean;
  isSyncing: boolean;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setSyncing: (syncing: boolean) => void;
  getPendingCount: (courseId: string) => Promise<number>;
  startDownload: (courseId: string) => Promise<void>;
  cancelDownload: (courseId: string) => void;
  removeDownload: (courseId: string) => Promise<void>;
  isDownloaded: (courseId: string) => boolean;
  getProgress: (courseId: string) => CourseDownloadProgress | undefined;
}

export const useOfflineStore = create<OfflineStoreState>((set, get) => ({
  downloadedCourses: [],
  downloads: {},
  isInitialized: false,
  isSyncing: false,

  init: async () => {
    if (get().isInitialized) return;
    await offlineDb.init();
    const courses = await offlineDb.getAllCourses();
    set({ downloadedCourses: courses, isInitialized: true });
  },

  refresh: async () => {
    await offlineDb.init();
    const courses = await offlineDb.getAllCourses();
    set({ downloadedCourses: courses });
  },

  setSyncing: (isSyncing: boolean) => {
    set({ isSyncing });
  },

  getPendingCount: async (courseId: string) => {
    return offlineDb.getPendingCountForCourse(courseId);
  },

  startDownload: async (courseId: string) => {
    set((state) => ({
      downloads: {
        ...state.downloads,
        [courseId]: {
          courseId,
          status: 'downloading',
          percent: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          currentStep: 'Starting download…',
        },
      },
    }));

    try {
      await downloadManager.downloadCourse(courseId, (progress) => {
        set((state) => ({
          downloads: {
            ...state.downloads,
            [courseId]: progress,
          },
        }));
      });

      await get().refresh();
    } catch (err: any) {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [courseId]: {
            courseId,
            status: 'error',
            percent: 0,
            downloadedBytes: 0,
            totalBytes: 0,
            error: err?.message || 'Download failed',
            currentStep: 'Download failed',
          },
        },
      }));
    }
  },

  cancelDownload: (courseId: string) => {
    downloadManager.cancelDownload(courseId);
    set((state) => {
      const next = { ...state.downloads };
      delete next[courseId];
      return { downloads: next };
    });
  },

  removeDownload: async (courseId: string) => {
    await downloadManager.deleteDownloadedCourse(courseId);
    set((state) => {
      const next = { ...state.downloads };
      delete next[courseId];
      return {
        downloads: next,
        downloadedCourses: state.downloadedCourses.filter((c) => c.id !== courseId),
      };
    });
  },

  isDownloaded: (courseId: string) => {
    return get().downloadedCourses.some((c) => c.id === courseId);
  },

  getProgress: (courseId: string) => {
    return get().downloads[courseId];
  },
}));
