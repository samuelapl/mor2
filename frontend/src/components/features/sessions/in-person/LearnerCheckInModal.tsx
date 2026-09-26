"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  MapPin,
  QrCode,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { selfCheckIn } from "@/lib/api/monitoring";
import type { ApiLiveSession } from "@/lib/api/types";
import { toast } from "@/lib/toast";

interface LearnerCheckInModalProps {
  open: boolean;
  onClose: () => void;
  session: ApiLiveSession;
  onSuccess?: () => void;
}

export function LearnerCheckInModal({
  open,
  onClose,
  session,
  onSuccess,
}: LearnerCheckInModalProps) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const expectedPin = session.id.slice(-6).toUpperCase();
  const venue = session.venue;

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (pin.trim() && pin.trim().toUpperCase() !== expectedPin) {
      toast.error(`Invalid PIN code. Please verify the 6-digit code shown on the classroom screen.`);
      return;
    }

    setSubmitting(true);
    try {
      await selfCheckIn(session.id, "QR");
      setSuccess(true);
      toast.success("Attendance successfully confirmed! You are marked as PRESENT.");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record attendance check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
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

          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-200 mb-2">
            <Building2 className="h-3.5 w-3.5" />
            Classroom Verification
          </div>

          <h3 className="text-lg font-bold tracking-tight text-white">
            {session.titleEn || "Classroom Session"}
          </h3>
          <p className="mt-1 text-xs text-indigo-200 flex items-center justify-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-indigo-400" />
            <span>{venue?.branch || "Ministry Training Center"}</span>
            <span>·</span>
            <span>{venue?.name || "Room"}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Attendance Confirmed!</h4>
              <p className="text-xs text-slate-600">
                You are registered as <strong>PRESENT</strong> for this classroom training session. Your attendance record is logged.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 leading-relaxed">
                Enter the 6-character PIN displayed on the classroom screen or scan the trainer&apos;s QR code to verify your physical presence.
              </div>

              <div>
                <label
                  htmlFor="pinInput"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
                >
                  Classroom PIN Code (Optional)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="pinInput"
                    type="text"
                    maxLength={8}
                    placeholder="e.g. 8A3F2B"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 font-mono text-base font-bold tracking-widest text-slate-900 placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 py-2.5"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {submitting ? "Verifying Attendance…" : "Confirm Physical Check-In"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

