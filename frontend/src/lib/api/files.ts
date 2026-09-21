import { getAccessToken } from "./client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

function url(path: string): string {
  return `${API_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function headers(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Uploads a course cover image via multipart/form-data. */
export async function uploadCover(courseId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  return postForm(`files/cover/${courseId}`, form, (data) =>
    typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : "",
  );
}

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

/** Uploads a course material (video / pdf / audio / presentation / document) as an attachment. */
export async function uploadAttachment(
  file: File,
  opts: { moduleId?: string; lessonId?: string; courseId?: string; purpose?: string } = {},
): Promise<{ fileUrl: string; id: string; fileName: string; sizeBytes: number }> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", opts.purpose || "attachment");
  if (opts.courseId && isUuid(opts.courseId)) form.append("courseId", opts.courseId);
  if (opts.moduleId && isUuid(opts.moduleId)) form.append("moduleId", opts.moduleId);
  if (opts.lessonId && isUuid(opts.lessonId)) form.append("lessonId", opts.lessonId);
  const text = await postFormText("files/upload", form);
  const parsed = JSON.parse(text) as any;
  const data = parsed?.data ?? parsed;
  return {
    fileUrl: data?.fileUrl ?? "",
    id: data?.id ?? "",
    fileName: data?.fileName ?? file.name,
    sizeBytes: data?.sizeBytes ?? file.size,
  };
}

/** Uploads a profile avatar for the signed-in user; persists avatarUrl server-side. */
export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  return postForm("files/avatar", form, (data) =>
    typeof data.avatarUrl === "string" ? data.avatarUrl : "",
  );
}

/** Uploads a certificate template background image. */
export async function uploadCertificateTemplate(
  file: File,
): Promise<{ backgroundUrl: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "certificate_template");
  const text = await postFormText("files/certificate-template", form);
  const parsed = JSON.parse(text) as { data?: { backgroundUrl?: string } };
  return { backgroundUrl: parsed?.data?.backgroundUrl ?? "" };
}

async function postForm(
  path: string,
  form: FormData,
  pick: (data: Record<string, unknown>) => string,
): Promise<string> {
  const res = await fetch(url(path), {
    method: "POST",
    headers: headers(),
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    let errorMsg = `Upload failed (${res.status})`;
    try {
      const json = JSON.parse(errorText);
      if (json.message) {
        errorMsg = Array.isArray(json.message) ? json.message.join(", ") : json.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  const body = (await res.json()) as { data?: Record<string, unknown> };
  return pick(body?.data ?? {});
}

async function postFormText(path: string, form: FormData): Promise<string> {
  const res = await fetch(url(path), {
    method: "POST",
    headers: headers(),
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    let errorMsg = `Upload failed (${res.status})`;
    try {
      const json = JSON.parse(errorText);
      if (json.message) {
        errorMsg = Array.isArray(json.message) ? json.message.join(", ") : json.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.text();
}