import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { tokenStore } from '@/core/auth/tokens';
import { API_HOSTNAME, API_URL } from '@/core/config';
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

export class CertificateHostUnreachableError extends Error {
  constructor() {
    super('PRESIGNED_LOCALHOST');
  }
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/**
 * Directly downloads and saves the authoritative certificate PDF binary to device storage,
 * and launches device PDF viewer/sharing intent (spec §9.3).
 */
export async function downloadCertificatePdf(
  certificate: ApiCertificate,
  locale: string = 'en',
): Promise<{ uri: string; fileName: string }> {
  const token = await tokenStore.getAccessToken();
  const certDir = new Directory(Paths.document, 'certificates');
  if (!certDir.exists) certDir.create({ intermediates: true });

  const safeCertNo = (certificate.certificateNumber || 'certificate').replace(/[^\w.-]+/g, '_');
  const fileName = `${safeCertNo}.pdf`;
  const targetFile = new File(certDir, fileName);

  const streamUrl = `${API_URL}/${endpoints.certificates.pdf(certificate.id)}?lang=${locale}`;

  let finalFile: File;
  try {
    finalFile = await File.downloadFileAsync(streamUrl, targetFile, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      idempotent: false,
    });
  } catch (downloadErr) {
    // Fallback: direct HTTP fetch arrayBuffer and write bytes
    try {
      const resp = await fetch(streamUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      targetFile.create({ overwrite: true });
      await targetFile.write(bytes);
      finalFile = targetFile;
    } catch (fallbackErr) {
      // If presigned URL is available and reachable, try it
      if (certificate.downloadUrl) {
        const host = parseUrl(certificate.downloadUrl)?.hostname;
        if (!host || (!LOOPBACK.has(host) || LOOPBACK.has(API_HOSTNAME))) {
          await downloadAndOpen({
            url: certificate.downloadUrl,
            fileName,
            mimeType: 'application/pdf',
            presigned: true,
          });
          return { uri: targetFile.uri, fileName };
        }
      }
      throw downloadErr;
    }
  }

  // Open with system PDF viewer or share sheet
  if (Platform.OS === 'android') {
    try {
      const contentUri = await getContentUriAsync(finalFile.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
        type: 'application/pdf',
      });
    } catch {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
        });
      }
    }
  } else if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalFile.uri, {
      mimeType: 'application/pdf',
      dialogTitle: fileName,
    });
  }

  return { uri: finalFile.uri, fileName };
}

/** Legacy alias for backwards compatibility */
export async function openCertificatePdf(certificate: ApiCertificate): Promise<void> {
  await downloadCertificatePdf(certificate, 'en');
}

