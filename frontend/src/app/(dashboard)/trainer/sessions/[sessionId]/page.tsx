'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, HelpCircle, Info, Loader2, MonitorPlay, Sparkles } from 'lucide-react';
import { fetchLiveSession } from '@/lib/api/monitoring';
import type { ApiLiveSession } from '@/lib/api/types';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PreparedQuizManager } from '@/components/features/prepared-quiz/PreparedQuizManager';
import { LiveSessionWorkspace } from '@/components/features/sessions/virtual/LiveSessionWorkspace';
import { useQuizReadinessGate } from '@/components/features/prepared-quiz/useQuizReadinessGate';
import { isInPersonSession } from '@/lib/session-mode';
import { RichContent } from '@/components/ui/RichContent';
import { formatSessionDate, formatSessionTime } from '@/lib/app-time';
import { toast } from '@/lib/toast';

export default function SessionQuizPrepPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Array.isArray(params?.sessionId) ? params.sessionId[0] : (params?.sessionId as string);

  const [session, setSession] = useState<ApiLiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quiz' | 'info'>('quiz');
  const [liveWorkspaceOpen, setLiveWorkspaceOpen] = useState(false);
  // The graded quiz must be prepared before the trainer can join the room.
  const quizGate = useQuizReadinessGate();
  const joinRoom = async () => {
    if (!session) return;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const isTimeReached =
      session.status === 'LIVE' ||
      (session.scheduledAt &&
        Date.now() >= new Date(session.scheduledAt).getTime() - FIVE_MINUTES_MS);
    if (!isTimeReached) {
      toast.info(
        'This live session is coming soon. You can join the room 5 minutes before the scheduled start time.',
      );
      return;
    }
    if (await quizGate.guard(session.id)) setLiveWorkspaceOpen(true);
  };

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchLiveSession(sessionId);
        if (mounted) setSession(data);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load session details');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <PageShell title="Session Preparation" description="Preparing session live quiz questions...">
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (error || !session) {
    return (
      <PageShell title="Session Not Found" description="Could not load session details">
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">{error || 'Session not found'}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/trainer/sessions')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sessions
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const isVirtual = !isInPersonSession(session);
  const isEnded = session.status === 'COMPLETED' || session.status === 'CANCELLED';

  return (
    <PageShell
      title={session.titleEn || 'Live Session'}
      description={`Course session pre-configuration & live quiz preparation`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/trainer/sessions')}
            className="gap-1.5 text-xs text-secondary-foreground border-border"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Sessions
          </Button>

          {isVirtual && !isEnded && (
            <Button
              size="sm"
              onClick={() => void joinRoom()}
              isLoading={quizGate.checkingId === session.id}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-xs"
            >
              <MonitorPlay className="h-4 w-4" />
              Join Live Room
            </Button>
          )}
        </div>
      }
    >
      {/* Session Header Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">Session</span>
            <Badge variant={session.status === 'LIVE' ? 'green' : session.status === 'SCHEDULED' ? 'blue' : 'slate'} dot>
              {session.status}
            </Badge>
            <span className="text-xs text-subtle-foreground">|</span>
            <span className="text-xs font-medium text-muted-foreground">{session.platform}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-subtle-foreground" />
              <span>
                {formatSessionDate(session.scheduledAt)} · {formatSessionTime(session.scheduledAt)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
              <span>{session.durationMinutes} mins</span>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-border/60 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'quiz' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Prepare Quiz
            <span className="rounded-full bg-primary-soft px-1.5 py-0.2 text-[10px] font-bold text-primary">Pre-load</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            Session Overview
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="mt-4">
        {activeTab === 'quiz' ? (
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Quiz preparation
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Build quiz groups from the question bank, set the timer and each question&apos;s points. In the live room you can
                  broadcast a prepared group to learners in one click.
                </p>
              </div>
            </div>

            <PreparedQuizManager sessionId={session.id} courseId={session.courseId} />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground">Session Description</h3>
            <div className="text-xs text-secondary-foreground leading-relaxed">
              <RichContent html={session.descriptionEn} placeholder="No description provided for this session." />
            </div>
            {session.descriptionAm && (
              <div className="text-xs text-secondary-foreground leading-relaxed font-amharic">
                <RichContent html={session.descriptionAm} />
              </div>
            )}
            <h3 className="pt-2 text-sm font-bold text-foreground">Session Objectives</h3>
            <div className="text-xs text-secondary-foreground leading-relaxed">
              <RichContent html={session.objectivesEn} placeholder="No objectives provided for this session." />
            </div>
          </div>
        )}
      </div>

      {/* Live Workspace Modal if Trainer clicks Join */}
      {quizGate.modal}
      {liveWorkspaceOpen && (
        <LiveSessionWorkspace open={liveWorkspaceOpen} onClose={() => setLiveWorkspaceOpen(false)} session={session} userRole="trainer" />
      )}
    </PageShell>
  );
}
