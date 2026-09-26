import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { API_HOSTNAME } from '@/core/config';
import { parseUrl } from '@/core/utils/url';
import { downloadAndOpen } from '@/features/classroom/utils/open-file';

import type { ApiCertificate } from '../types/certificate.types';

export const certificateKeys = {
  all: ['certificates'] as const,
  mine: ['certificates', 'me'] as const,
  detail: (id: string) => ['certificates', 'detail', id] as const,
};

export function useMyCertificates() {
  return useQuery({
    queryKey: certificateKeys.mine,
    queryFn: () => api.get<ApiCertificate[]>(endpoints.certificates.mine),
  });
}

export function useCertificate(id: string | undefined) {
  return useQuery({
    queryKey: certificateKeys.detail(id ?? ''),
    queryFn: () => api.get<ApiCertificate>(endpoints.certificates.detail(id!)),
    enabled: Boolean(id),
  });
}

/** Certificate for a course, from the cached list. */
export function useCertificateForCourse(courseId: string | undefined) {
  const query = useMyCertificates();
  return { ...query, data: query.data?.find((c) => c.courseId === courseId) };
}

/**
 * POST /certificates/claim?courseId= — returns the certificate, or `null` when the course
 * isn't complete yet (spec §9.2). Claiming an already-issued certificate returns it.
 */
export function useClaimCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      api.post<ApiCertificate | null>(endpoints.certificates.claim, undefined, {
        params: { courseId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: certificateKeys.all }),
  });
}

export class CertificatePdfPendingError extends Error {
  constructor() {
    super('PDF_PENDING');
  }
}

/**
 * Presigned URLs are signed for MinIO's host (SignedHeaders=host), so a localhost URL cannot be
 * rewritten for the phone. In dev this means MINIO_ENDPOINT must be the LAN IP (spec §1.8).
 */
export class CertificateHostUnreachableError extends Error {
  constructor() {
    super('PRESIGNED_LOCALHOST');
  }
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

/** Fetches a fresh presigned URL (1 h validity) and opens the PDF (spec §9.3). */
export async function openCertificatePdf(certificate: ApiCertificate): Promise<void> {
  const { downloadUrl } = await api.get<{ downloadUrl: string | null }>(
    endpoints.certificates.download(certificate.id),
  );
  if (!downloadUrl) throw new CertificatePdfPendingError();
  const host = parseUrl(downloadUrl)?.hostname;
  if (host && LOOPBACK.has(host) && !LOOPBACK.has(API_HOSTNAME))
    throw new CertificateHostUnreachableError();
  await downloadAndOpen({
    url: downloadUrl,
    fileName: `${certificate.certificateNumber}.pdf`,
    mimeType: 'application/pdf',
    presigned: true,
  });
}
