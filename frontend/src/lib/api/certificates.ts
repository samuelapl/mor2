import { api } from "./client";
import type {
  ApiCertificate,
  ApiCertificateTemplate,
  CreateCertificateTemplateBody,
  UpdateCertificateTemplateBody,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Certificates                                                                */
/* -------------------------------------------------------------------------- */

export async function fetchMyCertificates(): Promise<ApiCertificate[]> {
  return api<ApiCertificate[]>("certificates/me");
}

export async function fetchCertificate(id: string): Promise<ApiCertificate> {
  return api<ApiCertificate>(`certificates/${id}`);
}

export async function claimCertificate(courseId: string): Promise<ApiCertificate> {
  return api<ApiCertificate>(`certificates/claim?courseId=${encodeURIComponent(courseId)}`, {
    method: "POST",
  });
}

export async function fetchCertificateDownloadUrl(id: string): Promise<{ downloadUrl: string }> {
  return api<{ downloadUrl: string }>(`certificates/${id}/download`);
}

export async function revokeCertificate(id: string): Promise<void> {
  await api<unknown>(`certificates/${id}`, { method: "DELETE" });
}

/* -------------------------------------------------------------------------- */
/*  Certificate templates (system admin)                                        */
/* -------------------------------------------------------------------------- */

export async function fetchCertificateTemplates(): Promise<ApiCertificateTemplate[]> {
  return api<ApiCertificateTemplate[]>("certificate-templates");
}

export async function fetchActiveCertificateTemplate(): Promise<ApiCertificateTemplate | null> {
  return api<ApiCertificateTemplate>("certificate-templates/active");
}

export async function fetchCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}`);
}

export async function createCertificateTemplate(
  body: CreateCertificateTemplateBody,
): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>("certificate-templates", { method: "POST", body });
}

export async function updateCertificateTemplate(
  id: string,
  body: UpdateCertificateTemplateBody,
): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}`, { method: "PATCH", body });
}

export async function activateCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}/activate`, { method: "POST" });
}

export async function duplicateCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}/duplicate`, { method: "POST" });
}

export async function deleteCertificateTemplate(id: string): Promise<void> {
  await api<unknown>(`certificate-templates/${id}`, { method: "DELETE" });
}