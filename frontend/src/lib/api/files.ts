import { getAccessToken } from "./client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

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

/** Uploads a course material (video / pdf) as a course-level attachment. */
export async function uploadAttachment(
  file: File,
  opts: { moduleId?: string; lessonId?: string; courseId?: string } = {},
): Promise<{ fileUrl: string; id: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "attachment");
  if (opts.courseId) form.append("courseId", opts.courseId);
  if (opts.moduleId) form.append("moduleId", opts.moduleId);
  if (opts.lessonId) form.append("lessonId", opts.lessonId);
  const text = await postFormText("files/upload", form);
  const parsed = JSON.parse(text) as { data?: { fileUrl?: string; id?: string } };
  return { fileUrl: parsed?.data?.fileUrl ?? "", id: parsed?.data?.id ?? "" };
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
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
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
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.text();
}