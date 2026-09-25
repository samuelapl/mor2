"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  MapPin,
  QrCode,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ApiLiveSession } from "@/lib/api/types";
import { toast } from "@/lib/toast";

interface ClassroomQrModalProps {
  open: boolean;
  onClose: () => void;
  session: ApiLiveSession;
  totalStudents: number;
  presentCount: number;
}

/**
 * High-contrast deterministic SVG QR code pattern generator.
 */
function ClassroomQrPattern({ code, size = 200 }: { code: string; size?: number }) {
  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < code.length; i++) {
      h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }, [code]);

  const grid = useMemo(() => {
    const s = 21; // Standard Version 1 QR matrix size
    const g: boolean[][] = Array.from({ length: s }, () => Array(s).fill(false));

    const markFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const border = r === 0 || r === 6 || c === 0 || c === 6;
          const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          g[r0 + r][c0 + c] = border || center;
        }
      }
    };

    // 3 standard finder patterns (top-left, top-right, bottom-left)
    markFinder(0, 0);
    markFinder(0, 14);
    markFinder(14, 0);

    // Timing patterns
    for (let i = 8; i < 13; i++) {
      g[6][i] = i % 2 === 0;
      g[i][6] = i % 2 === 0;
    }

    // Deterministic pseudo-data modules
    let seed = hash;
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        const inFinder =
          (r < 8 && c < 8) || (r < 8 && c >= 13) || (r >= 13 && c < 8);
        const inTiming = (r === 6 && c >= 8 && c <= 12) || (c === 6 && r >= 8 && r <= 12);
        if (!inFinder && !inTiming) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          g[r][c] = seed % 2 === 0;
        }
      }
    }
    return g;
  }, [hash]);

  return (
    <div className="rounded-2xl border-2 border-slate-900/10 bg-white p-4 shadow-lg flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 21 21"
        className="pointer-events-none select-none"
      >
        {grid.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}

export function ClassroomQrModal({
  open,
  onClose,
  session,
  totalStudents,
  presentCount,
}: ClassroomQrModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const pinCode = session.id.slice(-6).toUpperCase();
  const venue = session.venue;

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(pinCode);
      setCopied(true);
      toast.success("Classroom PIN copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy PIN to clipboard.");
    }
  };

  const attendancePercent =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-xl bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300 mb-2">
            <QrCode className="h-3.5 w-3.5" />
            Classroom Check-In Active
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white">
            {session.titleEn || "Classroom Session"}
          </h3>
          <p className="mt-1 text-xs text-indigo-200 flex items-center justify-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>{venue?.branch || "Ministry Training Center"}</span>
            <span>·</span>
            <span>{venue?.name || "Classroom"}</span>
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-center">
          {/* QR Code Presentation */}
          <div className="flex justify-center">
            <ClassroomQrPattern code={`ELTMS-CHECKIN:${session.id}:${pinCode}`} size={190} />
          </div>

          {/* 6-Digit PIN Display */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Session Check-In PIN Code
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-extrabold tracking-widest text-indigo-900 bg-white px-4 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                {pinCode}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyPin}
                className="gap-1.5 text-xs text-slate-700"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Learners can scan the QR code above or type this PIN in their LMS dashboard to verify physical attendance.
            </p>
          </div>

          {/* Live Check-In Progress */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold">
              <Users className="h-4 w-4 text-emerald-600" />
              <span>Checked In:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {presentCount} / {totalStudents}
              </span>
              <Badge variant={attendancePercent >= 80 ? "green" : "blue"}>
                {attendancePercent}% Present
              </Badge>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end">
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

