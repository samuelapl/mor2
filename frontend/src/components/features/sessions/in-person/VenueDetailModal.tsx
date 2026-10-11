"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  MapPin,
  Monitor,
  Projector,
  ShieldCheck,
  UserCheck,
  Users,
  Volume2,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { formatSessionDate, formatSessionTime } from "@/lib/app-time";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ApiVenue, ApiLiveSession } from "@/lib/api/types";

interface VenueDetailModalProps {
  open: boolean;
  onClose: () => void;
  venue?: ApiVenue | null;
  session?: ApiLiveSession | null;
  courseTitle?: string;
  courseCode?: string;
}

const FACILITY_ICONS: Record<string, any> = {
  "High-Speed Wi-Fi": Wifi,
  "HD Projector": Projector,
  "Dedicated Lab PCs": Cpu,
  "Audio & Microphones": Volume2,
  "Air Conditioning": Wind,
  "Interactive Smart Board": Monitor,
};

function formatDate(iso?: string): string {
  if (!iso) return "Scheduled date";
  try {
    return formatSessionDate(iso, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso?: string): string {
  if (!iso) return "Scheduled time";
  try {
    return formatSessionTime(iso);
  } catch {
    return iso;
  }
}

export function VenueDetailModal({
  open,
  onClose,
  venue,
  session,
  courseTitle,
  courseCode,
}: VenueDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !venue || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border/90 bg-card shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 rounded-xl bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="rounded-md bg-amber-500/30 border border-amber-400/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-200">
              {venue.branch}
            </span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90">
              Physical Classroom
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400 shrink-0" />
            {venue.name}
          </h2>
          {venue.building && (
            <p className="mt-1 text-xs text-indigo-200">Building: {venue.building}</p>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Course & Session Info */}
          {(courseTitle || session) && (
            <div className="rounded-xl border border-border/90 bg-muted/70 p-4 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Enrolled Training Session
              </span>

              {courseTitle && (
                <div className="flex items-center gap-2">
                  {courseCode && (
                    <span className="rounded-md bg-primary-soft font-mono text-[11px] font-semibold text-primary px-2 py-0.5">
                      {courseCode}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-foreground">{courseTitle}</h4>
                </div>
              )}

              {session && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs text-secondary-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>{formatDate(session.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>
                      {formatTime(session.scheduledAt)} ({session.durationMinutes} min)
                    </span>
                  </div>
                  {session.trainer && (
                    <div className="col-span-2 flex items-center gap-1.5 pt-1">
                      <UserCheck className="h-3.5 w-3.5 text-success shrink-0" />
                      <span>
                        Trainer: {session.trainer.firstName} {session.trainer.lastName} (
                        {session.trainer.email})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Venue Specifications */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold text-secondary-foreground">Seat Capacity</span>
              </div>
              <p className="mt-1 text-base font-bold text-foreground">{venue.capacity} seats</p>
              <p className="text-[11px] text-subtle-foreground">Strictly enforced maximum</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-secondary-foreground">Branch Center</span>
              </div>
              <p className="mt-1 text-base font-bold text-foreground truncate">{venue.branch}</p>
              <p className="text-[11px] text-subtle-foreground">Ethiopian Ministry of Revenues</p>
            </div>
          </div>

          {/* Classroom Amenities & Facilities */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Classroom Amenities & Equipment
            </span>
            <div className="flex flex-wrap gap-2">
              {venue.facilities && venue.facilities.length > 0 ? (
                venue.facilities.map((facility) => {
                  const Icon = FACILITY_ICONS[facility] || CheckCircle2;
                  return (
                    <span
                      key={facility}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-secondary-foreground shadow-2xs"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {facility}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-subtle-foreground">Standard classroom amenities</span>
              )}
            </div>
          </div>

          {/* Ministry Attendance Check-In Notice */}
          <div className="rounded-xl border border-warning/25 bg-warning-soft/70 p-4 text-xs text-warning space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-warning">
              <ShieldCheck className="h-4 w-4 text-warning" />
              <span>In-Person Classroom Check-In Policy</span>
            </div>
            <p className="text-warning leading-relaxed">
              Please arrive at the <strong>{venue.branch}</strong> training facility at least 15
              minutes prior to lecture start. Ensure you carry your official Ministry of Revenues
              employee badge. Once inside the room, scan the session QR code or enter the 6-digit
              PIN provided by your instructor to register your official attendance.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>

          <Link href="/learner/live-sessions">
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <span>View Sessions & Check-In</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

