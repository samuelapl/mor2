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
    if (session && (await quizGate.guard(session.id))) setLiveWorkspaceOpen(true);
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
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </PageShell>
    );
  }

  if (error || !session) {
    return (
      <PageShell title="Session Not Found" description="Could not load session details">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">{error || 'Session not found'}</p>
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
            className="gap-1.5 text-xs text-slate-700 border-slate-200"
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Session</span>
            <Badge variant={session.status === 'LIVE' ? 'green' : session.status === 'SCHEDULED' ? 'blue' : 'slate'} dot>
              {session.status}
            </Badge>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs font-medium text-slate-500">{session.platform}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{new Date(session.scheduledAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{session.durationMinutes} mins</span>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-100 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'quiz' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Prepare Quiz
            <span className="rounded-full bg-indigo-50 px-1.5 py-0.2 text-[10px] font-bold text-indigo-600">Pre-load</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Quiz preparation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Build quiz groups from the question bank, set the timer and each question&apos;s points. In the live room you can
                  broadcast a prepared group to learners in one click.
                </p>
              </div>
            </div>

            <PreparedQuizManager sessionId={session.id} courseId={session.courseId} />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Session Description</h3>
            <div className="text-xs text-slate-600 leading-relaxed">
              <RichContent html={session.descriptionEn} placeholder="No description provided for this session." />
            </div>
            {session.descriptionAm && (
              <div className="text-xs text-slate-600 leading-relaxed font-amharic">
                <RichContent html={session.descriptionAm} />
              </div>
            )}
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
