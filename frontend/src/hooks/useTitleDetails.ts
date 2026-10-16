import { useEffect, useMemo, useState } from "react";
import { getMovieDetails, getTvDetails } from "../api/details";

const TMDB_IMG = "https://image.tmdb.org/t/p/";

const img = (path?: string | null, size: string = "w1280") =>
  path ? `${TMDB_IMG}${size}${path}` : null;

export type TmdbGenre = { id: number; name: string };
export type TmdbCollectionSummary = {
  id: number;
  name: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

export type TmdbMovie = {
  title?: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  runtime?: number;
  genres?: TmdbGenre[];
  belongs_to_collection?: TmdbCollectionSummary | null;
};

export type TmdbTvSeasonSummary = { id?: number; season_number: number; name?: string };

export type TmdbTv = {
  name?: string;
  overview?: string;
  first_air_date?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  number_of_seasons?: number;
  genres?: TmdbGenre[];
  seasons?: TmdbTvSeasonSummary[];
};

export type ErrorLike = { __error: true };

export function useTitleDetails(tmdbId: number, type?: string) {
  const isTv = type === "tv";
  const isMovie = type === "movie";

  const [data, setData] = useState<TmdbMovie | TmdbTv | ErrorLike | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setData(null);

      try {
        if (isMovie) {
          const m = (await getMovieDetails(tmdbId)) as TmdbMovie;
          if (!cancelled) setData(m);
          return;
        }

        if (isTv) {
          const tv = (await getTvDetails(tmdbId)) as TmdbTv;
          if (!cancelled) setData(tv);
          return;
        }

        if (!cancelled) setData({ __error: true });
      } catch {
        if (!cancelled) setData({ __error: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      setData({ __error: true });
      setLoading(false);
      return;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tmdbId, isMovie, isTv]);

  const isError = !!(data as ErrorLike | null)?.__error;

  const title = useMemo(() => {
    if (!data || isError) return "";
    return isMovie ? (data as TmdbMovie).title ?? "" : (data as TmdbTv).name ?? "";
  }, [data, isError, isMovie]);

  const tagline = useMemo(() => {
    if (!data || isError) return "";
    return isMovie ? (data as TmdbMovie).tagline ?? "" : (data as TmdbTv).overview ?? "";
  }, [data, isError, isMovie]);

  const year = useMemo(() => {
    if (!data || isError) return "";
    const y = isMovie
      ? ((data as TmdbMovie).release_date ?? "").slice(0, 4)
      : ((data as TmdbTv).first_air_date ?? "").slice(0, 4);
    return y;
  }, [data, isError, isMovie]);

  const genres = useMemo(() => {
    if (!data || isError) return [];
    return (((data as any).genres ?? []) as TmdbGenre[]).map((g) => g.name).filter(Boolean);
  }, [data, isError]);

  const posterUrl = useMemo(() => {
    if (!data || isError) return null;
    return img((data as any).poster_path, "w500");
  }, [data, isError]);

  const backdropUrl = useMemo(() => {
    if (!data || isError) return null;
    return img((data as any).backdrop_path, "w1920_and_h800_multi_faces");
  }, [data, isError]);

  const seasonOptions = useMemo(() => {
    if (!data || isError || !isTv) return [];
    const seasons = (((data as TmdbTv).seasons ?? []) as TmdbTvSeasonSummary[])
      .filter((s) => (s.season_number ?? 0) > 0)
      .map((s) => ({ id: s.id, season_number: s.season_number, name: s.name }));
    return seasons;
  }, [data, isError, isTv]);

  const initialSeasonNumber = useMemo(() => {
    if (!isTv || seasonOptions.length === 0) return 1;
    return seasonOptions.map((s) => s.season_number).sort((a, b) => a - b)[0] ?? 1;
  }, [isTv, seasonOptions]);

  const overview = useMemo(() => {
    if (!data || isError) return "";
    return (data as any).overview ?? "";
  }, [data, isError]);

  return {
    data,
    loading,
    isError,
    isTv,
    isMovie,

    title,
    tagline,
    year,
    overview,
    genres,

    posterUrl,
    backdropUrl,

    seasonOptions,
    initialSeasonNumber,
  };
}
