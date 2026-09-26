/**
 * Certificates feature — list, claim, download/share. Spec §9 · Architecture §6.9.
 */
export {
  CertificateHostUnreachableError,
  CertificatePdfPendingError,
  certificateKeys,
  openCertificatePdf,
  useCertificate,
  useCertificateForCourse,
  useClaimCertificate,
  useMyCertificates,
} from './api/certificate-api';
export type * from './types/certificate.types';
