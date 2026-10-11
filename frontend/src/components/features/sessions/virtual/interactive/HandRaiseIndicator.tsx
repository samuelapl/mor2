'use client';

import React, { useState } from 'react';
import { Hand, X, Check, Users } from 'lucide-react';
import type { RaisedHandEntry } from '@/types/livekit-events';

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
            className="flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md hover:bg-muted hover:text-primary hover:border-primary/30 transition duration-150"
            title="Raise your hand to ask a question or get the trainer's attention"
          >
            <Hand className="h-4 w-4 text-amber-500" />
            <span>Raise Hand</span>
          </button>
        </div>
      );
    }

    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
        <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-card px-4 py-2 text-warning shadow-xl backdrop-blur-md">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-warning-soft text-warning border border-warning/30">
            <Hand className="h-4 w-4 animate-bounce" />
          </span>
          <span className="text-xs font-bold text-foreground">Your hand is raised</span>
          <button
            type="button"
            onClick={onToggleMyHand}
            className="rounded-lg bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning hover:bg-warning/15 transition border border-warning/25"
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
          className="flex items-center gap-2.5 rounded-2xl border border-warning/30 bg-card px-3.5 py-2 text-foreground shadow-xl backdrop-blur-md hover:bg-warning-soft/60 transition"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
            {raisedHands.length}
          </span>
          <Hand className="h-4 w-4 text-warning animate-pulse" />
          <span className="text-xs font-bold text-foreground">
            {raisedHands.length === 1 ? 'Hand Raised' : 'Hands Raised'}
          </span>
        </button>

        {/* Expanded Queue Drawer */}
        {expanded && (
          <div className="absolute top-12 right-0 w-72 rounded-2xl border border-border bg-card p-3.5 shadow-2xl backdrop-blur-xl text-foreground space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-warning">
                <Hand className="h-3.5 w-3.5" />
                <span>Raised Hands Queue ({raisedHands.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-subtle-foreground hover:text-secondary-foreground p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {raisedHands.map((entry, idx) => (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/80 p-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-border text-[10px] font-bold text-secondary-foreground">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-foreground truncate">{entry.userName}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLowerHandForUser(entry.userId)}
                    className="ml-2 shrink-0 rounded-lg bg-secondary p-1 text-secondary-foreground hover:bg-emerald-600 hover:text-white transition"
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
                className="w-full rounded-xl border border-border bg-muted py-1.5 text-center text-xs font-medium text-secondary-foreground hover:bg-secondary transition"
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
