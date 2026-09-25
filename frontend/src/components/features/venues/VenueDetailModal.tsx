"use client";

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
    return new Date(iso).toLocaleDateString("en-US", {
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
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
  if (!open || !venue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
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
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Enrolled Training Session
              </span>

              {courseTitle && (
                <div className="flex items-center gap-2">
                  {courseCode && (
                    <span className="rounded-md bg-indigo-100 font-mono text-[11px] font-semibold text-indigo-800 px-2 py-0.5">
                      {courseCode}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900">{courseTitle}</h4>
                </div>
              )}

              {session && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
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
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
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
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500">
                <Users className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold text-slate-700">Seat Capacity</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-900">{venue.capacity} seats</p>
              <p className="text-[11px] text-slate-400">Strictly enforced maximum</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-slate-700">Branch Center</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-900 truncate">{venue.branch}</p>
              <p className="text-[11px] text-slate-400">Ethiopian Ministry of Revenues</p>
            </div>
          </div>

          {/* Classroom Amenities & Facilities */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Classroom Amenities & Equipment
            </span>
            <div className="flex flex-wrap gap-2">
              {venue.facilities && venue.facilities.length > 0 ? (
                venue.facilities.map((facility) => {
                  const Icon = FACILITY_ICONS[facility] || CheckCircle2;
                  return (
                    <span
                      key={facility}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs"
                    >
                      <Icon className="h-3.5 w-3.5 text-indigo-600" />
                      {facility}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400">Standard classroom amenities</span>
              )}
            </div>
          </div>

          {/* Ministry Attendance Check-In Notice */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <span>In-Person Classroom Check-In Policy</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Please arrive at the <strong>{venue.branch}</strong> training facility at least 15
              minutes prior to lecture start. Ensure you carry your official Ministry of Revenues
              employee badge. Once inside the room, scan the session QR code or enter the 6-digit
              PIN provided by your instructor to register your official attendance.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
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
    </div>
  );
}

