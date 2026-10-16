import { useEffect, useMemo, useState } from "react";
import { getTitleImages } from "../api/tmdb";
import type { TmdbMovie, TmdbTv } from "./useTitleDetails";

type CastPerson = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
};

function pickBestTrailer(videos: any[]) {
  const yt = (videos ?? []).filter((v) => v?.site === "YouTube" && v?.key);
  return (
    yt.find((v) => v.type === "Trailer" && v.official) ||
    yt.find((v) => v.type === "Trailer") ||
    yt[0] || null
  );
}

export function useTitleMeta(data: any, isMovie: boolean, isTv: boolean, tmdbId: number, type: string | undefined) {
  const runtime = isMovie ? (data as TmdbMovie | null)?.runtime : undefined;
  const numberOfSeasons = isTv ? (data as TmdbTv | null)?.number_of_seasons : undefined;

  const rating = typeof data?.vote_average === "number" && data.vote_average > 0
    ? data.vote_average.toFixed(1) : null;

  const trailer = useMemo(() => pickBestTrailer(data?.videos?.results ?? []), [data]);

  const trailerEmbedUrl = useMemo(() => trailer?.key
    ? `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${trailer.key}&modestbranding=1&iv_load_policy=3`
    : null, [trailer]);

  const trailerModalUrl = useMemo(() => trailer?.key
    ? `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1&modestbranding=1`
    : null, [trailer]);

  const fullCast = useMemo(() => {
    const raw = (data?.credits?.cast ?? []) as CastPerson[];
    return raw.slice().sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }, [data]);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!tmdbId || !type || (type !== "movie" && type !== "tv")) return;
    getTitleImages(type, tmdbId)
      .then(d => setLogoUrl(d.logoUrl))
      .catch(() => {});
  }, [tmdbId, type]);

  return { runtime, numberOfSeasons, rating, trailer, trailerEmbedUrl, trailerModalUrl, fullCast, logoUrl };
}