"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, Move, ShieldCheck } from "lucide-react";
import type { ApiCertificateField, ApiCertificateTemplate } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface CertificateData {
  holderName: string;
  courseTitle: string;
  courseCode: string;
  courseHours?: number | string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string | Date;
  expiresAt?: string | Date | null;
  orgName?: string;
}

export interface CertificateRendererProps {
  data?: CertificateData;
  studentName?: string;
  courseTitle?: string;
  courseCode?: string;
  courseHours?: number | string;
  durationHours?: number | string;
  certificateNumber?: string;
  verificationCode?: string;
  completionDate?: string | Date;
  template?: ApiCertificateTemplate | null;
  className?: string;
  onPrint?: () => void;
  // Interactive Live Canvas Editing Props
  editable?: boolean;
  selectedFieldKey?: string | null;
  onSelectField?: (key: string | null) => void;
  onUpdateFieldPosition?: (key: string, x: number, y: number) => void;
}

function formatDate(val: string | Date): string {
  try {
    const d = typeof val === "string" ? new Date(val) : val;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "23/09/2026";
  }
}

// Crisp Vector QR Code generator component (deterministic matrix based on code)
function QrCodePattern({ code, size = 64 }: { code: string; size?: number }) {
  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < code.length; i++) {
      h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }, [code]);

  // Generate 17x17 grid with standard QR finder patterns at (0,0), (10,0), (0,10)
  const grid = useMemo(() => {
    const s = 17;
    const g: boolean[][] = Array.from({ length: s }, () => Array(s).fill(false));

    // Helper: mark 7x7 finder pattern
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

    // Deterministic pseudo-data modules
    let seed = hash;
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        const inFinder =
          (r < 8 && c < 8) || (r < 8 && c >= 9) || (r >= 9 && c < 8);
        if (!inFinder) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          g[r][c] = seed % 2 === 0;
        }
      }
    }
    return g;
  }, [hash]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 17"
      className="rounded bg-white p-1 shadow-2xs pointer-events-none select-none"
    >
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" /> : null,
        ),
      )}
    </svg>
  );
}

// Vector Cursive Signature Component for authentic appearance
function RealisticSignature({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-0.5 select-none pointer-events-none">
      <svg
        viewBox="0 0 200 48"
        className="w-28 sm:w-36 h-9 sm:h-10 text-indigo-950 overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 12 36 C 24 10, 36 8, 48 30 C 56 42, 68 8, 80 24 C 92 40, 104 18, 120 28 C 132 36, 148 12, 168 22 C 180 28, 192 16, 196 20" />
        <path d="M 28 32 C 60 30, 110 32, 172 26" strokeWidth="1.2" opacity="0.6" />
        <path d="M 64 16 C 72 24, 88 12, 100 36" strokeWidth="1.4" />
      </svg>
      <span className="sr-only">{name}</span>
    </div>
  );
}

// Circular Embossed Official Seal Component (Fallback when no PNG stamp uploaded)
function OfficialSeal({
  size = 80,
  subtext,
}: {
  size?: number;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center select-none pointer-events-none">
      <div
        className="relative flex items-center justify-center rounded-full border-4 border-[#0e2a47] bg-white p-1 shadow-sm"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <div className="absolute inset-1 rounded-full border border-dashed border-[#0e2a47]" />
        <div className="flex flex-col items-center justify-center text-center">
          <ShieldCheck
            className="text-[#0e2a47]"
            style={{ width: `${Math.round(size * 0.32)}px`, height: `${Math.round(size * 0.32)}px` }}
          />
          <span
            className="mt-0.5 font-extrabold tracking-wider text-[#0e2a47] uppercase leading-tight"
            style={{ fontSize: `${Math.max(7, Math.round(size * 0.1))}px` }}
          >
            Official
          </span>
          <span
            className="font-bold text-slate-500 uppercase tracking-widest"
            style={{ fontSize: `${Math.max(6, Math.round(size * 0.08))}px` }}
          >
            Seal
          </span>
        </div>
      </div>
      {subtext ? (
        <p className="mt-1 text-[9px] font-medium text-slate-500">{subtext}</p>
      ) : null}
    </div>
  );
}

// Draggable Element Wrapper for Live Canvas Drag-and-Drop Positioning
interface DraggableCanvasItemProps {
  fieldKey: string;
  x: number;
  y: number;
  editable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onDragMove?: (key: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  className?: string;
}

function DraggableCanvasItem({
  fieldKey,
  x,
  y,
  editable,
  isSelected,
  onSelect,
  onDragMove,
  containerRef,
  children,
  className,
}: DraggableCanvasItemProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();
    const container = containerRef.current;
    if (!container) return;

    setIsDragging(true);

    const onPointerMove = (moveEvt: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const rawX = ((moveEvt.clientX - rect.left) / rect.width) * 100;
      const rawY = ((moveEvt.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.round(Math.max(2, Math.min(98, rawX)));
      const clampedY = Math.round(Math.max(2, Math.min(98, rawY)));
      onDragMove?.(fieldKey, clampedX, clampedY);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        if (editable) {
          e.stopPropagation();
          onSelect?.();
        }
      }}
      className={cn(
        "transition-shadow transition-transform",
        editable && "cursor-grab select-none touch-none",
        editable && isDragging && "cursor-grabbing z-40 opacity-90 scale-105",
        editable &&
          isSelected &&
          "ring-2 ring-indigo-600 ring-offset-2 rounded-xl bg-indigo-50/20 z-30 shadow-md",
        editable &&
          !isSelected &&
          "hover:ring-2 hover:ring-indigo-400/50 hover:bg-indigo-50/10 rounded-xl",
        className,
      )}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {children}
      {editable && (
        <div
          className={cn(
            "absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-xs transition-opacity",
            isSelected ? "bg-indigo-600 opacity-100" : "bg-slate-700 opacity-0 group-hover:opacity-100",
          )}
          title="Drag to reposition"
        >
          <Move className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}

export function CertificateRenderer({
  data: explicitData,
  studentName,
  courseTitle,
  courseCode,
  courseHours,
  durationHours,
  certificateNumber,
  verificationCode,
  completionDate,
  template,
  className,
  editable = false,
  selectedFieldKey = null,
  onSelectField,
  onUpdateFieldPosition,
}: CertificateRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const data: CertificateData = useMemo(() => {
    if (explicitData) return explicitData;
    return {
      holderName: studentName || "Meron Kassa",
      courseTitle: courseTitle || "Advanced Excel & Data Analytics for Revenue Reporting",
      courseCode: courseCode || "EXCEL201",
      courseHours: courseHours || durationHours || "30 Hours",
      certificateNumber: certificateNumber || "ETIMS-CERT-2026-0001",
      verificationCode: verificationCode || "VERIF-0001",
      issuedAt: completionDate || new Date(),
    };
  }, [
    explicitData,
    studentName,
    courseTitle,
    courseCode,
    courseHours,
    durationHours,
    certificateNumber,
    verificationCode,
    completionDate,
  ]);

  // Extract configured template fields
  const fields = useMemo(() => {
    return Array.isArray(template?.fields) ? template.fields : [];
  }, [template?.fields]);

  const fieldsMap = useMemo(() => {
    const map = new Map<string, ApiCertificateField>();
    fields.forEach((f) => map.set(f.key, f));
    return map;
  }, [fields]);

  // Distinct brand assets
  const logoField = fieldsMap.get("companyLogo") || fieldsMap.get("logo") || {
    key: "companyLogo",
    x: 14,
    y: 12,
    width: 140,
    text: "Analyst Skill",
    title: "eLearning Platform",
    visible: true,
  };

  const qrField = fieldsMap.get("qrCode") || {
    key: "qrCode",
    x: 10,
    y: 28,
    size: 68,
    visible: true,
  };

  const verifiedBadgeField = fieldsMap.get("verifiedBadge") || {
    key: "verifiedBadge",
    x: 88,
    y: 12,
    size: 75,
    text: "VERIFIED",
    visible: true,
  };

  // Multiple Stamps support: collect all fields starting with "stamp"
  const stampFields = useMemo(() => {
    const stamps = fields.filter((f) => f.key === "stamp" || f.key.startsWith("stamp"));
    if (stamps.length > 0) return stamps;
    // Default 1 stamp if none present
    return [
      {
        key: "stamp",
        x: 50,
        y: 82,
        size: 85,
        visible: true,
      },
    ];
  }, [fields]);

  // Multiple Signatures support: collect all fields starting with "signature" or "sig"
  // Multiple Signatures support: BY DEFAULT ONE SIGNATURE WITH EMPTY SIGN NAME AND TITLE
  const signatureFields = useMemo(() => {
    const sigs = fields.filter(
      (f) =>
        f.key === "signature" ||
        f.key.startsWith("signature") ||
        f.key.startsWith("sig_"),
    );
    if (sigs.length > 0) return sigs;
    // Default: exactly ONE signature with empty sign name and title
    return [
      {
        key: "signature1",
        x: 50,
        y: 82,
        text: "",
        title: "",
        width: 140,
        visible: true,
      },
    ];
  }, [fields]);

  // Dynamic & Positionable Course Hours & Date Metadata
  const courseHoursField = fieldsMap.get("courseHours") || {
    key: "courseHours",
    x: 18,
    y: 72,
    text: "Course Hours :",
    visible: true,
  };

  const issuedAtField = fieldsMap.get("issuedAt") || {
    key: "issuedAt",
    x: 82,
    y: 72,
    text: "Date :",
    visible: true,
  };

  const titleField = fieldsMap.get("certificateTitle") || fieldsMap.get("headerTitle");
  const preambleField = fieldsMap.get("preamble") || fieldsMap.get("headerSubtitle");
  const completionTextField = fieldsMap.get("completionText");
  const courseDescriptionField = fieldsMap.get("courseDescription");
  const footerNoteField = fieldsMap.get("footerNote");

  const titleText = titleField?.text || "Certificate of Training";
  const preambleText = preambleField?.text || "THIS IS TO CERTIFY THAT";
  const completionText =
    completionTextField?.text || "has successfully completed the training course";
  const descriptionText =
    courseDescriptionField?.text ||
    "by participating & completing all modules and passing all evaluation tests.";
  const footerText =
    footerNoteField?.text ||
    `~ Ministry of Revenues ETIMS Academy · Verified Credential ${data.certificateNumber} · Verification: ${data.verificationCode} ~`;

  const courseHoursText = data.courseHours ? `${data.courseHours} Hours` : "30 Hours";
  const formattedDate = formatDate(data.issuedAt);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full max-w-4xl mx-auto overflow-hidden bg-white text-slate-800 shadow-xl transition-all print:shadow-none print:m-0 print:w-full print:max-w-none",
        "aspect-[1.414/1] border-[12px] border-[#0e2a47] rounded-lg select-none",
        className,
      )}
      style={{
        backgroundImage: template?.backgroundUrl ? `url(${template.backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onClick={() => {
        if (editable) onSelectField?.(null);
      }}
    >
      {/* Outer Geometric Accent Corners (Matching reference screenshot) */}
      <div className="pointer-events-none absolute -top-1 -right-1 z-10 h-28 w-28 overflow-hidden">
        <div className="absolute top-0 right-0 h-16 w-16 bg-[#0e2a47] transform rotate-45 translate-x-8 -translate-y-8" />
        <div className="absolute top-0 right-0 h-20 w-8 bg-[#1e40af]" />
      </div>

      {/* Central Solid Certificate Content Flow */}
      <div className="relative flex flex-col justify-between h-full p-6 sm:p-10 z-0">
        {/* Center Content Section */}
        <div className="text-center my-auto space-y-3 px-4 pt-12 sm:pt-16 pb-20">
          <h1
            className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1e293b]"
            style={{ color: titleField?.color }}
          >
            {titleText}
          </h1>

          <p className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-slate-700">
            {preambleText}
          </p>

          {/* Prominent Recipient Name in Serif Italic */}
          <div className="py-1">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold italic tracking-wide text-slate-900">
              {data.holderName || "Meron Kassa"}
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-48 bg-slate-300" />
          </div>

          <p className="text-xs sm:text-sm text-slate-600 italic">
            {completionText}
          </p>

          {/* Course Title Bold */}
          <h3 className="font-serif text-xl sm:text-2xl font-extrabold text-[#0e2a47] max-w-2xl mx-auto">
            {data.courseTitle || "Advanced Excel & Data Analytics for Revenue Reporting"}
          </h3>

          <p className="text-xs text-slate-600 italic max-w-xl mx-auto">
            {descriptionText}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DRAGGABLE / ABSOLUTELY POSITIONED BRAND ASSETS & METADATA LAYER          */}
      {/* ========================================================================= */}

      {/* 1. Company Logo Asset & Brand Name / Subtitle */}
      {logoField.visible !== false && (
        <DraggableCanvasItem
          fieldKey={logoField.key}
          x={logoField.x ?? 14}
          y={logoField.y ?? 12}
          editable={editable}
          isSelected={selectedFieldKey === logoField.key}
          onSelect={() => onSelectField?.(logoField.key)}
          onDragMove={onUpdateFieldPosition}
          containerRef={containerRef}
          className="p-1.5"
        >
          <div className="flex items-center gap-3 select-none pointer-events-none">
            {logoField.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoField.imageUrl}
                alt="Logo"
                style={{ width: `${logoField.width || 140}px`, maxHeight: "55px" }}
                className="object-contain drop-shadow-xs shrink-0"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0e2a47] text-white shrink-0">
                <Image
                  src="/logo.jpg"
                  alt="MoR Logo"
                  width={32}
                  height={32}
                  className="rounded-full object-contain"
                />
              </div>
            )}

            {(logoField.text || logoField.title) && (
              <div className="min-w-0">
                {logoField.text && (
                  <p className="font-display text-sm font-extrabold tracking-tight text-[#0e2a47] whitespace-nowrap">
                    {logoField.text}
                  </p>
                )}
                {logoField.title && (
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {logoField.title}
                  </p>
                )}
              </div>
            )}
          </div>
        </DraggableCanvasItem>
      )}

      {/* 2. QR Code Asset */}
      {qrField.visible !== false && (
        <DraggableCanvasItem
          fieldKey={qrField.key}
          x={qrField.x ?? 10}
          y={qrField.y ?? 28}
          editable={editable}
          isSelected={selectedFieldKey === qrField.key}
          onSelect={() => onSelectField?.(qrField.key)}
          onDragMove={onUpdateFieldPosition}
          containerRef={containerRef}
          className="p-1"
        >
          <QrCodePattern
            code={data.verificationCode || data.certificateNumber}
            size={qrField.size ?? 68}
          />
        </DraggableCanvasItem>
      )}

      {/* 3. Verified Badge Asset */}
      {verifiedBadgeField.visible !== false && (
        <DraggableCanvasItem
          fieldKey={verifiedBadgeField.key}
          x={verifiedBadgeField.x ?? 88}
          y={verifiedBadgeField.y ?? 12}
          editable={editable}
          isSelected={selectedFieldKey === verifiedBadgeField.key}
          onSelect={() => onSelectField?.(verifiedBadgeField.key)}
          onDragMove={onUpdateFieldPosition}
          containerRef={containerRef}
          className="p-1"
        >
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 shadow-2xs select-none pointer-events-none">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0e2a47] text-white shrink-0">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-800 uppercase whitespace-nowrap">
              {verifiedBadgeField.text || "VERIFIED"}
            </span>
          </div>
        </DraggableCanvasItem>
      )}

      {/* 4. Multiple Official Stamps (Supports PNG upload & Drag) */}
      {/* 4. Dynamic & Draggable Course Hours */}
      {courseHoursField.visible !== false && (
        <DraggableCanvasItem
          fieldKey={courseHoursField.key}
          x={courseHoursField.x ?? 18}
          y={courseHoursField.y ?? 72}
          editable={editable}
          isSelected={selectedFieldKey === courseHoursField.key}
          onSelect={() => onSelectField?.(courseHoursField.key)}
          onDragMove={onUpdateFieldPosition}
          containerRef={containerRef}
          className="p-1"
        >
          <div className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap select-none pointer-events-none">
            {courseHoursField.text ? `${courseHoursField.text} ${courseHoursText}` : `Course Hours : ${courseHoursText}`}
          </div>
        </DraggableCanvasItem>
      )}

      {/* 5. Dynamic & Draggable Issue Date */}
      {issuedAtField.visible !== false && (
        <DraggableCanvasItem
          fieldKey={issuedAtField.key}
          x={issuedAtField.x ?? 82}
          y={issuedAtField.y ?? 72}
          editable={editable}
          isSelected={selectedFieldKey === issuedAtField.key}
          onSelect={() => onSelectField?.(issuedAtField.key)}
          onDragMove={onUpdateFieldPosition}
          containerRef={containerRef}
          className="p-1"
        >
          <div className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap select-none pointer-events-none">
            {issuedAtField.text ? `${issuedAtField.text} ${formattedDate}` : `Date : ${formattedDate}`}
          </div>
        </DraggableCanvasItem>
      )}

      {/* 6. Multiple Official Stamps (Supports PNG upload & Drag) */}
      {stampFields.map((stamp) => {
        if (stamp.visible === false) return null;
        return (
          <DraggableCanvasItem
            key={stamp.key}
            fieldKey={stamp.key}
            x={stamp.x ?? 50}
            y={stamp.y ?? 82}
            editable={editable}
            isSelected={selectedFieldKey === stamp.key}
            onSelect={() => onSelectField?.(stamp.key)}
            onDragMove={onUpdateFieldPosition}
            containerRef={containerRef}
            className="p-1"
          >
            {stamp.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stamp.imageUrl}
                alt="Official Stamp"
                style={{
                  width: `${stamp.size || 85}px`,
                  height: `${stamp.size || 85}px`,
                }}
                className="object-contain drop-shadow-sm select-none pointer-events-none"
              />
            ) : (
              <OfficialSeal size={stamp.size || 85} subtext={stamp.title} />
            )}
          </DraggableCanvasItem>
        );
      })}

      {/* 5. Multiple Signatures (Supports PNG upload, Cursive script & Drag) */}
      {/* 7. Multiple Signatures (Default 1 with empty sign name and title) */}
      {signatureFields.map((sig) => {
        if (sig.visible === false) return null;
        const widthPx = sig.width || 140;
        return (
          <DraggableCanvasItem
            key={sig.key}
            fieldKey={sig.key}
            x={sig.x ?? 50}
            y={sig.y ?? 82}
            editable={editable}
            isSelected={selectedFieldKey === sig.key}
            onSelect={() => onSelectField?.(sig.key)}
            onDragMove={onUpdateFieldPosition}
            containerRef={containerRef}
            className="p-1"
          >
            <div className="flex flex-col items-center justify-center text-center">
              {sig.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sig.imageUrl}
                  alt={sig.text || "Signature"}
                  style={{ width: `${widthPx}px`, height: "45px" }}
                  className="mx-auto object-contain select-none pointer-events-none"
                />
              ) : (
                <RealisticSignature name={sig.text || sig.key} />
              )}
              <div
                className="mx-auto h-px bg-slate-400 mt-0.5"
                style={{ width: `${widthPx}px` }}
              />
              <p className="text-xs font-bold text-slate-900 mt-1 whitespace-nowrap">
                {sig.text ? (
                  sig.text
                ) : editable ? (
                  <span className="text-slate-400 italic font-normal text-[11px]">(Signer Name)</span>
                ) : (
                  ""
                )}
              </p>
              <p className="text-[10px] text-slate-500 whitespace-nowrap">
                {sig.title ? (
                  sig.title
                ) : editable ? (
                  <span className="text-slate-400 italic font-normal text-[10px]">(Signer Title)</span>
                ) : (
                  ""
                )}
              </p>
            </div>
          </DraggableCanvasItem>
        );
      })}

      {/* 8. Dynamic & Removable Footer Note */}
      {footerNoteField?.visible !== false && Boolean(footerNoteField?.text) && (
        <div className="absolute bottom-2 left-0 right-0 px-6 text-center select-none pointer-events-none z-10">
          <p className="text-[9px] text-slate-400">
            {footerNoteField?.text}
          </p>
        </div>
      )}
    </div>
  );
}
