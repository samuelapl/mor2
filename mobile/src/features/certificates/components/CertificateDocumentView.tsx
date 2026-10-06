import { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, View } from 'react-native';
import Svg, { Circle, G, Image, Line, Polyline, Rect, Text } from 'react-native-svg';

import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';

import type { ApiCertificate } from '../types/certificate.types';

/**
 * In-app certificate — a scaled replica of the downloaded PDF.
 *
 * Mirrors `CertificatesService.renderCertificatePage` (backend) element for element: the same
 * 842×595 pt A4-landscape page, template fields, defaults, colours and font sizes. PDF
 * coordinates have their origin bottom-left; here y is flipped (svgY = 595 − pdfY), and text
 * baselines are kept so the layout lines up with the PDF. Keep both in sync when either changes.
 */

const W = 842;
const H = 595;
const CX = W / 2;

const NAVY = '#0e2a47';
const GOLD = '#d4af37';
const ROYAL_BLUE = '#1e40af';

const DEFAULT_LOGO = require('../../../../assets/images/certificate-logo.jpg');

const I18N = {
  en: {
    title: 'Certificate of Training',
    preamble: 'THIS IS TO CERTIFY THAT',
    completion: 'has successfully completed the training course',
    description: 'by participating & completing all modules and passing all evaluation tests.',
    verified: 'VERIFIED',
    hoursPrefix: 'Course Hours :',
    datePrefix: 'Date :',
    hoursSuffix: 'Hours',
    footer: (certNo: string, code: string) =>
      `~ Ministry of Revenues ETIMS Academy · Verified Credential ${certNo} · Verification: ${code} ~`,
  },
  am: {
    title: 'የስልጠና ማረጋገጫ የምስክር ወረቀት',
    preamble: 'ይህ ምስክር ወረቀት የተሰጠው ለ',
    completion: 'የስልጠናውን ኮርስ በተሳካ ሁኔታ ላጠናቀቁ',
    description: 'ሁሉንም የስልጠና ክፍሎች በመከታተልና የማጠቃለያ ፈተናዎችን በማለፍ።',
    verified: 'የተረጋገጠ',
    hoursPrefix: 'የስልጠና ሰዓት ፦',
    datePrefix: 'ቀን ፦',
    hoursSuffix: 'ሰዓት',
    footer: (certNo: string, code: string) =>
      `~ የገቢዎች ሚኒስቴር ኢቲኤምኤስ አካዳሚ · የተረጋገጠ ማረጋገጫ ${certNo} · ማረጋገጫ ቁጥር: ${code} ~`,
  },
};

interface TemplateField {
  key: string;
  x?: number;
  y?: number;
  size?: number;
  width?: number;
  text?: string;
  title?: string;
  color?: string;
  imageUrl?: string;
  visible?: boolean;
}

export interface CertificateDocumentViewProps {
  certificate: ApiCertificate;
  /** Rendered width in dp; height follows the A4 landscape ratio. */
  width: number;
  /** Same language the PDF is downloaded in. */
  lang?: string;
}

/** Same deterministic 17×17 pattern as the PDF's drawVectorQrCode. */
function qrGrid(code: string): boolean[][] {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
  let seed = Math.abs(h);
  const s = 17;
  const grid: boolean[][] = Array.from({ length: s }, () => Array(s).fill(false));
  const markFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6) grid[r0 + r][c0 + c] = true;
        else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) grid[r0 + r][c0 + c] = true;
      }
    }
  };
  markFinder(0, 0);
  markFinder(0, 10);
  markFinder(10, 0);
  for (let r = 0; r < s; r++) {
    for (let c = 0; c < s; c++) {
      const inFinder = (r < 8 && c < 8) || (r < 8 && c >= 9) || (r >= 9 && c < 8);
      if (!inFinder) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        grid[r][c] = seed % 2 === 0;
      }
    }
  }
  return grid;
}

/** Rough bold sans-serif advance width — only used to centre the logo + brand-name group. */
function approxBoldWidth(text: string, size: number): number {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.28;
    else if (/[A-Z]/.test(ch)) em += 0.72;
    else if (/[a-z0-9]/.test(ch)) em += 0.58;
    else em += 0.6;
  }
  return em * size;
}

/** Server renders with toLocaleDateString('en-GB') → dd/mm/yyyy. */
function formatPdfDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Natural aspect ratio (h / w) of remote images, needed for signature heights. */
function useImageRatios(urls: string[]): Record<string, number> {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const key = urls.join('|');
  useEffect(() => {
    let cancelled = false;
    for (const url of key ? key.split('|') : []) {
      RNImage.getSize(
        url,
        (w, h) => {
          if (!cancelled && w > 0) setRatios((prev) => ({ ...prev, [url]: h / w }));
        },
        () => undefined,
      );
    }
    return () => {
      cancelled = true;
    };
  }, [key]);
  return ratios;
}

export function CertificateDocumentView({
  certificate: c,
  width,
  lang = 'en',
}: CertificateDocumentViewProps) {
  const isAm = lang === 'am';
  const i18n = isAm ? I18N.am : I18N.en;

  const template = c.template ?? null;
  const fields: TemplateField[] = Array.isArray(template?.fields) ? template.fields : [];
  const fieldsMap = new Map(fields.map((f) => [f.key, f]));
  const pct = (f: TemplateField, fx: number, fy: number) => ({
    x: ((f.x ?? fx) / 100) * W,
    y: ((f.y ?? fy) / 100) * H,
  });

  const holderName = `${c.user?.firstName ?? ''} ${c.user?.lastName ?? ''}`.trim() || 'Learner';
  const courseTitle = c.course.title ?? c.course.titleEn ?? c.course.code;

  // Texts: template overrides apply to English only (same rule as the PDF).
  const titleField = fieldsMap.get('certificateTitle') ?? fieldsMap.get('headerTitle');
  const preambleField = fieldsMap.get('preamble') ?? fieldsMap.get('headerSubtitle');
  const completionField = fieldsMap.get('completionText');
  const descriptionField = fieldsMap.get('courseDescription');
  const footerField = fieldsMap.get('footerNote');
  const pick = (f: TemplateField | undefined, fallback: string) =>
    f?.text && !isAm ? f.text : fallback;

  const titleText = pick(titleField, i18n.title);
  const preambleText = pick(preambleField, i18n.preamble);
  const completionText = pick(completionField, i18n.completion);
  const descriptionText = pick(descriptionField, i18n.description);
  const footerText = footerField?.text || i18n.footer(c.certificateNumber, c.verificationCode);

  const logoField: TemplateField = fieldsMap.get('companyLogo') ??
    fieldsMap.get('logo') ?? { key: 'companyLogo', x: 50, y: 8, text: 'Ministry of Revenues' };
  const qrField: TemplateField = fieldsMap.get('qrCode') ?? {
    key: 'qrCode',
    x: 88,
    y: 12,
    size: 65,
  };
  const badgeField: TemplateField = fieldsMap.get('verifiedBadge') ?? {
    key: 'verifiedBadge',
    x: 12,
    y: 12,
  };
  const hoursField: TemplateField = fieldsMap.get('courseHours') ?? {
    key: 'courseHours',
    x: 18,
    y: 72,
  };
  const dateField: TemplateField = fieldsMap.get('issuedAt') ?? { key: 'issuedAt', x: 82, y: 72 };
  const stampField: TemplateField = fieldsMap.get('stamp') ?? {
    key: 'stamp',
    x: 50,
    y: 78,
    size: 85,
  };

  const sigFields = fields.filter(
    (f) => f.key === 'signature' || f.key.startsWith('signature') || f.key.startsWith('sig_'),
  );
  const signatures: TemplateField[] =
    sigFields.length > 0
      ? sigFields
      : [
          {
            key: 'signature1',
            x: 20,
            y: 80,
            text: 'Abebe Bikila',
            title: 'Director of Training & Capacity Development',
            width: 130,
          },
          {
            key: 'signature2',
            x: 80,
            y: 80,
            text: 'Mulugeta Tesfaye',
            title: 'Registrar General, Ministry of Revenues',
            width: 130,
          },
        ];

  const rawHours = c.course.estimatedHours ?? '30 Hours';
  const cleanHours =
    String(rawHours)
      .replace(/\s*hours?\s*/gi, '')
      .trim() || '30';
  const hoursLabel = `${hoursField.text || i18n.hoursPrefix} ${cleanHours} ${i18n.hoursSuffix}`;
  const dateLabel = `${dateField.text || i18n.datePrefix} ${formatPdfDate(c.issuedAt)}`;

  const grid = useMemo(
    () => qrGrid(c.verificationCode || c.certificateNumber),
    [c.verificationCode, c.certificateNumber],
  );

  const backgroundUrl = resolveMediaUrl(template?.backgroundUrl);
  const sigImageUrls = signatures
    .map((s) => resolveMediaUrl(s.imageUrl))
    .filter((u): u is string => Boolean(u));
  const ratios = useImageRatios(sigImageUrls);

  const height = (width * H) / W;

  // Positioned elements
  const logo = pct(logoField, 50, 8);
  const brandTitle = logoField.text || 'Ministry of Revenues';
  const logoSize = 34;
  const logoStartX = logo.x - (logoSize + 10 + approxBoldWidth(brandTitle, 13)) / 2;
  const logoUrl = resolveMediaUrl(logoField.imageUrl);

  const qr = pct(qrField, 88, 12);
  const qrSize = qrField.size || 60;
  const qrLeft = qr.x - qrSize / 2;
  const qrTop = qr.y - qrSize / 2;
  const cell = qrSize / 17;

  const badge = pct(badgeField, 12, 12);
  const badgeText = badgeField.text || i18n.verified;

  const hours = pct(hoursField, 18, 72);
  const date = pct(dateField, 82, 72);

  const stamp = pct(stampField, 50, 78);
  const stampUrl = resolveMediaUrl(stampField.imageUrl);
  const stampSize = stampField.size || 80;

  const titleY = 0.2 * H;
  const preambleY = 0.27 * H;
  const holderY = 0.365 * H;
  const completionY = 0.455 * H;
  const courseY = 0.535 * H;
  const descriptionY = 0.61 * H;

  return (
    <View style={{ width, height, backgroundColor: '#ffffff' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
        {/* 1. Background image (cover) */}
        {backgroundUrl ? (
          <Image
            href={{ uri: backgroundUrl }}
            x={0}
            y={0}
            width={W}
            height={H}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : null}

        {/* 2. Frame: navy border, gold inner line, top-right accents */}
        <Rect
          x={6}
          y={6}
          width={W - 12}
          height={H - 12}
          stroke={NAVY}
          strokeWidth={12}
          fill="none"
        />
        <Rect
          x={18}
          y={18}
          width={W - 36}
          height={H - 36}
          stroke={GOLD}
          strokeWidth={1}
          fill="none"
        />
        <Rect x={W - 52} y={12} width={26} height={48} fill={ROYAL_BLUE} />
        <Rect x={W - 62} y={12} width={50} height={22} fill={NAVY} />

        {/* 3. Central content */}
        <Text
          x={CX}
          y={titleY}
          fontSize={27}
          fontWeight="bold"
          fill={titleField?.color || '#1e293b'}
          textAnchor="middle"
        >
          {titleText}
        </Text>
        <Text
          x={CX}
          y={preambleY}
          fontSize={11}
          fontWeight="bold"
          fill="#334155"
          textAnchor="middle"
        >
          {preambleText}
        </Text>
        <Text x={CX} y={holderY} fontSize={28} fontWeight="bold" fill="#0f172a" textAnchor="middle">
          {holderName}
        </Text>
        <Line
          x1={CX - 90}
          y1={holderY + 8}
          x2={CX + 90}
          y2={holderY + 8}
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />
        <Text x={CX} y={completionY} fontSize={11.5} fill="#475569" textAnchor="middle">
          {completionText}
        </Text>
        <Text x={CX} y={courseY} fontSize={19} fontWeight="bold" fill={NAVY} textAnchor="middle">
          {courseTitle}
        </Text>
        <Text x={CX} y={descriptionY} fontSize={10} fill="#475569" textAnchor="middle">
          {descriptionText}
        </Text>

        {/* 4a. Logo + brand name */}
        {logoField.visible !== false ? (
          <G>
            <Image
              href={logoUrl ? { uri: logoUrl } : DEFAULT_LOGO}
              x={logoStartX}
              y={logo.y - logoSize / 2}
              width={logoSize}
              height={logoSize}
              preserveAspectRatio="none"
            />
            <Text
              x={logoStartX + logoSize + 10}
              y={logo.y + 4}
              fontSize={13}
              fontWeight="bold"
              fill={NAVY}
            >
              {brandTitle}
            </Text>
          </G>
        ) : null}

        {/* 4b. QR code */}
        {qrField.visible !== false ? (
          <G>
            <Rect
              x={qrLeft - 3}
              y={qrTop - 3}
              width={qrSize + 6}
              height={qrSize + 6}
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            {grid.flatMap((row, r) =>
              row.map((on, col) =>
                on ? (
                  <Rect
                    key={`${r}-${col}`}
                    x={qrLeft + col * cell}
                    y={qrTop + r * cell}
                    width={cell}
                    height={cell}
                    fill="#0f172a"
                  />
                ) : null,
              ),
            )}
          </G>
        ) : null}

        {/* 4c. Verified badge */}
        {badgeField.visible !== false ? (
          <G>
            <Rect
              x={badge.x - 42}
              y={badge.y - 11}
              width={84}
              height={22}
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <Circle cx={badge.x - 42 + 12} cy={badge.y} r={6} fill={NAVY} />
            <Text
              x={badge.x - 42 + 22}
              y={badge.y + 3}
              fontSize={8.5}
              fontWeight="bold"
              fill="#1e293b"
            >
              {badgeText}
            </Text>
          </G>
        ) : null}

        {/* 4d/e. Course hours and date */}
        {hoursField.visible !== false ? (
          <Text
            x={hours.x}
            y={hours.y}
            fontSize={11}
            fontWeight="bold"
            fill="#1e293b"
            textAnchor="middle"
          >
            {hoursLabel}
          </Text>
        ) : null}
        {dateField.visible !== false ? (
          <Text
            x={date.x}
            y={date.y}
            fontSize={11}
            fontWeight="bold"
            fill="#1e293b"
            textAnchor="middle"
          >
            {dateLabel}
          </Text>
        ) : null}

        {/* 4f. Stamp: uploaded image, else the drawn official seal */}
        {stampField.visible !== false ? (
          stampUrl ? (
            <Image
              href={{ uri: stampUrl }}
              x={stamp.x - stampSize / 2}
              y={stamp.y - stampSize / 2}
              width={stampSize}
              height={stampSize}
              preserveAspectRatio="none"
            />
          ) : (
            <G>
              <Circle
                cx={stamp.x}
                cy={stamp.y}
                r={34}
                stroke={NAVY}
                strokeWidth={2.5}
                fill="none"
              />
              <Circle
                cx={stamp.x}
                cy={stamp.y}
                r={30}
                stroke={NAVY}
                strokeWidth={0.8}
                fill="none"
              />
              <Text
                x={stamp.x}
                y={stamp.y - 2}
                fontSize={8}
                fontWeight="bold"
                fill={NAVY}
                textAnchor="middle"
              >
                OFFICIAL
              </Text>
              <Text x={stamp.x} y={stamp.y + 9} fontSize={7.5} fill="#64748b" textAnchor="middle">
                SEAL
              </Text>
            </G>
          )
        ) : null}

        {/* 4g. Signatures */}
        {signatures.map((sig) => {
          if (sig.visible === false || sig.key === 'signature_hidden') return null;
          const { x, y } = pct(sig, 50, 80);
          const sigUrl = resolveMediaUrl(sig.imageUrl);
          if (sigUrl) {
            const w = sig.width || 120;
            const h = w * (ratios[sigUrl] ?? 0.4);
            return (
              <Image
                key={sig.key}
                href={{ uri: sigUrl }}
                x={x - w / 2}
                y={y - h / 2}
                width={w}
                height={h}
                preserveAspectRatio="none"
              />
            );
          }
          const w = sig.width || 120;
          const stroke = [
            [-40, 10],
            [-25, 22],
            [-12, 10],
            [0, 20],
            [14, 12],
            [28, 22],
            [40, 14],
          ]
            .map(([dx, dy]) => `${x + dx},${y - dy}`)
            .join(' ');
          return (
            <G key={sig.key}>
              <Line
                x1={x - w / 2}
                y1={y - 2}
                x2={x + w / 2}
                y2={y - 2}
                stroke="#94a3b8"
                strokeWidth={0.8}
              />
              <Polyline points={stroke} stroke="#1a1a4b" strokeWidth={1.4} fill="none" />
              {sig.text ? (
                <Text
                  x={x}
                  y={y + 8}
                  fontSize={9}
                  fontWeight="bold"
                  fill="#0f172a"
                  textAnchor="middle"
                >
                  {sig.text}
                </Text>
              ) : null}
              {sig.title ? (
                <Text x={x} y={y + 18} fontSize={7.5} fill="#64748b" textAnchor="middle">
                  {sig.title}
                </Text>
              ) : null}
            </G>
          );
        })}

        {/* 4h. Footer note */}
        {footerField?.visible !== false && footerText ? (
          <Text x={CX} y={H - 24} fontSize={8.5} fill="#94a3b8" textAnchor="middle">
            {footerText}
          </Text>
        ) : null}
      </Svg>
    </View>
  );
}
