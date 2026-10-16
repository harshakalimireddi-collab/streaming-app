import { useEffect, useMemo, useRef, useState } from "react";
import { getTvSeason } from "../api/details";

export type TmdbEpisode = {
  id: number;
  name?: string;
  overview?: string;
  still_path?: string | null;
  episode_number: number;
  air_date?: string;
};

export type TmdbSeason = { episodes?: TmdbEpisode[] };
export type ErrorLike = { __error: true };

export function useSeasonEpisodes(params: {
  tmdbId: number;
  enabled: boolean; 
  seasonNumber: number;
}) {
  const { tmdbId, enabled, seasonNumber } = params;

  const [seasonData, setSeasonData] = useState<TmdbSeason | ErrorLike | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  const [seasonCache, setSeasonCache] = useState<Record<string, TmdbSeason | ErrorLike>>({});
  const cacheKey = `${tmdbId}:${seasonNumber}`;

  const cacheRef = useRef(seasonCache);
  useEffect(() => {
    cacheRef.current = seasonCache;
  }, [seasonCache]);

  useEffect(() => {
    setSeasonCache({});
    setSeasonData(null);
    setLoadingSeason(false);
  }, [tmdbId, enabled]);

  const ensureSeasonLoaded = async (sn: number) => {
    if (!enabled) return;
    const key = `${tmdbId}:${sn}`;
    if (cacheRef.current[key]) return;

    try {
      const s = (await getTvSeason(tmdbId, sn)) as TmdbSeason;
      setSeasonCache((prev) => (prev[key] ? prev : { ...prev, [key]: s }));
    } catch {
      setSeasonCache((prev) => (prev[key] ? prev : { ...prev, [key]: { __error: true } }));
    }
  };

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const cached = cacheRef.current[cacheKey];
    if (cached) {
      setSeasonData(cached);
      setLoadingSeason(false);
      return;
    }

    setLoadingSeason(true);

    (getTvSeason(tmdbId, seasonNumber) as Promise<TmdbSeason>)
      .then((s) => {
        if (cancelled) return;
        setSeasonData(s);
        setSeasonCache((prev) => ({ ...prev, [cacheKey]: s }));
      })
      .catch(() => {
        if (cancelled) return;
        const err = { __error: true } as ErrorLike;
        setSeasonData(err);
        setSeasonCache((prev) => ({ ...prev, [cacheKey]: err }));
      })
      .finally(() => {
        if (!cancelled) setLoadingSeason(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, enabled, tmdbId, seasonNumber]);

  const resetCache = () => {
    setSeasonCache({});
    setSeasonData(null);
    setLoadingSeason(false);
  };

  const currentEpisodes = useMemo(() => {
    const s = seasonData as any;
    return (s?.episodes ?? []) as TmdbEpisode[];
  }, [seasonData]);

  return {
    seasonData,
    currentEpisodes,
    loadingSeason,

    seasonCache,
    setSeasonCache,
    resetCache,

    ensureSeasonLoaded,
  };
}
