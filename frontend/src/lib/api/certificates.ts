import { api } from './client';
import type {
  ApiCertificate,
  ApiCertificateTemplate,
  CreateCertificateTemplateBody,
  UpdateCertificateTemplateBody,
} from './types';

/* -------------------------------------------------------------------------- */
/*  Certificates                                                                */
/* -------------------------------------------------------------------------- */

export interface ManageCertificatesQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ManageCertificatesResponse {
  items: ApiCertificate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CertificateStats {
  totalIssued: number;
  activeCount: number;
  revokedCount: number;
  expiredCount: number;
  totalDownloads: number;
  uniqueLearners: number;
  certifiedCourses: number;
}

export async function fetchCertificateStats(): Promise<CertificateStats> {
  return api<CertificateStats>('certificates/stats');
}

export async function fetchManageCertificates(
  query?: ManageCertificatesQuery,
): Promise<ManageCertificatesResponse> {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.status && query.status !== 'ALL') params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api<ManageCertificatesResponse>(`certificates${qs}`);
}

export async function fetchMyCertificates(query?: {
  search?: string;
  status?: string;
}): Promise<ApiCertificate[]> {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.status && query.status !== 'ALL') params.set('status', query.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api<ApiCertificate[]>(`certificates/me${qs}`);
}

export async function fetchCertificate(id: string): Promise<ApiCertificate> {
  return api<ApiCertificate>(`certificates/${id}`);
}

export async function claimCertificate(courseId: string): Promise<ApiCertificate> {
  return api<ApiCertificate>(`certificates/claim?courseId=${encodeURIComponent(courseId)}`, {
    method: 'POST',
  });
}

export async function fetchCertificateDownloadUrl(
  id: string,
  lang: string = 'en',
): Promise<{ downloadUrl: string }> {
  return api<{ downloadUrl: string }>(`certificates/${id}/download?lang=${encodeURIComponent(lang)}`);
}

export interface VerifyCertificateResult {
  valid: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | string;
  revokedReason?: string | null;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string | null;
  holder: string;
  course: string;
  courseCode?: string;
  downloadUrl?: string | null;
}

export async function verifyCertificateByCode(code: string): Promise<VerifyCertificateResult> {
  return api<VerifyCertificateResult>(`certificates/verify?code=${encodeURIComponent(code)}`);
}

export async function revokeCertificate(id: string, reason?: string): Promise<ApiCertificate> {
  return api<ApiCertificate>(`certificates/${id}/revoke`, {
    method: 'POST',
    body: { reason },
  });
}

export async function reissueCertificate(id: string, reason?: string): Promise<ApiCertificate> {
  return api<ApiCertificate>(`certificates/${id}/reissue`, {
    method: 'POST',
    body: { reason },
  });
}

export interface ApiCertificateAuditItem {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export async function fetchCertificateAudit(id: string): Promise<ApiCertificateAuditItem[]> {
  return api<ApiCertificateAuditItem[]>(`certificates/${id}/audit`);
}

/* -------------------------------------------------------------------------- */
/*  Certificate templates (system admin & training admin)                        */
/* -------------------------------------------------------------------------- */

export async function fetchCertificateTemplates(): Promise<ApiCertificateTemplate[]> {
  return api<ApiCertificateTemplate[]>('certificate-templates');
}

export async function fetchActiveCertificateTemplate(): Promise<ApiCertificateTemplate | null> {
  return api<ApiCertificateTemplate>('certificate-templates/active');
}

export async function fetchCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}`);
}

export async function createCertificateTemplate(
  body: CreateCertificateTemplateBody,
): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>('certificate-templates', { method: 'POST', body });
}

export async function updateCertificateTemplate(
  id: string,
  body: UpdateCertificateTemplateBody,
): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}`, { method: 'PATCH', body });
}

export async function activateCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}/activate`, { method: 'POST' });
}

export async function deactivateCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}/deactivate`, { method: 'POST' });
}

export async function archiveCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}/archive`, { method: 'POST' });
}

export async function unarchiveCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}/unarchive`, { method: 'POST' });
}

export async function duplicateCertificateTemplate(id: string): Promise<ApiCertificateTemplate> {
  return api<ApiCertificateTemplate>(`certificate-templates/${id}/duplicate`, { method: 'POST' });
}

export async function deleteCertificateTemplate(id: string): Promise<void> {
  await api<unknown>(`certificate-templates/${id}`, { method: 'DELETE' });
}
