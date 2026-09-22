"use client";

import React, { useState } from "react";
import { Hand, X, Check, Users } from "lucide-react";
import type { RaisedHandEntry } from "@/types/livekit-events";

interface HandRaiseIndicatorProps {
  isTrainer: boolean;
  raisedHands: RaisedHandEntry[];
  myHandRaised: boolean;
  onToggleMyHand: () => void;
  onLowerHandForUser: (userId: string) => void;
  onLowerAllHands?: () => void;
}

export function HandRaiseIndicator({
  isTrainer,
  raisedHands,
  myHandRaised,
  onToggleMyHand,
  onLowerHandForUser,
  onLowerAllHands,
}: HandRaiseIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  // Learner View: floating pill when learner's hand is raised, or floating raise hand button
  if (!isTrainer) {
    if (!myHandRaised) {
      return (
        <div className="absolute bottom-20 left-6 z-30">
          <button
            type="button"
            onClick={onToggleMyHand}
            className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-xl backdrop-blur-md hover:bg-slate-800 hover:text-white hover:border-amber-500/50 transition duration-150"
            title="Raise your hand to ask a question or get the trainer's attention"
          >
            <Hand className="h-4 w-4 text-amber-400" />
            <span>Raise Hand</span>
          </button>
        </div>
      );
    }

    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-950/90 px-4 py-2 text-amber-200 shadow-xl backdrop-blur-md">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
            <Hand className="h-4 w-4 animate-bounce" />
          </span>
          <span className="text-xs font-bold">Your hand is raised</span>
          <button
            type="button"
            onClick={onToggleMyHand}
            className="rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 transition border border-amber-400/30"
          >
            Lower Hand
          </button>
        </div>
      </div>
    );
  }

  // Trainer View: indicator for raised hands queue
  if (raisedHands.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="relative">
        {/* Trigger Pill */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-950/90 px-3.5 py-2 text-amber-100 shadow-xl backdrop-blur-md hover:bg-amber-900/90 transition"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-bold text-xs">
            {raisedHands.length}
          </span>
          <Hand className="h-4 w-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold">
            {raisedHands.length === 1 ? "Hand Raised" : "Hands Raised"}
          </span>
        </button>

        {/* Expanded Queue Drawer */}
        {expanded && (
          <div className="absolute top-12 right-0 w-72 rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl text-slate-100 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Hand className="h-3.5 w-3.5" />
                <span>Raised Hands Queue ({raisedHands.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {raisedHands.map((entry, idx) => (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200 truncate">
                      {entry.userName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLowerHandForUser(entry.userId)}
                    className="ml-2 shrink-0 rounded-lg bg-slate-700/80 p-1 text-slate-300 hover:bg-emerald-600 hover:text-white transition"
                    title="Acknowledge & Lower Hand"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {onLowerAllHands && raisedHands.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  onLowerAllHands();
                  setExpanded(false);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-1.5 text-center text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
              >
                Lower All Hands
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
