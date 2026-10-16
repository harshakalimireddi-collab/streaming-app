/**
 * Multi-source streaming embed URL builder with automatic fallback.
 *
 * Providers are ordered by reliability. When one source returns a black screen
 * or fails to load, the player can instantly switch to the next.
 */

/* ------------------------------------------------------------------ */
/*  TMDB ID validation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validates and normalizes a TMDB ID.
 * TMDB IDs are positive integers (e.g. 550, 1399).
 * Rejects IMDb strings like "tt0137523" to prevent confusion.
 */
export function parseTmdbId(tmdbIdRaw: unknown): number {
  if (typeof tmdbIdRaw === "string" && tmdbIdRaw.toLowerCase().startsWith("tt")) {
    throw new Error(`Expected a TMDB numeric ID, but received IMDb ID "${tmdbIdRaw}". Please use TMDB ID.`);
  }
  const idNum = Number(tmdbIdRaw);
  if (!Number.isFinite(idNum) || !Number.isInteger(idNum) || idNum <= 0) {
    throw new Error(`Invalid TMDB ID: ${String(tmdbIdRaw)}. Must be a positive integer.`);
  }
  return idNum;
}

/* ------------------------------------------------------------------ */
/*  Stream server definitions                                          */
/* ------------------------------------------------------------------ */

export interface StreamServerOption {
  id: string;
  label: string;
  buildUrl: (opts: EmbedUrlOpts) => string;
}

interface EmbedUrlOpts {
  tmdbId: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

/**
 * All available streaming embed servers.
 * Each builds its own iframe src URL for the given TMDB ID.
 * Ordered by reliability — the first one that works wins.
 */
export const STREAM_SERVERS: StreamServerOption[] = [
  /* ── 1. VidSrc PM (Primary & Fast) ────────────────────────────────── */
  {
    id: "vidsrc-pm",
    label: "🔥 Server 1 (VidSrc Ultra)",
    buildUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv" && season && episode
        ? `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.pm/embed/movie/${tmdbId}`,
  },

  /* ── 2. VidSrc TO (High Reliability) ──────────────────────────────── */
  {
    id: "vidsrc-to",
    label: "⚡ Server 2 (VidSrc Stream)",
    buildUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv" && season && episode
        ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${tmdbId}`,
  },

  /* ── 3. 2Embed (Fast Mirror) ───────────────────────────────────────── */
  {
    id: "2embed-org",
    label: "🎬 Server 3 (2Embed Pro)",
    buildUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv" && season && episode
        ? `https://2embed.org/embed/${tmdbId}/${season}/${episode}`
        : `https://2embed.org/embed/${tmdbId}`,
  },

  /* ── 4. VidSrc Net ─────────────────────────────────────────────────── */
  {
    id: "vidsrc-net",
    label: "📡 Server 4 (VidSrc Net)",
    buildUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv" && season && episode
        ? `https://vidsrc.net/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.net/embed/movie/${tmdbId}`,
  },

  /* ── 5. MultiEmbed ─────────────────────────────────────────────────── */
  {
    id: "multiembed",
    label: "🎥 Server 5 (SuperEmbed)",
    buildUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv" && season && episode
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
  },

  /* ── 6. FrameX Direct ──────────────────────────────────────────────── */
  {
    id: "framex-direct",
    label: "🌐 Server 6 (FrameX Direct)",
    buildUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv" && season && episode
        ? `https://framextv.xyz/embed/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://framextv.xyz/embed/${tmdbId}?autoplay=1`,
  },
];

/* ------------------------------------------------------------------ */
/*  URL builder                                                        */
/* ------------------------------------------------------------------ */

export interface BuildStreamUrlOpts {
  tmdbId: number | string;
  type?: "movie" | "tv";
  season?: number;
  episode?: number;
  serverId?: string;
}

/**
 * Builds the iframe embed URL for the given server / fallback.
 */
export function buildStreamEmbedUrl({
  tmdbId,
  type = "movie",
  season,
  episode,
  serverId = "vidsrc-pm",
}: BuildStreamUrlOpts): string {
  const validId = parseTmdbId(tmdbId);
  const server = STREAM_SERVERS.find((s) => s.id === serverId) ?? STREAM_SERVERS[0];
  return server.buildUrl({ tmdbId: validId, type, season, episode });
}

/* ------------------------------------------------------------------ */
/*  Watch Progress helpers (localStorage)                              */
/* ------------------------------------------------------------------ */

export interface WatchProgressRecord {
  tmdbId: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: number;
}

const PROGRESS_KEY = "cinevault_progress_";

function progressKey(
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): string {
  if (type === "tv" && season && episode) {
    return `${PROGRESS_KEY}tv_${tmdbId}_s${season}_e${episode}`;
  }
  return `${PROGRESS_KEY}${type}_${tmdbId}`;
}

export function saveWatchProgressLocal(record: WatchProgressRecord): void {
  try {
    localStorage.setItem(
      progressKey(record.tmdbId, record.type, record.season, record.episode),
      JSON.stringify(record)
    );
  } catch {
    // Silently ignore localStorage quota
  }
}

export function getWatchProgressLocal(
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): WatchProgressRecord | null {
  try {
    const raw = localStorage.getItem(progressKey(tmdbId, type, season, episode));
    return raw ? (JSON.parse(raw) as WatchProgressRecord) : null;
  } catch {
    return null;
  }
}

export async function saveWatchProgressBackend(
  _record: WatchProgressRecord
): Promise<boolean> {
  // Placeholder for future backend integration
  return false;
}

/* ------------------------------------------------------------------ */
/*  postMessage API types (for providers that support it)              */
/* ------------------------------------------------------------------ */

export const FRAMEX_ORIGIN = "https://framextv.xyz";

export type FrameXAction =
  | { action: "play" }
  | { action: "pause" }
  | { action: "togglePlay" }
  | { action: "seek"; time: number }
  | { action: "seekBy"; seconds: number }
  | { action: "setVolume"; volume: number }
  | { action: "mute" }
  | { action: "unmute" }
  | { action: "setProvider"; provider: string }
  | { action: "setSubtitle"; index: number }
  | { action: "setSpeed"; speed: number };

export function sendFrameXAction(
  iframe: HTMLIFrameElement | null,
  action: FrameXAction
): boolean {
  if (!iframe || !iframe.contentWindow) return false;
  try {
    iframe.contentWindow.postMessage(action, "*");
    return true;
  } catch {
    return false;
  }
}

export interface FrameXTimeUpdateEvent {
  event: "frameXTV:timeupdate";
  currentTime: number;
  duration: number;
}

export interface FrameXReadyEvent {
  event: "frameXTV:ready";
}

export interface FrameXEndedEvent {
  event: "frameXTV:ended";
}

export interface FrameXAutoplayPreferenceEvent {
  event: "frameXTV:autoplay_preference";
  enabled: boolean;
}

export type FrameXIncomingEvent =
  | FrameXTimeUpdateEvent
  | FrameXReadyEvent
  | FrameXEndedEvent
  | FrameXAutoplayPreferenceEvent;

export function isTrustedFrameXEvent(
  event: MessageEvent
): event is MessageEvent<FrameXIncomingEvent> {
  const data = event.data;
  if (!data || typeof data !== "object") return false;
  const evtName = (data as { event?: unknown }).event;
  return typeof evtName === "string" && evtName.startsWith("frameXTV:");
}
