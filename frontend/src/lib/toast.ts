export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  id?: string;
  title?: string;
  duration?: number; // duration in ms; defaults to 4000ms (0 = persistent until dismissed)
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function addToast(
  type: ToastType,
  message: string,
  options: ToastOptions = {},
): string {
  const id = options.id ?? generateId();
  const duration =
    options.duration !== undefined
      ? options.duration
      : type === "loading"
      ? 0
      : 4000;

  const item: ToastItem = {
    ...options,
    id,
    type,
    message,
    duration,
    createdAt: Date.now(),
  };

  // If toast with this id already exists, update it in place
  const existingIdx = toasts.findIndex((t) => t.id === id);
  if (existingIdx !== -1) {
    toasts[existingIdx] = item;
  } else {
    // Keep max 5 toasts visible at a time
    toasts = [item, ...toasts].slice(0, 5);
  }

  notify();
  return id;
}

export function dismissToast(id?: string): void {
  if (!id) {
    toasts = [];
  } else {
    toasts = toasts.filter((t) => t.id !== id);
  }
  notify();
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastItem[] {
  return [...toasts];
}

interface ToastPromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
}

/**
 * Unified enterprise toast interface
 */
export const toast = Object.assign(
  (message: string, options?: ToastOptions) => addToast("info", message, options),
  {
    success: (message: string, options?: ToastOptions) =>
      addToast("success", message, options),
    error: (message: string, options?: ToastOptions) =>
      addToast("error", message, options),
    warning: (message: string, options?: ToastOptions) =>
      addToast("warning", message, options),
    info: (message: string, options?: ToastOptions) =>
      addToast("info", message, options),
    loading: (message: string, options?: ToastOptions) =>
      addToast("loading", message, options),
    dismiss: (id?: string) => dismissToast(id),
    promise: async <T>(
      promise: Promise<T>,
      msgs: ToastPromiseMessages<T>,
      options?: ToastOptions,
    ): Promise<T> => {
      const toastId = options?.id ?? generateId();
      addToast("loading", msgs.loading, { ...options, id: toastId, duration: 0 });

      try {
        const result = await promise;
        const successMessage =
          typeof msgs.success === "function" ? msgs.success(result) : msgs.success;
        addToast("success", successMessage, { ...options, id: toastId, duration: 4000 });
        return result;
      } catch (err) {
        const errorMessage =
          typeof msgs.error === "function"
            ? msgs.error(err)
            : msgs.error || (err instanceof Error ? err.message : "An error occurred");
        addToast("error", errorMessage, { ...options, id: toastId, duration: 5000 });
        throw err;
      }
    },
  },
);
