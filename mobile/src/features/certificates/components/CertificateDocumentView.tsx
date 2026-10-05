import { Award, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { formatDate } from '@/core/utils/formatters';
import type { ApiCertificate } from '../types/certificate.types';

export interface CertificateDocumentViewProps {
  certificate: ApiCertificate;
  learnerName?: string;
  isLandscape?: boolean;
}

/**
 * Deterministic 17x17 Vector QR Code representation based on verification code
 */
function VectorQrCode({ code, size = 64 }: { code: string; size?: number }) {
  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < (code || '').length; i++) {
      h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }, [code]);

  const s = 17;
  const grid = useMemo(() => {
    const g: boolean[][] = Array.from({ length: s }, () => Array(s).fill(false));
    const markFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6) g[r0 + r][c0 + c] = true;
          else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) g[r0 + r][c0 + c] = true;
        }
      }
    };

    markFinder(0, 0);
    markFinder(0, 10);
    markFinder(10, 0);

    let seed = hash;
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        const inFinder = (r < 8 && c < 8) || (r < 8 && c >= 9) || (r >= 9 && c < 8);
        if (!inFinder) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          g[r][c] = seed % 2 === 0;
        }
      }
    }
    return g;
  }, [hash]);

  const cellSize = size / s;

  return (
    <View
      style={{
        width: size + 6,
        height: size + 6,
        backgroundColor: '#ffffff',
        padding: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
    >
      <View style={{ width: size, height: size, position: 'relative' }}>
        {grid.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <View
                key={`${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * cellSize,
                  top: r * cellSize,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: '#0f172a',
                }}
              />
            ) : null,
          ),
        )}
      </View>
    </View>
  );
}

/**
 * Authentic in-app Certificate Document view
 * Exact design & parity with web template and authoritative PDF generator
 */
export function CertificateDocumentView({
  certificate: c,
  learnerName,
  isLandscape = false,
}: CertificateDocumentViewProps) {
  const locale = useLocaleStore((s) => s.locale);
  const localized = useLocalized();
  const isAm = locale === 'am';

  const recipientName =
    learnerName ||
    (c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : '') ||
    'Learner';

  const courseTitle = localized(c.course, 'title') || c.course.code;
  const courseHours = c.course.estimatedHours ? `${c.course.estimatedHours}` : '30';

  const titleText = isAm ? 'የስልጠና ማረጋገጫ የምስክር ወረቀት' : 'Certificate of Training';
  const preambleText = isAm ? 'ይህ ምስክር ወረቀት የተሰጠው ለ' : 'THIS IS TO CERTIFY THAT';
  const completionText = isAm
    ? 'የስልጠናውን ኮርስ በተሳካ ሁኔታ ላጠናቀቁ'
    : 'has successfully completed the training course';
  const descriptionText = isAm
    ? 'ሁሉንም የስልጠና ክፍሎች በመከታተልና የማጠቃለያ ፈተናዎችን በማለፍ።'
    : 'by participating & completing all modules and passing all evaluation tests.';
  const verifiedBadgeText = isAm ? 'የተረጋገጠ' : 'VERIFIED';
  const courseHoursLabel = isAm ? 'የስልጠና ሰዓት ፦' : 'Course Hours :';
  const dateLabel = isAm ? 'ቀን ፦' : 'Date :';
  const hoursSuffix = isAm ? 'ሰዓት' : 'Hours';

  return (
    <View style={isLandscape ? styles.landscapeCardContainer : styles.cardContainer}>
      {/* Outer Navy Border with Inner Gold Accent Ring */}
      <View style={isLandscape ? styles.landscapeOuterBorder : styles.outerBorder}>
        {/* Geometric Top-Right Accent (Exact match with backend PDF & web template) */}
        <View style={isLandscape ? styles.accentContainerLandscape : styles.accentContainer}>
          <View style={isLandscape ? styles.accentNavyLandscape : styles.accentNavy} />
          <View style={isLandscape ? styles.accentBlueLandscape : styles.accentBlue} />
        </View>

        <View style={isLandscape ? styles.landscapeInnerBorder : styles.innerBorder}>
          {/* Top Header with Ministry Branding and Verified Badge */}
          <View style={styles.headerRow}>
            <View style={styles.brandingCol}>
              <View style={styles.emblemRow}>
                <View style={isLandscape ? styles.crestCircleLandscape : styles.crestCircle}>
                  <Award size={isLandscape ? 24 : 18} color="#b45309" />
                </View>
                <View>
                  <AppText style={isLandscape ? styles.ministryTitleLandscape : styles.ministryTitle}>
                    {isAm
                      ? 'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ የገቢዎች ሚኒስቴር'
                      : 'FDRE MINISTRY OF REVENUES'}
                  </AppText>
                  <AppText style={isLandscape ? styles.academySubtitleLandscape : styles.academySubtitle}>
                    {isAm ? 'ኢቲኤምኤስ ስልጠና አካዳሚ' : 'ETIMS Training Academy'}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Verified Badge */}
            <View style={isLandscape ? styles.verifiedBadgeLandscape : styles.verifiedBadge}>
              <CheckCircle2 size={isLandscape ? 16 : 13} color="#0e2a47" />
              <AppText style={isLandscape ? styles.verifiedTextLandscape : styles.verifiedText}>
                {verifiedBadgeText}
              </AppText>
            </View>
          </View>

          {/* Decorative Divider */}
          <View style={styles.goldDivider} />

          {/* Certificate Main Title */}
          <View style={isLandscape ? styles.titleSectionLandscape : styles.titleSection}>
            <AppText style={isLandscape ? styles.certificateTitleLandscape : styles.certificateTitle}>
              {titleText}
            </AppText>
            <AppText style={isLandscape ? styles.preambleLandscape : styles.preamble}>
              {preambleText}
            </AppText>
          </View>

          {/* Recipient Full Name */}
          <View style={isLandscape ? styles.recipientSectionLandscape : styles.recipientSection}>
            <AppText
              style={isLandscape ? styles.recipientNameLandscape : styles.recipientName}
              numberOfLines={2}
            >
              {recipientName}
            </AppText>
            <View style={isLandscape ? styles.recipientUnderlineLandscape : styles.recipientUnderline} />
          </View>

          {/* Completion Statement */}
          <AppText style={isLandscape ? styles.completionTextLandscape : styles.completionText}>
            {completionText}
          </AppText>

          {/* Course Name & Code */}
          <View style={isLandscape ? styles.courseBadgeLandscape : styles.courseBadge}>
            <AppText
              style={isLandscape ? styles.courseTitleTextLandscape : styles.courseTitleText}
              numberOfLines={2}
            >
              {courseTitle}
            </AppText>
            <AppText style={isLandscape ? styles.courseCodeTextLandscape : styles.courseCodeText}>
              {c.course.code}
            </AppText>
          </View>

          {/* Description */}
          <AppText style={isLandscape ? styles.descriptionTextLandscape : styles.descriptionText}>
            {descriptionText}
          </AppText>

          {/* Metadata Row: Hours and Date */}
          <View style={isLandscape ? styles.metadataRowLandscape : styles.metadataRow}>
            <View style={styles.metaItem}>
              <AppText style={isLandscape ? styles.metaLabelLandscape : styles.metaLabel}>
                {courseHoursLabel}
              </AppText>
              <AppText style={isLandscape ? styles.metaValueLandscape : styles.metaValue}>
                {courseHours} {hoursSuffix}
              </AppText>
            </View>

            <View style={styles.metaItem}>
              <AppText style={isLandscape ? styles.metaLabelLandscape : styles.metaLabel}>
                {dateLabel}
              </AppText>
              <AppText style={isLandscape ? styles.metaValueLandscape : styles.metaValue}>
                {formatDate(c.issuedAt, locale)}
              </AppText>
            </View>
          </View>

          {/* Bottom Security / Authenticity Row */}
          <View style={isLandscape ? styles.footerRowLandscape : styles.footerRow}>
            {/* Vector QR Code */}
            <View style={styles.qrCol}>
              <VectorQrCode
                code={c.verificationCode || c.certificateNumber}
                size={isLandscape ? 64 : 52}
              />
              <AppText style={styles.qrLabel}>{c.verificationCode}</AppText>
            </View>

            {/* Official Embossed Seal */}
            <View style={styles.sealCol}>
              <View style={isLandscape ? styles.sealCircleLandscape : styles.sealCircle}>
                <View style={styles.sealDashed}>
                  <ShieldCheck size={isLandscape ? 20 : 16} color="#0e2a47" />
                  <AppText style={isLandscape ? styles.sealTextLandscape : styles.sealText}>
                    OFFICIAL
                  </AppText>
                  <AppText style={isLandscape ? styles.sealSubtextLandscape : styles.sealSubtext}>
                    SEAL
                  </AppText>
                </View>
              </View>
              <AppText style={styles.sealCaption}>Ministry of Revenues</AppText>
            </View>

            {/* Signature & Title */}
            <View style={isLandscape ? styles.signatureColLandscape : styles.signatureCol}>
              <View style={isLandscape ? styles.signatureStrokeLandscape : styles.signatureStroke}>
                <View style={styles.cursiveCurve1} />
                <View style={styles.cursiveCurve2} />
              </View>
              <View style={isLandscape ? styles.signatureLineLandscape : styles.signatureLine} />
              <AppText style={isLandscape ? styles.signatoryTitleLandscape : styles.signatoryTitle}>
                {isAm ? 'የስልጠና ዳይሬክተር' : 'Director of Training'}
              </AppText>
              <AppText style={styles.signatoryDept}>ETIMS Academy</AppText>
            </View>
          </View>

          {/* Bottom Footer Footnote */}
          <View style={styles.bottomFootnote}>
            <AppText style={styles.footnoteText} numberOfLines={1}>
              {isAm
                ? `~ የገቢዎች ሚኒስቴር ኢቲኤምኤስ · የተረጋገጠ ማረጋገጫ ${c.certificateNumber} · ማረጋገጫ: ${c.verificationCode} ~`
                : `~ Ministry of Revenues ETIMS Academy · Credential ${c.certificateNumber} · Verification: ${c.verificationCode} ~`}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  landscapeCardContainer: {
    width: 720,
    minHeight: 510,
    aspectRatio: 1.414,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  outerBorder: {
    backgroundColor: '#ffffff',
    borderWidth: 6,
    borderColor: '#0e2a47',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  landscapeOuterBorder: {
    backgroundColor: '#ffffff',
    borderWidth: 10,
    borderColor: '#0e2a47',
    borderRadius: 14,
    padding: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  accentContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 38,
    height: 38,
    overflow: 'hidden',
    zIndex: 10,
  },
  accentNavy: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 14,
    backgroundColor: '#0e2a47',
  },
  accentBlue: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 26,
    backgroundColor: '#1e40af',
  },
  accentContainerLandscape: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 68,
    height: 68,
    overflow: 'hidden',
    zIndex: 10,
  },
  accentNavyLandscape: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 48,
    height: 24,
    backgroundColor: '#0e2a47',
  },
  accentBlueLandscape: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 48,
    backgroundColor: '#1e40af',
  },
  innerBorder: {
    borderWidth: 1.5,
    borderColor: '#d97706',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#fffdfa',
  },
  landscapeInnerBorder: {
    borderWidth: 2,
    borderColor: '#d97706',
    borderRadius: 10,
    padding: 22,
    backgroundColor: '#fffdfa',
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  brandingCol: {
    flex: 1,
    marginRight: 8,
  },
  emblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crestCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  crestCircleLandscape: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  ministryTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0e2a47',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ministryTitleLandscape: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0e2a47',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  academySubtitle: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#b45309',
    marginTop: 1,
  },
  academySubtitleLandscape: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0e2a47',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0e2a47',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0e2a47',
    letterSpacing: 0.5,
  },
  verifiedTextLandscape: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0e2a47',
    letterSpacing: 0.8,
  },
  goldDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  titleSection: {
    alignItems: 'center',
    marginVertical: 4,
  },
  titleSectionLandscape: {
    alignItems: 'center',
    marginVertical: 8,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0e2a47',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  certificateTitleLandscape: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0e2a47',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  preamble: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  preambleLandscape: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
    letterSpacing: 2,
    textAlign: 'center',
  },
  recipientSection: {
    alignItems: 'center',
    marginVertical: 6,
  },
  recipientSectionLandscape: {
    alignItems: 'center',
    marginVertical: 10,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  recipientNameLandscape: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  recipientUnderline: {
    width: 140,
    height: 2,
    backgroundColor: '#d97706',
    marginTop: 4,
    borderRadius: 1,
  },
  recipientUnderlineLandscape: {
    width: 220,
    height: 2.5,
    backgroundColor: '#d97706',
    marginTop: 6,
    borderRadius: 1.5,
  },
  completionText: {
    fontSize: 9.5,
    color: '#475569',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  completionTextLandscape: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginHorizontal: 24,
  },
  courseBadge: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 6,
  },
  courseBadgeLandscape: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginVertical: 8,
  },
  courseTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0e2a47',
    textAlign: 'center',
  },
  courseTitleTextLandscape: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0e2a47',
    textAlign: 'center',
  },
  courseCodeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  courseCodeTextLandscape: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 8.5,
    color: '#64748b',
    textAlign: 'center',
    marginHorizontal: 10,
    marginBottom: 6,
  },
  descriptionTextLandscape: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  metadataRowLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  metaLabelLandscape: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  metaValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0f172a',
  },
  metaValueLandscape: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  footerRowLandscape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  qrCol: {
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  sealCol: {
    alignItems: 'center',
  },
  sealCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#0e2a47',
    backgroundColor: '#ffffff',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealCircleLandscape: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#0e2a47',
    backgroundColor: '#ffffff',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealDashed: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#0e2a47',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    fontSize: 5.5,
    fontWeight: '900',
    color: '#0e2a47',
    letterSpacing: 0.5,
    lineHeight: 6,
  },
  sealTextLandscape: {
    fontSize: 7,
    fontWeight: '900',
    color: '#0e2a47',
    letterSpacing: 0.6,
    lineHeight: 8,
  },
  sealSubtext: {
    fontSize: 5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    lineHeight: 6,
  },
  sealSubtextLandscape: {
    fontSize: 6,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    lineHeight: 8,
  },
  sealCaption: {
    fontSize: 7,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  signatureCol: {
    alignItems: 'center',
    width: 90,
  },
  signatureColLandscape: {
    alignItems: 'center',
    width: 120,
  },
  signatureStroke: {
    height: 18,
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  signatureStrokeLandscape: {
    height: 22,
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cursiveCurve1: {
    position: 'absolute',
    width: 50,
    height: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1e1b4b',
    borderRadius: 8,
    transform: [{ rotate: '-8deg' }],
  },
  cursiveCurve2: {
    position: 'absolute',
    width: 35,
    height: 10,
    borderTopWidth: 1.2,
    borderTopColor: '#1e1b4b',
    borderRadius: 6,
    transform: [{ rotate: '12deg' }],
  },
  signatureLine: {
    width: 80,
    height: 1,
    backgroundColor: '#94a3b8',
    marginTop: 2,
  },
  signatureLineLandscape: {
    width: 105,
    height: 1,
    backgroundColor: '#94a3b8',
    marginTop: 2,
  },
  signatoryTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  signatoryTitleLandscape: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  signatoryDept: {
    fontSize: 7,
    color: '#64748b',
  },
  bottomFootnote: {
    marginTop: 8,
    alignItems: 'center',
  },
  footnoteText: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
