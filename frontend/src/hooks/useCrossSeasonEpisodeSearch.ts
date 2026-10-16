import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTvAllEpisodes } from "../api/details";

export type ErrorLike = { __error: true };

export type EpisodeResult = {
  id: number;
  season: number;
  episode: number;
  name?: string;
  overview?: string;
  air_date?: string | null;
  still?: string | null;
  runtime?: number | null;
};

type Progress = { loaded: number; total: number };

type TvAllEpisodesResponse = {
  tmdbId: number;
  tvId: number;
  episodes: EpisodeResult[];
  totalEpisodes: number;
  totalSeasons: number;
};

type TmdbSeasonEpisode = {
  id: number;
  name?: string;
  overview?: string;
  still_path?: string | null;
  episode_number: number;
  air_date?: string;
  runtime?: number | null;
};

type TmdbSeason = { episodes?: TmdbSeasonEpisode[] };

type SeasonCache = Record<string, TmdbSeason | ErrorLike>;

const TMDB_STILL_BASE_RE = /^https?:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)/i;

function toStillPath(stillUrl: string | null | undefined): string | null {
  if (!stillUrl) return null;
  const stripped = stillUrl.replace(TMDB_STILL_BASE_RE, "");
  if (!stripped || stripped === stillUrl) {
    return null;
  }
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

export function useCrossSeasonEpisodeSearch({
  tmdbId,
  enabled,
  seasonNumber,
  seasonData,
  episodeFilter,
  setSeasonCache,
}: {
  tmdbId: number;
  enabled: boolean;
  seasonNumber: number;
  seasonData: TmdbSeason | ErrorLike | null;
  episodeFilter: string;
  setSeasonCache?: Dispatch<SetStateAction<SeasonCache>>;
}) {
  const [searchingAll, setSearchingAll] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState<Progress>({
    loaded: 0,
    total: 0,
  });

  const [allEpisodes, setAllEpisodes] = useState<EpisodeResult[] | null>(null);
  const [loadError, setLoadError] = useState<ErrorLike | null>(null);

  const runIdRef = useRef(0);

  useEffect(() => {
    runIdRef.current += 1;
    setAllEpisodes(null);
    setLoadError(null);
    setSearchingAll(false);
    setPrefetchProgress({ loaded: 0, total: 0 });
  }, [tmdbId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!episodeFilter.trim()) return;
    if (allEpisodes || loadError) return;

    runIdRef.current += 1;
    const runId = runIdRef.current;
    let cancelled = false;

    setSearchingAll(true);
    setPrefetchProgress({ loaded: 0, total: 1 });

    (async () => {
      try {
        const data = (await getTvAllEpisodes(tmdbId)) as TvAllEpisodesResponse;
        if (cancelled || runIdRef.current !== runId) return;

        const eps = Array.isArray(data?.episodes) ? data.episodes : [];
        setAllEpisodes(eps);

        if (setSeasonCache && eps.length) {
          const bySeason: Record<number, TmdbSeasonEpisode[]> = {};

          for (const ep of eps) {
            const sn = ep.season;
            if (!sn || sn < 0) continue;
            (bySeason[sn] ??= []).push({
              id: ep.id,
              name: ep.name ?? "",
              overview: ep.overview ?? "",
              still_path: toStillPath(ep.still),
              episode_number: ep.episode,
              air_date: ep.air_date ?? undefined,
              runtime: ep.runtime ?? null,
            });
          }

          for (const sn of Object.keys(bySeason)) {
            bySeason[Number(sn)].sort((a, b) => a.episode_number - b.episode_number);
          }

          setSeasonCache((prev) => {
            let changed = false;
            const next: SeasonCache = { ...prev };

            for (const [snStr, episodes] of Object.entries(bySeason)) {
              const sn = Number(snStr);
              const key = `${tmdbId}:${sn}`;
              if (next[key]) continue;
              next[key] = { episodes };
              changed = true;
            }

            return changed ? next : prev;
          });
        }

        setPrefetchProgress({ loaded: 1, total: 1 });
      } catch {
        if (cancelled || runIdRef.current !== runId) return;
        setLoadError({ __error: true });
        setPrefetchProgress({ loaded: 1, total: 1 });
      } finally {
        if (cancelled || runIdRef.current !== runId) return;
        setSearchingAll(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, episodeFilter, tmdbId, allEpisodes, loadError, setSeasonCache]);

  const { episodes, isCrossSeason } = useMemo((): {
    episodes: EpisodeResult[];
    isCrossSeason: boolean;
  } => {
    if (!enabled) return { episodes: [], isCrossSeason: false };

    const q = episodeFilter.trim().toLowerCase();

    if (!q) {
      const s = seasonData as TmdbSeason | ErrorLike | null;
      const eps = ((s as any)?.episodes ?? []) as TmdbSeasonEpisode[];

      const mapped = eps.map((ep) => ({
        id: ep.id,
        season: seasonNumber,
        episode: ep.episode_number,
        name: ep.name ?? "",
        overview: ep.overview ?? "",
        air_date: ep.air_date ?? null,
        still: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null,
        runtime: ep.runtime ?? null,
      }));

      return { episodes: mapped, isCrossSeason: false };
    }

    const eps = allEpisodes ?? [];

    const filtered = eps.filter((ep) => {
      const s = `s${ep.season}`.toLowerCase();
      const n = `e${ep.episode}`.toLowerCase();
      const se = `${s}${n}`;
      const name = (ep.name ?? "").toLowerCase();
      return se.includes(q) || s.includes(q) || n.includes(q) || name.includes(q);
    });

    return { episodes: filtered, isCrossSeason: true };
  }, [enabled, episodeFilter, seasonData, seasonNumber, allEpisodes]);

  useEffect(() => {
    if (!enabled) return;

    if (!episodeFilter.trim()) {
      setSearchingAll(false);
      setPrefetchProgress((p) => (p.total ? p : { loaded: 0, total: 0 }));
    } else if (!allEpisodes && !loadError) {
      setSearchingAll(true);
      setPrefetchProgress((p) => (p.total ? p : { loaded: 0, total: 1 }));
    }
  }, [episodeFilter, enabled, allEpisodes, loadError]);

  return { episodes, isCrossSeason, searchingAll, prefetchProgress };
}
