"use client";

import { ArrowLeft, Building2, CheckCircle2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { ApiUser, ApiVenue } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** One row of the multi-venue scheduler — each row becomes its own in-person session. */
export interface InPersonVenueRow {
  key: string;
  venueId: string;
  trainerId: string;
  date: string;
  time: string;
  duration: number;
}

export interface VenueRowDefaults {
  date: string;
  time: string;
  duration: number;
  /** Trainer used when no trainer has the venue as their primary venue. */
  fallbackTrainerId: string;
}

/** Prefer the trainer whose primary venue this is; otherwise the fallback. */
function trainerForVenue(venueId: string | undefined, trainers: ApiUser[], fallbackTrainerId: string) {
  const affiliated = venueId
    ? trainers.find((t) => (t as any).primaryVenueId === venueId)
    : undefined;
  return affiliated?.id || fallbackTrainerId;
}

/** A new allocation row for `venue`, pre-filled from the session's default schedule. */
export function createVenueRow(
  venue: ApiVenue | undefined,
  trainers: ApiUser[],
  defaults: VenueRowDefaults,
  index: number,
): InPersonVenueRow {
  return {
    key: `row-${Date.now()}-${index}`,
    venueId: venue?.id ?? "",
    trainerId: trainerForVenue(venue?.id, trainers, defaults.fallbackTrainerId),
    date: defaults.date,
    time: defaults.time,
    duration: defaults.duration,
  };
}

interface VenueAllocationStepProps {
  rows: InPersonVenueRow[];
  onRowsChange: (rows: InPersonVenueRow[]) => void;
  venues: ApiVenue[];
  trainers: ApiUser[];
  defaults: VenueRowDefaults;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

/** Step 2 of in-person scheduling: allocate venues, trainers and times across branches. */
export function VenueAllocationStep({
  rows,
  onRowsChange,
  venues,
  trainers,
  defaults,
  error,
  submitting,
  onBack,
  onCancel,
  onSubmit,
}: VenueAllocationStepProps) {
  const handleAddRow = () => {
    // Pick next unused venue if available
    const usedVenueIds = new Set(rows.map((r) => r.venueId));
    const nextVenue = venues.find((v) => !usedVenueIds.has(v.id)) || venues[0];
    onRowsChange([...rows, createVenueRow(nextVenue, trainers, defaults, rows.length + 1)]);
  };

  const handleRemoveRow = (key: string) => {
    if (rows.length <= 1) {
      toast.error("At least one venue classroom allocation is required.");
      return;
    }
    onRowsChange(rows.filter((r) => r.key !== key));
  };

  const handleUpdateRow = (key: string, patch: Partial<InPersonVenueRow>) => {
    onRowsChange(
      rows.map((r) => {
        if (r.key !== key) return r;
        const updated = { ...r, ...patch };

        // Auto-select the affiliated trainer when the venue changes
        if (patch.venueId && patch.venueId !== r.venueId) {
          const affiliated = trainers.find((t) => (t as any).primaryVenueId === patch.venueId);
          if (affiliated) {
            updated.trainerId = affiliated.id;
          }
        }
        return updated;
      }),
    );
  };

  const totalSeats = rows.reduce((acc, r) => {
    const v = venues.find((x) => x.id === r.venueId);
    return acc + (v?.capacity || 0);
  }, 0);

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" />
            Step 2: Allocate Physical Venues &amp; Branch Instructors
          </h4>
          <p className="text-xs text-slate-500">
            Add multiple branch locations to run this training session simultaneously across the Ministry.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleAddRow}
          className="gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Another Venue / Room
        </Button>
      </div>

      {/* Venues Allocation Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="px-3.5 py-3 min-w-[200px]">Venue / Classroom *</th>
              <th className="px-3 py-3 min-w-[190px]">Assigned Trainer *</th>
              <th className="px-3 py-3 w-[140px]">Date *</th>
              <th className="px-3 py-3 w-[110px]">Time *</th>
              <th className="px-3 py-3 w-[90px]">Duration</th>
              <th className="px-3 py-3 w-[80px] text-center">Capacity</th>
              <th className="px-3 py-3 w-[50px] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const rowVenue = venues.find((v) => v.id === row.venueId);
              return (
                <tr key={row.key} className="hover:bg-slate-50/50 transition">
                  {/* Venue selector */}
                  <td className="px-3.5 py-2.5">
                    <select
                      value={row.venueId}
                      onChange={(e) => handleUpdateRow(row.key, { venueId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                    >
                      <option value="">Select a Venue…</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.branch} — {v.name} ({v.capacity} seats)
                        </option>
                      ))}
                    </select>
                    {rowVenue?.building ? (
                      <p className="mt-1 text-[11px] text-slate-400 truncate">
                        📍 {rowVenue.building}
                      </p>
                    ) : null}
                  </td>

                  {/* Trainer selector */}
                  <td className="px-3 py-2.5">
                    <select
                      value={row.trainerId}
                      onChange={(e) => handleUpdateRow(row.key, { trainerId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                    >
                      <option value="">Select Trainer…</option>
                      {trainers.map((t) => {
                        const isAffiliated = (t as any).primaryVenueId === row.venueId;
                        return (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} {isAffiliated ? "★ (Primary Venue)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2.5">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => handleUpdateRow(row.key, { date: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                    />
                  </td>

                  {/* Time */}
                  <td className="px-3 py-2.5">
                    <input
                      type="time"
                      value={row.time}
                      onChange={(e) => handleUpdateRow(row.key, { time: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                    />
                  </td>

                  {/* Duration */}
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={row.duration}
                      onChange={(e) => handleUpdateRow(row.key, { duration: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                    />
                  </td>

                  {/* Seat Capacity Badge */}
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="indigo" className="text-[10px] font-bold">
                      {rowVenue?.capacity ?? "—"}
                    </Badge>
                  </td>

                  {/* Delete row */}
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.key)}
                      disabled={rows.length <= 1}
                      className={cn(
                        "rounded-lg p-1.5 transition",
                        rows.length <= 1
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-400 hover:bg-red-50 hover:text-red-600",
                      )}
                      title="Remove Venue Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Total summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">
            Allocated Venues: <strong className="text-indigo-600">{rows.length}</strong>
          </span>
          <span className="font-semibold text-slate-700">
            Total Seat Capacity: <strong className="text-emerald-600">{totalSeats} Seats</strong>
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Each row creates an independent in-person session linked to that physical classroom.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      ) : null}

      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Basic Details</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Creating Sessions…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Create {rows.length} In-Person Sessions
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
