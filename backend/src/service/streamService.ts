import ServiceError from "../core/ServiceError";

const rawStreamSource = process.env.STREAM_SOURCE;
if (!rawStreamSource) {
  throw new Error("STREAM_SOURCE environment variable is not set");
}
const STREAM_SOURCE = rawStreamSource.replace(/\/+$/, "");

function parsePosInt(raw: unknown, field: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw ServiceError.validationFailed(`${field} must be a positive integer`);
  }
  return n;
}

function buildUrl(path: string) {
  const url = new URL(STREAM_SOURCE + path);
  return url.toString();
}

export async function getMovieStreamUrl(tmdbIdRaw: unknown) {
  const tmdbId = parsePosInt(tmdbIdRaw, "tmdbId");

  // frameXTV embed URL format: https://framextv.xyz/embed/{tmdbId}?autoplay=1
  if (STREAM_SOURCE.includes("framextv")) {
    return { url: buildUrl(`/embed/${tmdbId}?autoplay=1`) };
  }

  return { url: buildUrl(`/embed/movie/${tmdbId}`) };
}

export async function getTvStreamUrl(
  tmdbIdRaw: unknown,
  seasonRaw: unknown,
  episodeRaw: unknown,
) {
  const tmdbId = parsePosInt(tmdbIdRaw, "tmdbId");
  const season = parsePosInt(seasonRaw, "season");
  const episode = parsePosInt(episodeRaw, "episode");

  // frameXTV embed URL format: https://framextv.xyz/embed/{tmdbId}/{season}/{episode}?autoplay=1
  if (STREAM_SOURCE.includes("framextv")) {
    return { url: buildUrl(`/embed/${tmdbId}/${season}/${episode}?autoplay=1`) };
  }

  return { url: buildUrl(`/embed/tv/${tmdbId}/${season}/${episode}`) };
}
