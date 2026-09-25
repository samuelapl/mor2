"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hand,
  HelpCircle,
  Laptop,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorPlay,
  PhoneOff,
  Radio,
  RefreshCw,
  Send,
  Share2,
  ShieldAlert,
    Users,
  Video,
  Volume2,
} from "lucide-react";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  fetchSessionAttendance,
  fetchSessionAttendanceVisibility,
  fetchSessionJoinUrl,
  recordSessionHeartbeat,
  recordSessionJoin,
  recordSessionLeave,
  selfCheckIn,
  fetchLiveKitToken,
  fetchSystemSettings,
} from "@/lib/api/monitoring";
import type { ApiAttendance, ApiAttendanceVisibility, ApiLiveSession } from "@/lib/api/types";
import { useLms } from "@/lib/lms-store";
import { DynamicAttendanceModal } from "./DynamicAttendanceModal";
import { DisconnectReason } from "livekit-client";

// LiveKit — only imported when session.platform === "LIVEKIT"
import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";

// Phase 2: Live Interactive Subsystem
import { useLiveKitDataChannel } from "@/hooks/useLiveKitDataChannel";
import type {
  LiveKitDataEvent,
  LiveQuizOption,
  LiveQuizPayload,
  LiveQuizRevealPayload,
  RaisedHandEntry,
} from "@/types/livekit-events";
import { LiveQuizTrainerControl } from "./interactive/LiveQuizTrainerControl";
import { LiveQuizLearnerOverlay } from "./interactive/LiveQuizLearnerOverlay";
import { HandRaiseIndicator } from "./interactive/HandRaiseIndicator";

interface LiveSessionWorkspaceProps {
  open: boolean;
  onClose: () => void;
  session: ApiLiveSession;
  courseTitle?: string;
  courseCode?: string;
  trainerName?: string;
  userRole?: "trainer" | "learner" | "training_admin" | "system_admin" | "course_owner" | "content_approver" | string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSelf: boolean;
}

interface LiveKitInteractiveLayerProps {
  session: ApiLiveSession;
  currentUser: any;
  trainerName?: string;
  isStaff: boolean;
  trainerQuizModalOpen: boolean;
  setTrainerQuizModalOpen: (open: boolean) => void;
  courseTitle?: string;
  courseCode?: string;
  attendees?: any[];
}

function LiveKitInteractiveLayer({
  session,
  currentUser,
  trainerName,
  isStaff,
  trainerQuizModalOpen,
  setTrainerQuizModalOpen,
  courseTitle: propCourseTitle,
  courseCode: propCourseCode,
  attendees = [],
}: LiveKitInteractiveLayerProps) {
  const courseTitle = propCourseTitle || session.course?.titleEn || session.course?.titleAm || "";
  const courseCode = propCourseCode || session.course?.code || "";

  const currentUserId = String(currentUser?.id || "guest");
  const currentUserName =
    currentUser?.name ||
    currentUser?.firstName ||
    (isStaff ? "Trainer" : "Learner");

  // Quiz state
  const [activeQuiz, setActiveQuiz] = useState<LiveQuizPayload | null>(null);

  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        userId: string;
        userName: string;
        selectedOptionIds: string[];
        submittedAt?: number;
        responseDurationSeconds?: number;
      }
    >
  >({});

  const [revealData, setRevealData] = useState<LiveQuizRevealPayload | null>(null);
  const [revealsByQuestionId, setRevealsByQuestionId] = useState<Record<string, LiveQuizRevealPayload>>({});
  const [learnerDismissed, setLearnerDismissed] = useState(false);

  const [quizHistory, setQuizHistory] = useState<
    Array<{
      quiz: LiveQuizPayload;
      answers: Record<
        string,
        {
          userId: string;
          userName: string;
          selectedOptionIds: string[];
          submittedAt?: number;
          responseDurationSeconds?: number;
        }
      >;
      revealData?: LiveQuizRevealPayload | null;
      completedAt: number;
    }>
  >([]);

  // Hand raise state
  const [raisedHands, setRaisedHands] = useState<RaisedHandEntry[]>([]);
  const [myHandRaised, setMyHandRaised] = useState(false);

  // Central event handler for processing actions locally and remotely
  const processEvent = useCallback(
    (event: LiveKitDataEvent) => {
      switch (event.type) {
        case "QUIZ_START":
          setLearnerDismissed(false);
          setActiveQuiz((currentActive) => {
            if (currentActive) {
              setAnswers((currentAnswers) => {
                setQuizHistory((prev) => [
                  ...prev.filter((h) => h.quiz.id !== currentActive.id),
                  {
                    quiz: currentActive,
                    answers: currentAnswers,
                    revealData: revealsByQuestionId[currentActive.id] || revealData,
                    completedAt: Date.now(),
                  },
                ]);
                return {};
              });
            }
            return event.payload;
          });
          setRevealData(null);
          break;
        case "QUIZ_ANSWER":
          setAnswers((prev) => ({
            ...prev,
            [event.payload.userId]: {
              userId: event.payload.userId,
              userName: event.payload.userName,
              selectedOptionIds: event.payload.selectedOptionIds,
              submittedAt: event.payload.submittedAt,
              responseDurationSeconds: event.payload.responseDurationSeconds,
            },
          }));
          break;
        case "QUIZ_REVEAL":
          setLearnerDismissed(false);
          setRevealData(event.payload);
          setRevealsByQuestionId((prev) => {
            const next = {
              ...prev,
              [event.payload.questionId]: event.payload,
            };
            if (event.payload.allReveals) {
              Object.entries(event.payload.allReveals).forEach(([qId, rev]) => {
                next[qId] = {
                  questionId: qId,
                  correctOptionIds: rev.correctOptionIds,
                  explanationEn: rev.explanationEn,
                  explanationAm: rev.explanationAm,
                  distribution: rev.distribution || {},
                  totalResponses: rev.totalResponses || 0,
                };
              });
            }
            return next;
          });
          setQuizHistory((prev) =>
            prev.map((h) => {
              if (h.quiz.id === event.payload.questionId) {
                return { ...h, revealData: event.payload };
              }
              if (event.payload.allReveals && event.payload.allReveals[h.quiz.id]) {
                const rev = event.payload.allReveals[h.quiz.id];
                return {
                  ...h,
                  revealData: {
                    questionId: h.quiz.id,
                    correctOptionIds: rev.correctOptionIds || h.quiz.correctOptionIds || ["0"],
                    explanationEn: rev.explanationEn || h.quiz.explanationEn,
                    explanationAm: rev.explanationAm || h.quiz.explanationAm,
                    distribution: rev.distribution || {},
                    totalResponses: rev.totalResponses || 0,
                  },
                };
              }
              return h;
            })
          );
          break;
        case "QUIZ_CLOSE":
          setLearnerDismissed(true);
          setRevealData(null);
          setActiveQuiz((currentActive) => {
            if (currentActive) {
              setAnswers((currentAnswers) => {
                setQuizHistory((prev) => [
                  ...prev.filter((h) => h.quiz.id !== currentActive.id),
                  {
                    quiz: currentActive,
                    answers: currentAnswers,
                    revealData: revealsByQuestionId[currentActive.id] || revealData,
                    completedAt: Date.now(),
                  },
                ]);
                return {};
              });
            }
            return null;
          });
          break;
        case "HAND_RAISE":
          if (event.payload.raised) {
            setRaisedHands((prev) => {
              if (prev.some((h) => h.userId === event.payload.userId)) return prev;
              return [
                ...prev,
                {
                  userId: event.payload.userId,
                  userName: event.payload.userName,
                  timestamp: event.payload.timestamp,
                },
              ];
            });
            if (event.payload.userId === currentUserId) {
              setMyHandRaised(true);
            }
          } else {
            setRaisedHands((prev) =>
              prev.filter((h) => h.userId !== event.payload.userId)
            );
            if (event.payload.userId === currentUserId) {
              setMyHandRaised(false);
            }
          }
          break;
      }
    },
    [currentUserId]
  );

  // Hook into Data Channel for remote events
  const { broadcast } = useLiveKitDataChannel({
    onEvent: processEvent,
  });

  // Outbound broadcast that also applies locally immediately
  const handleBroadcast = useCallback(
    (event: LiveKitDataEvent) => {
      processEvent(event);
      broadcast(event);
    },
    [broadcast, processEvent]
  );

  const handleToggleMyHand = useCallback(() => {
    const nextState = !myHandRaised;
    setMyHandRaised(nextState);
    broadcast({
      type: "HAND_RAISE",
      payload: {
        userId: currentUserId,
        userName: currentUserName,
        raised: nextState,
        timestamp: Date.now(),
      },
    });
  }, [broadcast, currentUserId, currentUserName, myHandRaised]);

  const handleLowerHandForUser = useCallback(
    (targetUserId: string) => {
      const entry = raisedHands.find((h) => h.userId === targetUserId);
      setRaisedHands((prev) => prev.filter((h) => h.userId !== targetUserId));
      broadcast({
        type: "HAND_RAISE",
        payload: {
          userId: targetUserId,
          userName: entry?.userName || "Participant",
          raised: false,
          timestamp: Date.now(),
        },
      });
    },
    [broadcast, raisedHands]
  );

  const handleLowerAllHands = useCallback(() => {
    const currentList = [...raisedHands];
    setRaisedHands([]);
    for (const h of currentList) {
      broadcast({
        type: "HAND_RAISE",
        payload: {
          userId: h.userId,
          userName: h.userName,
          raised: false,
          timestamp: Date.now(),
        },
      });
    }
  }, [broadcast, raisedHands]);

  return (
    <>
      {/* Hand Raise queue (trainer) or indicator/button (learner) */}
      <HandRaiseIndicator
        isTrainer={isStaff}
        raisedHands={raisedHands}
        myHandRaised={myHandRaised}
        onToggleMyHand={handleToggleMyHand}
        onLowerHandForUser={handleLowerHandForUser}
        onLowerAllHands={handleLowerAllHands}
      />

      {/* Trainer Floating Button to launch quiz when none is active */}
      {isStaff && !activeQuiz && (
        <div className="absolute bottom-20 right-6 z-30">
          <button
            type="button"
            onClick={() => setTrainerQuizModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/50 bg-indigo-950/90 px-3.5 py-2 text-xs font-semibold text-indigo-200 shadow-xl backdrop-blur-md hover:bg-indigo-900 hover:text-white transition duration-150"
            title="Open Live Quiz & Polls Controller"
          >
            <HelpCircle className="h-4 w-4 text-indigo-400" />
            <span>Live Quiz &amp; Polls</span>
          </button>
        </div>
      )}

      {/* Trainer Floating Banner when a quiz is actively running */}
      {isStaff && activeQuiz && !trainerQuizModalOpen && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-500/50 bg-slate-900/95 px-4 py-2 text-slate-100 shadow-xl backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold">Quiz In Progress</span>
            <span className="text-xs text-indigo-300">
              ({Object.keys(answers).length} responses)
            </span>
            <button
              type="button"
              onClick={() => setTrainerQuizModalOpen(true)}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              View Results
            </button>
          </div>
        </div>
      )}

      {/* Learner Interactive Quiz Overlay (only visible during an active quiz session) */}
      {!isStaff && !learnerDismissed && Boolean(activeQuiz) && (
        <LiveQuizLearnerOverlay
          sessionId={session.id}
          userId={currentUserId}
          userName={currentUserName}
          quiz={
            activeQuiz
              ? {
                  ...activeQuiz,
                  type: activeQuiz.type || "SINGLE_CHOICE",
                }
              : null
          }
          quizHistory={quizHistory}
          revealData={revealData}
          revealsByQuestionId={revealsByQuestionId}
          onBroadcast={handleBroadcast}
          onDismiss={() => setLearnerDismissed(true)}
        />
      )}

      {/* Trainer Quiz & Polls Management Modal / Drawer */}
      {isStaff && (
        <LiveQuizTrainerControl
          open={trainerQuizModalOpen}
          onClose={() => setTrainerQuizModalOpen(false)}
          sessionId={session.id}
          courseId={session.courseId}
          course={session.course || (courseTitle ? { id: session.courseId, titleEn: courseTitle, titleAm: "", code: courseCode } : undefined)}
          trainerName={trainerName || currentUserName}
          onBroadcast={handleBroadcast}
          activeQuiz={activeQuiz}
          answers={answers}
          quizHistory={quizHistory}
          attendees={attendees}
          onClearQuiz={() => {
            if (activeQuiz) {
              setQuizHistory((prev) => [
                ...prev.filter((h) => h.quiz.id !== activeQuiz.id),
                { quiz: activeQuiz, answers, completedAt: Date.now() },
              ]);
            }
            setActiveQuiz(null);
            setRevealData(null);
            setAnswers({});
          }}
        />
      )}
    </>
  );
}

export function LiveSessionWorkspace({
  open,
  onClose,
  session,
  courseTitle,
  courseCode,
  trainerName,
  userRole = "learner",
}: LiveSessionWorkspaceProps) {
  const { currentUser } = useLms();

  const isTrainerOrStaff =
    userRole === "trainer" ||
    userRole === "training_admin" ||
    userRole === "system_admin" ||
    userRole === "course_owner" ||
    Boolean(currentUser?.id && session.trainerId === currentUser.id);

  const [trainerQuizModalOpen, setTrainerQuizModalOpen] = useState(false);

  // Conference modes
  const [conferenceMode, setConferenceMode] = useState<"interactive" | "embedded">("interactive");
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standardModeFallback, setStandardModeFallback] = useState(false);

  // LiveKit token state (only populated when session.platform === "LIVEKIT")
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitWsUrl, setLiveKitWsUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"
  );
  const isLiveKitSession = session.platform === "LIVEKIT";

  const toggleFullScreen = () => {
    const nextState = !isFullScreen;
    setIsFullScreen(nextState);
    try {
      if (nextState && !document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (!nextState && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  useEffect(() => {
    const onFsChange = () => {
      if (document.fullscreenElement) {
        setIsFullScreen(true);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Live media streams & controls
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState<"video" | "chat" | "attendees">("video");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Live audience detection & stay calculation
  const [staySeconds, setStaySeconds] = useState(0);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState<"PRESENT" | "ABSENT">("ABSENT");
  const [rejoinDetected, setRejoinDetected] = useState(false);
  const [policyThreshold, setPolicyThreshold] = useState<number>(session.attendanceThreshold ?? 60);
  const sessionDurationMinutes = session.durationMinutes > 0 ? session.durationMinutes : 30;

  // Load institutional attendance policy threshold from system settings
  useEffect(() => {
    fetchSystemSettings()
      .then((settings) => {
        if (settings?.default_attendance_threshold) {
          const t = parseInt(settings.default_attendance_threshold, 10);
          if (!isNaN(t) && t > 0) setPolicyThreshold(t);
        }
      })
      .catch(() => {});
  }, []);

  // Dynamic attendance modal visibility
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [visibility, setVisibility] = useState<ApiAttendanceVisibility | null>(null);
  const [attendees, setAttendees] = useState<ApiAttendance[]>([]);

  // In-session group chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: trainerName || "Trainer",
      text: `Welcome to "${session.titleEn || "Live Session"}". Real-time audience stay tracking is active (>= ${policyThreshold}% required for Present status). Feel free to ask questions here!`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: false,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const formatJitsiUrl = (url: string, name: string) => {
    if (!url || (!url.includes("meet.jit.si") && !url.includes("jitsi"))) return url;
    const baseUrl = url.split("#")[0];
    return `${baseUrl}#userInfo.displayName="${encodeURIComponent(name)}"&config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.requireDisplayName=false&config.enableWelcomePage=false&config.disableDeepLinking=true`;
  };

  // 1. Initial Join and Audience Detection Setup
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const displayName =
      currentUser?.name ||
      currentUser?.firstName ||
      (userRole === "trainer" ? "Trainer" : "Participant");

    const init = async () => {
      try {
        // 1. For LIVEKIT sessions, prioritize fetching the room access token immediately
        if (isLiveKitSession) {
          try {
            const tkRes = await fetchLiveKitToken(session.id);
            if (!cancelled) {
              setLiveKitToken(tkRes.token);
              if (tkRes.wsUrl) setLiveKitWsUrl(tkRes.wsUrl);
            }
          } catch (tkErr: any) {
            if (!cancelled) {
              const msg = tkErr?.message || "Could not obtain LiveKit access token.";
              setError(msg);
            }
          }
        } else {
          // Fetch join URL for external/embedded fallback
          try {
            const res = await fetchSessionJoinUrl(session.id);
            if (!cancelled) {
              const rawUrl = res?.joinUrl || session.externalUrl;
              if (rawUrl) {
                setJoinUrl(formatJitsiUrl(rawUrl, displayName));
              }
            }
          } catch {
            if (session.externalUrl && !cancelled) {
              setJoinUrl(formatJitsiUrl(session.externalUrl, displayName));
            }
          }
        }

        // 2. Check visibility permissions (non-blocking)
        fetchSessionAttendanceVisibility(session.id)
          .then((vis) => {
            if (!cancelled) setVisibility(vis);
          })
          .catch(() => {});

        // 3. Optional audience Join / Rejoin sync (best-effort, non-blocking)
        recordSessionJoin(session.id)
          .then((joinRecord: any) => {
            if (!cancelled && joinRecord) {
              if (joinRecord.threshold) setPolicyThreshold(joinRecord.threshold);
              if ((joinRecord.rejoinCount ?? 0) > 0) setRejoinDetected(true);
              if (joinRecord.activeSeconds) setStaySeconds(joinRecord.activeSeconds);
              if (joinRecord.percentage) setAttendancePercentage(joinRecord.percentage);
              if (joinRecord.status === "PRESENT") setAttendanceStatus("PRESENT");
            }
          })
          .catch(() => {});

        // 4. Learner self check-in (best-effort)
        if (userRole === "learner") {
          void selfCheckIn(session.id, "VIRTUAL").catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError("An error occurred while initializing the session room.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void init();

    // 2. Periodic presence heartbeat (runs every 15 seconds while user is in session)
    const heartbeatTimer = setInterval(async () => {
      if (cancelled) return;
      try {
        const update = await recordSessionHeartbeat(session.id, 15);
        if (!cancelled && update) {
          if (update.threshold) setPolicyThreshold(update.threshold);
          setStaySeconds(update.activeSeconds);
          setAttendancePercentage(update.percentage);
          setAttendanceStatus(update.status === "PRESENT" ? "PRESENT" : "ABSENT");
        }
      } catch {
        // Heartbeat retry on next interval
      }
    }, 15000);

    // 3. Tab close / unload detection: log Leave automatically
    const handleBeforeUnload = () => {
      // Beacon dispatch
      navigator.sendBeacon(`/api/attendance/sessions/${session.id}/leave`);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      clearInterval(heartbeatTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Disconnect local webcam stream on close
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      // Record leave
      void recordSessionLeave(session.id).catch(() => {});
    };
  }, [open, session.id]);

  // Attach local webcam stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraOn]);

  // Media toggles
  const handleToggleCamera = async () => {
    if (cameraOn) {
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => t.stop());
      }
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setLocalStream(stream);
        setCameraOn(true);
      } catch {
        // Camera permissions denied or unavailable; simulate video feed
        setCameraOn(true);
      }
    }
  };

  const handleToggleMic = async () => {
    setMicOn(!micOn);
  };

  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      setScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices.getDisplayMedia) {
          const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setScreenSharing(true);
          display.getVideoTracks()[0].onended = () => setScreenSharing(false);
        } else {
          setScreenSharing(true);
        }
      } catch {
        // User cancelled picker
      }
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: currentUser?.name || (userRole === "trainer" ? "Trainer" : "You"),
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: true,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  const handleLeaveSession = async () => {
    try {
      await recordSessionLeave(session.id);
    } catch {}
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    onClose();
  };

  const handleLiveKitDisconnect = (reason?: DisconnectReason) => {
    if (
      reason === DisconnectReason.CLIENT_INITIATED ||
      reason === DisconnectReason.ROOM_CLOSED ||
      reason === DisconnectReason.ROOM_DELETED
    ) {
      void handleLeaveSession();
    } else {
      console.warn("LiveKit disconnect reason:", reason);
      setError("Disconnected from LiveKit room. Click Retry Connection to rejoin.");
    }
  };

  if (!open) return null;

  const currentStayMinutes = Math.floor(staySeconds / 60);
  const isPresent = attendanceStatus === "PRESENT" || attendancePercentage >= policyThreshold;
  const trainerDisplayName =
    trainerName ||
    (session.trainer
      ? `${session.trainer.firstName} ${session.trainer.lastName}`
      : "Assigned Trainer");

  return (
    <>
      <WorkspaceDetailOverlay
        open={open}
        onClose={handleLeaveSession}
        fullViewport={isFullScreen}
        theme="dark"
        title={
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
              <Radio className="h-4 w-4 animate-pulse" />
            </span>
            <span className="truncate text-white font-bold">{session.titleEn || "Live Training Session"}</span>
          </div>
        }
        subtitle={`${courseCode ? `${courseCode} · ` : ""}${courseTitle || "Training"} · Host: ${trainerDisplayName}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="green" dot>
              Live Room
            </Badge>
            {rejoinDetected && (
              <Badge variant="amber">
                Rejoined Session
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Real-time Stay & Calculation Status Pill */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition shadow-xs ${
                isPresent
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
              title={`Total stay duration: ${currentStayMinutes}m / ${sessionDurationMinutes}m (${attendancePercentage}%). ${
                isPresent ? "Verified Present (>= " + policyThreshold + "%)" : "Stay >= " + policyThreshold + "% to be marked Present"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                Stay: {currentStayMinutes}m / {sessionDurationMinutes}m ({attendancePercentage}%)
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  isPresent ? "bg-emerald-500 ring-4 ring-emerald-400/30" : "bg-amber-500 animate-ping"
                }`}
              />
              <span>{isPresent ? "Present" : "Tracking…"}</span>
            </div>

            {/* Dynamic Attendance Modal Button */}
            <Button
              size="sm"
              variant={visibility?.canView ? "outline" : "ghost"}
              onClick={() => setAttendanceModalOpen(true)}
              className="gap-1.5"
              title={
                visibility?.canView
                  ? "View live session attendees and stay calculation"
                  : "Attendance view is restricted by system administrator"
              }
            >
              <Users className="h-3.5 w-3.5" />
              Attendees
              {visibility?.canView ? (
                <span className="ml-0.5 rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
                  Permitted
                </span>
              ) : null}
            </Button>

            {/* LiveKit Phase 2: Live Quiz & Polls button for trainers/staff */}
            {isLiveKitSession && isTrainerOrStaff && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTrainerQuizModalOpen(true)}
                className="gap-1.5 border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 hover:text-white"
                title="Create or broadcast a live quiz/poll to learners"
              >
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                <span>Quiz &amp; Polls</span>
              </Button>
            )}

            {/* Room Mode Toggle — only show for non-LiveKit sessions */}
            {!isLiveKitSession && (
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setConferenceMode("interactive")}
                  className={`rounded-md px-2 py-1 font-medium transition ${
                    conferenceMode === "interactive"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  In-LMS Suite
                </button>
                {joinUrl && (
                  <button
                    type="button"
                    onClick={() => setConferenceMode("embedded")}
                    className={`rounded-md px-2 py-1 font-medium transition ${
                      conferenceMode === "embedded"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Jitsi / External
                  </button>
                )}
              </div>
            )}

            {joinUrl && (
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition"
                title="Open in new window"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {/* Fullscreen Toggle in Top Header */}
            <Button
              size="sm"
              variant="outline"
              onClick={toggleFullScreen}
              className="gap-1.5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen Viewport"}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="hidden sm:inline text-xs font-semibold">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="hidden sm:inline text-xs font-semibold">Full Screen</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="danger"
              onClick={handleLeaveSession}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              Leave Room
            </Button>
          </div>
        }
        contentClassName="p-0 flex flex-col h-full overflow-hidden bg-slate-950"
      >
        <div className="flex flex-1 min-h-0 w-full h-full overflow-hidden bg-slate-950">
          {/* Main Stage View */}
          <div className="flex-1 min-h-0 flex flex-col relative bg-slate-950 overflow-hidden">
            {loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-sm font-medium">Connecting to virtual training room…</p>
                <span className="text-xs text-indigo-300">
                  {isLiveKitSession ? "Acquiring LiveKit access token…" : "Audience presence tracking initialized"}
                </span>
              </div>
            ) : isLiveKitSession && liveKitToken ? (
              /* ── Native LiveKit Room ───────────────────────────────────── */
              <div className="flex-1 min-h-0 flex flex-col h-full w-full overflow-hidden" data-lk-theme="default">
                <LiveKitRoom
                  token={liveKitToken}
                  serverUrl={liveKitWsUrl}
                  connect={true}
                  video={false}
                  audio={false}
                  onDisconnected={handleLiveKitDisconnect}
                  className="flex-1 flex flex-col h-full overflow-hidden"
                >
                  {/* Renders all remote participant audio tracks automatically */}
                  <RoomAudioRenderer />
                  {/* Full-featured video conference UI provided by the LiveKit component library */}
                  <VideoConference />
                  {/* Phase 2: Live Interactive Subsystem (Quiz, Polls, Hand Raising over Data Channel) */}
                  <LiveKitInteractiveLayer
                    session={session}
                    currentUser={currentUser}
                    trainerName={trainerName}
                    isStaff={isTrainerOrStaff}
                    trainerQuizModalOpen={trainerQuizModalOpen}
                    setTrainerQuizModalOpen={setTrainerQuizModalOpen}
                    courseTitle={courseTitle}
                    courseCode={courseCode}
                    attendees={attendees}
                  />
                </LiveKitRoom>
              </div>
            ) : isLiveKitSession && !liveKitToken && !standardModeFallback ? (
              /* LiveKit token unavailable — show error state with retry and fallback */
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-400 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-base font-bold text-slate-100">Live Classroom Room Access</p>
                  <p className="text-xs text-center text-slate-400 max-w-md">
                    {error || "Could not fetch your room access token. Make sure the backend is running and you are enrolled in this course."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLoading(true);
                      fetchLiveKitToken(session.id)
                        .then((r) => {
                          setLiveKitToken(r.token);
                          if (r.wsUrl) setLiveKitWsUrl(r.wsUrl);
                          setError(null);
                        })
                        .catch((err: any) => {
                          setError(err?.message || "Token fetch failed. Please try again.");
                        })
                        .finally(() => setLoading(false));
                    }}
                    className="gap-1.5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry Connection
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setStandardModeFallback(true);
                      setError(null);
                    }}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                  >
                    <MonitorPlay className="h-3.5 w-3.5" />
                    Continue in Standard Classroom
                  </Button>
                </div>
              </div>
            ) : conferenceMode === "embedded" && joinUrl ? (
              /* Embedded Jitsi/External Frame - 100% full screen with full native controls */
              <div className="flex-1 min-h-0 flex flex-col h-full w-full p-2 bg-slate-950 overflow-hidden">
                <iframe
                  src={joinUrl}
                  allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
                  className="w-full h-full flex-1 min-h-0 border-0 rounded-2xl bg-black"
                  title={session.titleEn || "Live Video Session"}
                />
              </div>
            ) : (
              /* Interactive In-LMS Live Conference Room */
              <div className="flex-1 min-h-0 flex flex-col h-full p-3 sm:p-4 relative justify-between overflow-hidden">
                {/* Top Overlay Banner */}
                <div className="shrink-0 mb-2 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md px-3 py-1.5 text-xs text-white border border-slate-800 shadow-md">
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-semibold">MoR Live Classroom HD</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-indigo-300 font-mono">
                      Stay: {currentStayMinutes}m / {sessionDurationMinutes}m
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className={isPresent ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                      {attendancePercentage}% ({isPresent ? "Present" : "Absent"})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {handRaised && (
                      <span className="flex items-center gap-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1 animate-bounce shadow-lg">
                        <Hand className="h-3.5 w-3.5" />
                        Hand Raised
                      </span>
                    )}
                  </div>
                </div>

                {/* Video Stage Tiles */}
                <div className="flex-1 min-h-0 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch justify-center overflow-hidden">
                  {/* Speaker / Trainer Screen Tile */}
                  <div className="relative h-full min-h-[200px] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950/60 border border-slate-800 overflow-hidden flex flex-col items-center justify-center text-center p-6 group shadow-lg">
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-white border border-white/10">
                      <Volume2 className="h-3 w-3 text-emerald-400" />
                      {trainerDisplayName} (Speaker)
                    </div>

                    <div className="relative flex flex-col items-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-2xl mb-3">
                        <Video className="h-9 w-9" />
                      </div>
                      <h4 className="text-base font-bold text-white tracking-wide">
                        {session.titleEn || "Interactive Training Session"}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        Live presentation feed active. Real-time participant detection and attendance
                        tracking enabled.
                      </p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-0.5 text-[11px] font-semibold text-indigo-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Host &amp; Speaker: {trainerDisplayName}
                      </div>
                    </div>

                    {/* Audio wave animation */}
                    <div className="absolute bottom-3 left-3 flex items-end gap-1 h-4">
                      <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_1s_ease-in-out_infinite] h-2" />
                      <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] h-4" />
                      <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-3" />
                      <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_1.4s_ease-in-out_infinite] h-1" />
                    </div>
                  </div>

                  {/* Current User Webcam / Screen Tile */}
                  <div className="relative h-full min-h-[260px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-white">
                      <span>{currentUser?.name || (userRole === "trainer" ? "Trainer" : "You")}</span>
                      <span className="text-[10px] text-indigo-300">
                        ({userRole === "trainer" ? "Host" : "Audience"})
                      </span>
                    </div>

                    {cameraOn ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 mb-2">
                          <CameraOff className="h-7 w-7" />
                        </div>
                        <p className="text-xs font-medium text-slate-300">Camera is turned off</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Click the Camera button below to turn on your live video
                        </p>
                      </div>
                    )}

                    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs ${
                          micOn ? "bg-emerald-600" : "bg-red-600/80"
                        }`}
                      >
                        {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Control Bar - Guaranteed 100% visible inside viewport */}
                <div className="shrink-0 mt-2.5 flex items-center justify-center flex-wrap gap-2 md:gap-3 py-2.5 px-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl max-w-3xl mx-auto w-full z-20">
                  {/* Microphone */}
                  <Button
                    size="sm"
                    variant={micOn ? "primary" : "outline"}
                    onClick={handleToggleMic}
                    className={`gap-1.5 rounded-xl ${
                      micOn
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
                    {micOn ? "Mute" : "Unmute"}
                  </Button>

                  {/* Camera */}
                  <Button
                    size="sm"
                    variant={cameraOn ? "primary" : "outline"}
                    onClick={handleToggleCamera}
                    className={`gap-1.5 rounded-xl ${
                      cameraOn
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {cameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4 text-slate-400" />}
                    {cameraOn ? "Stop Video" : "Start Video"}
                  </Button>

                  {/* Screen Share */}
                  <Button
                    size="sm"
                    variant={screenSharing ? "primary" : "outline"}
                    onClick={handleToggleScreenShare}
                    className={`gap-1.5 rounded-xl ${
                      screenSharing
                        ? "bg-indigo-600 text-white"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Laptop className="h-4 w-4" />
                    {screenSharing ? "Stop Share" : "Share Screen"}
                  </Button>

                  {/* Raise Hand */}
                  <Button
                    size="sm"
                    variant={handRaised ? "primary" : "outline"}
                    onClick={() => setHandRaised(!handRaised)}
                    className={`gap-1.5 rounded-xl ${
                      handRaised
                        ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Hand className="h-4 w-4" />
                    {handRaised ? "Lower Hand" : "Raise Hand"}
                  </Button>

                  {/* Chat Toggle */}
                  <Button
                    size="sm"
                    variant={activeTab === "chat" ? "primary" : "outline"}
                    onClick={() => setActiveTab(activeTab === "chat" ? "video" : "chat")}
                    className="gap-1.5 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </Button>

                  {/* Fullscreen Toggle in Control Bar */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleFullScreen}
                    className="gap-1.5 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                    title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullScreen ? (
                      <Minimize2 className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-indigo-400" />
                    )}
                    <span className="hidden sm:inline">{isFullScreen ? "Exit FS" : "Fullscreen"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: In-Session Chat or Attendees */}
          {activeTab === "chat" && (
            <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">Live Classroom Chat</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("video")}
                  className="text-slate-400 hover:text-white"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.isSelf ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">{msg.sender}</span>
                      <span>·</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] leading-relaxed ${
                        msg.isSelf
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="border-t border-slate-800 p-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message to audience…"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
                />
                <Button size="sm" type="submit" className="bg-indigo-600 text-white px-3">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </aside>
          )}
        </div>
      </WorkspaceDetailOverlay>

      {/* Dynamic Attendance Modal Triggered by Button */}
      {attendanceModalOpen && (
        <DynamicAttendanceModal
          open={attendanceModalOpen}
          onClose={() => setAttendanceModalOpen(false)}
          sessionId={session.id}
          sessionTitle={session.titleEn}
          userRole={userRole}
        />
      )}
    </>
  );
}
