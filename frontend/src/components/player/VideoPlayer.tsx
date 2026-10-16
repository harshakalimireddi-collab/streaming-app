import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildStreamEmbedUrl,
  STREAM_SERVERS,
  isTrustedFrameXEvent,
  parseTmdbId,
  saveWatchProgressLocal,
  saveWatchProgressBackend,
  sendFrameXAction,
  getWatchProgressLocal,
  type WatchProgressRecord,
} from "../../utils/framex";

export interface VideoPlayerProps {
  tmdbId: number;
  type?: "movie" | "tv";
  season?: number;
  episode?: number;
  title?: string;
  episodeTitle?: string;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  tmdbId,
  type = "movie",
  season,
  episode,
  title,
  episodeTitle,
  onNextEpisode,
  onPrevEpisode,
  hasNextEpisode,
  hasPrevEpisode,
  className = "",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [iframeState, setIframeState] = useState<"loading" | "loaded" | "error">("loading");
  const [streamConfirmed, setStreamConfirmed] = useState(false);
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>(STREAM_SERVERS[0].id);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showOverlayControls, setShowOverlayControls] = useState(false);

  // Playback telemetry (only from providers that support postMessage)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(1);

  // Auto-fallback tracking
  const autoFallbackAttempted = useRef(false);

  const validTmdbId = useMemo(() => {
    try {
      return parseTmdbId(tmdbId);
    } catch {
      return null;
    }
  }, [tmdbId]);

  // Build iframe src from current server selection
  const embedUrl = useMemo(() => {
    if (!validTmdbId) return "";
    return buildStreamEmbedUrl({
      tmdbId: validTmdbId,
      type,
      season: type === "tv" ? season : undefined,
      episode: type === "tv" ? episode : undefined,
      serverId: selectedServer,
    });
  }, [validTmdbId, type, season, episode, selectedServer]);

  const activeServerInfo = useMemo(
    () => STREAM_SERVERS.find((s) => s.id === selectedServer) ?? STREAM_SERVERS[0],
    [selectedServer]
  );

  /* ── Fullscreen ──────────────────────────────────────────────── */
  useEffect(() => {
    const handler = () => {
      const doc = document as any;
      setIsFullscreen(
        Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement)
      );
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    const elem = containerRef.current as any;
    const doc = document as any;
    if (!isFullscreen) {
      (elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen)?.call(elem)?.catch?.(() => {});
    } else {
      (doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen)?.call(doc)?.catch?.(() => {});
    }
  }, [isFullscreen]);

  /* ── Reset state on content change ───────────────────────────── */
  useEffect(() => {
    setIframeState("loading");
    setStreamConfirmed(false);
    setShowServerPicker(false);
    setLoadError(null);
    setCurrentTime(0);
    setDuration(0);
    autoFallbackAttempted.current = false;

    if (validTmdbId) {
      const saved = getWatchProgressLocal(validTmdbId, type, season, episode);
      if (saved && saved.currentTime > 0) {
        setCurrentTime(saved.currentTime);
        setDuration(saved.duration);
      }
    }
  }, [validTmdbId, type, season, episode, retryKey]);

  /* ── postMessage telemetry from frameXTV ─────────────────────── */
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!isTrustedFrameXEvent(event)) return;
      const { data } = event;
      if (data.event === "frameXTV:ready") {
        setIframeState("loaded");
        setStreamConfirmed(true);
        setShowServerPicker(false);
        setLoadError(null);
      } else if (data.event === "frameXTV:timeupdate") {
        setIframeState("loaded");
        setStreamConfirmed(true);
        setShowServerPicker(false);
        if (typeof data.currentTime === "number") setCurrentTime(data.currentTime);
        if (typeof data.duration === "number" && data.duration > 0) setDuration(data.duration);

        if (validTmdbId && typeof data.currentTime === "number" && data.currentTime > 0) {
          const dur = typeof data.duration === "number" && data.duration > 0 ? data.duration : 0;
          const record: WatchProgressRecord = {
            tmdbId: validTmdbId,
            type,
            season,
            episode,
            currentTime: data.currentTime,
            duration: dur,
            percentage: dur > 0 ? Math.min(100, (data.currentTime / dur) * 100) : 0,
            updatedAt: Date.now(),
          };
          saveWatchProgressLocal(record);
          saveWatchProgressBackend(record);
        }
      } else if (data.event === "frameXTV:ended") {
        if (hasNextEpisode && onNextEpisode) onNextEpisode();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [validTmdbId, type, season, episode, hasNextEpisode, onNextEpisode]);

  /* ── Auto-show server picker after timeout ───────────────────── */
  useEffect(() => {
    if (iframeState !== "loading") return;
    const timer = setTimeout(() => {
      setIframeState("loaded"); // Assume iframe loaded even if no postMessage confirmation
    }, 6000);
    return () => clearTimeout(timer);
  }, [iframeState, retryKey]);

  // Show server picker suggestion after iframe loads but no stream confirmed
  useEffect(() => {
    if (iframeState !== "loaded" || streamConfirmed) return;
    const timer = setTimeout(() => {
      if (!streamConfirmed) {
        setShowServerPicker(true);
        // Auto-try next server if this is the first attempt
        if (!autoFallbackAttempted.current) {
          autoFallbackAttempted.current = true;
          // Don't auto-switch — just show the picker
        }
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, [iframeState, streamConfirmed, retryKey]);

  /* ── Control handlers (postMessage) ──────────────────────────── */
  const handleTogglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    sendFrameXAction(iframeRef.current, { action: next ? "play" : "pause" });
  };

  const handleSeekBy = (seconds: number) => {
    sendFrameXAction(iframeRef.current, { action: "seekBy", seconds });
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    sendFrameXAction(iframeRef.current, { action: "seek", time: newTime });
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sendFrameXAction(iframeRef.current, { action: next ? "mute" : "unmute" });
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (clamped === 0) {
      setIsMuted(true);
      sendFrameXAction(iframeRef.current, { action: "mute" });
    } else {
      setIsMuted(false);
      sendFrameXAction(iframeRef.current, { action: "setVolume", volume: clamped });
    }
  };

  const handleServerSelect = (serverId: string) => {
    setSelectedServer(serverId);
    setIframeState("loading");
    setStreamConfirmed(false);
    setShowServerPicker(false);
    setLoadError(null);
    autoFallbackAttempted.current = false;
    setRetryKey((k) => k + 1);
  };

  const handleRetry = () => {
    setIframeState("loading");
    setStreamConfirmed(false);
    setShowServerPicker(false);
    setLoadError(null);
    autoFallbackAttempted.current = false;
    setRetryKey((k) => k + 1);
  };

  /* ── Autohide controls on inactivity ─────────────────────────── */
  useEffect(() => {
    let hideTimer: any;
    const handleActivity = () => {
      setControlsVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setControlsVisible(false), 4500);
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleActivity);
      container.addEventListener("touchstart", handleActivity);
    }
    return () => {
      clearTimeout(hideTimer);
      if (container) {
        container.removeEventListener("mousemove", handleActivity);
        container.removeEventListener("touchstart", handleActivity);
      }
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  /* ── Invalid TMDB ID state ───────────────────────────────────── */
  if (!validTmdbId) {
    return (
      <div
        className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-red-500/30 flex flex-col items-center justify-center p-6 text-center text-white ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-3 text-lg font-bold">
          !
        </div>
        <h3 className="font-bold text-base mb-1">Invalid TMDB ID</h3>
        <p className="text-xs text-zinc-400 max-w-md mb-4">
          The player requires a valid numeric TMDB ID. Ensure you are not passing an IMDb ID (e.g. tt1234567).
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 group select-none ${
        isFullscreen ? "fixed inset-0 z-[99999] aspect-auto rounded-none border-0 w-screen h-screen" : ""
      } ${className}`}
    >
      {/* ── The Embed iframe ─────────────────────────────────────── */}
      {embedUrl && (
        <iframe
          key={`${selectedServer}-${embedUrl}-${retryKey}`}
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full border-0 bg-black"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
          allowFullScreen
          title={
            title
              ? `Watching ${title}${episodeTitle ? ` - ${episodeTitle}` : ""}`
              : "Stream Player"
          }
          style={{ pointerEvents: showOverlayControls ? "none" : "auto" }}
          onLoad={() => {
            setIframeState("loaded");
          }}
          onError={() => {
            setLoadError("Failed to load stream from this server.");
            setIframeState("error");
          }}
        />
      )}

      {/* ── Loading Overlay ──────────────────────────────────────── */}
      {iframeState === "loading" && !loadError && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center z-30 transition-opacity duration-300">
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-[#e50914] animate-spin" />
            <div className="absolute w-6 h-6 rounded-full bg-[#e50914]/20 animate-pulse" />
          </div>
          <div className="text-sm font-bold text-white tracking-wide">
            Connecting to {activeServerInfo.label}…
          </div>
          <div className="text-xs text-zinc-400 mt-1 max-w-xs text-center px-4">
            {type === "tv" && season && episode
              ? `Season ${season} • Episode ${episode}${episodeTitle ? ` — ${episodeTitle}` : ""}`
              : title || "Loading stream"}
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => setShowServerPicker(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#e50914] hover:bg-[#b80710] text-xs font-semibold text-white transition-colors cursor-pointer shadow-md"
            >
              Switch Server ⚡
            </button>
          </div>
        </div>
      )}

      {/* ── Server Picker / Black Screen Advisory ────────────────── */}
      {showServerPicker && !streamConfirmed && !loadError && (
        <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 bg-zinc-950/95 border border-amber-500/40 rounded-xl p-3 sm:p-4 backdrop-blur-md shadow-2xl z-40 animate-fadeIn">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
            <p className="text-xs text-amber-200 font-semibold">
              Black screen? Switch to another server:
            </p>
            <button
              type="button"
              onClick={() => setShowServerPicker(false)}
              className="ml-auto text-zinc-500 hover:text-white p-1 text-xs cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STREAM_SERVERS.map((server) => (
              <button
                key={server.id}
                type="button"
                onClick={() => handleServerSelect(server.id)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                  selectedServer === server.id
                    ? "bg-[#e50914] text-white ring-1 ring-[#e50914] shadow-md"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/10"
                }`}
              >
                {server.label}
                {selectedServer === server.id && (
                  <span className="block text-[10px] font-normal text-white/70 mt-0.5">Active</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Reload Current
            </button>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-all"
              title="Open stream in a new tab"
            >
              Open Direct ↗
            </a>
          </div>
        </div>
      )}

      {/* ── Error & Retry State ──────────────────────────────────── */}
      {loadError && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-3 text-lg font-bold">
            ✕
          </div>
          <h3 className="font-bold text-white text-base mb-1">Stream Server Error</h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-4">
            {loadError} Try switching to another streaming server below.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md mb-4">
            {STREAM_SERVERS.filter((s) => s.id !== selectedServer)
              .slice(0, 3)
              .map((server) => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => handleServerSelect(server.id)}
                  className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-[#e50914] text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-white/10"
                >
                  {server.label}
                </button>
              ))}
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Retry Current Server
          </button>
        </div>
      )}

      {/* ── Top-right quick controls ─────────────────────────────── */}
      <div
        className={`absolute top-3 right-3 z-20 flex items-center gap-2 transition-opacity duration-300 ${
          controlsVisible && !showServerPicker ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setShowOverlayControls((v) => !v)}
          className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          title={showOverlayControls ? "Enable native player controls" : "Enable custom overlay controls"}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${showOverlayControls ? "bg-[#e50914]" : "bg-emerald-400"}`} />
          <span>{showOverlayControls ? "Overlay" : "Native"}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowServerPicker((v) => !v)}
          className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          title="Switch streaming server"
        >
          <span>🔄</span>
          <span>Server</span>
        </button>
        <button
          type="button"
          onClick={handleRetry}
          title="Reload Player"
          className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      </div>

      {/* ── Custom Controller Bar (postMessage API) ──────────────── */}
      {showOverlayControls && (
        <div
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 z-10 transition-opacity duration-300 pointer-events-none ${
            controlsVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Progress Bar */}
          {duration > 0 && (
            <div className="mb-2 pointer-events-auto">
              <div className="relative w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="h-full bg-[#e50914] rounded-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={1}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Seek"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Action Controls Row */}
          <div className="flex items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={handleTogglePlay}
                title={isPlaying ? "Pause" : "Play"}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Seek -10s */}
              <button
                type="button"
                onClick={() => handleSeekBy(-10)}
                title="Rewind 10s"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors text-xs font-semibold cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <text x="12" y="16" fontSize="7" fill="currentColor" textAnchor="middle" fontWeight="bold">10</text>
                </svg>
              </button>

              {/* Seek +10s */}
              <button
                type="button"
                onClick={() => handleSeekBy(10)}
                title="Fast Forward 10s"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors text-xs font-semibold cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <text x="12" y="16" fontSize="7" fill="currentColor" textAnchor="middle" fontWeight="bold">10</text>
                </svg>
              </button>

              {/* Prev / Next Episode for TV */}
              {type === "tv" && (
                <>
                  {hasPrevEpisode && onPrevEpisode && (
                    <button
                      type="button"
                      onClick={onPrevEpisode}
                      title="Previous Episode"
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </button>
                  )}
                  {hasNextEpisode && onNextEpisode && (
                    <button
                      type="button"
                      onClick={onNextEpisode}
                      title="Next Episode"
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  )}
                </>
              )}

              {/* Volume */}
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16 sm:w-20 accent-[#e50914] cursor-pointer hidden sm:block"
                  title="Volume"
                />
              </div>
            </div>

            {/* Right: Server Selector + Fullscreen */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <select
                value={selectedServer}
                onChange={(e) => handleServerSelect(e.target.value)}
                className="bg-black/80 hover:bg-black text-zinc-200 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 border border-white/20 outline-none cursor-pointer focus:border-[#e50914] transition-colors"
                title="Change Streaming Server"
              >
                {STREAM_SERVERS.map((server) => (
                  <option key={server.id} value={server.id} className="bg-zinc-900 text-white">
                    {server.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleRetry}
                title="Reload Stream"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors text-zinc-300 hover:text-white cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors text-zinc-300 hover:text-white cursor-pointer"
              >
                {isFullscreen ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Server: {activeServerInfo.label}</span>
            <span>Toggle "Native" mode to use built-in player controls</span>
          </div>
        </div>
      )}
    </div>
  );
}
