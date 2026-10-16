import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, StarIcon } from "../components/ui/Icons";
import { useTitleDetails } from "../hooks/useTitleDetails";
import { useTitleMeta } from "../hooks/useTitleMeta";
import { useSeasonEpisodes, type TmdbEpisode, type TmdbSeason } from "../hooks/useSeasonEpisodes";
import { SeasonDropdown } from "../components/ui/SeasonDropdown";
import { VideoPlayer } from "../components/player/VideoPlayer";

const TMDB_IMG = "https://image.tmdb.org/t/p/";
const getThumb = (path?: string | null) => (path ? `${TMDB_IMG}w500${path}` : null);

export default function PlayerPage() {
  const nav = useNavigate();
  const params = useParams();

  const id = params.id ? Number(params.id) : NaN;
  const paramSeason = params.season ? Number(params.season) : NaN;
  const paramEpisode = params.episode ? Number(params.episode) : NaN;

  // Determine playback type: "tv" or "movie"
  const playbackType = useMemo(() => {
    if (Number.isFinite(paramSeason) && Number.isFinite(paramEpisode)) return "tv";
    if (params.type === "tv" || params.type === "movie") return params.type;
    return "movie";
  }, [params.type, paramSeason, paramEpisode]);

  const isTv = playbackType === "tv";

  // Active season and episode state
  const [selectedSeason, setSelectedSeason] = useState<number>(
    Number.isFinite(paramSeason) && paramSeason > 0 ? paramSeason : 1
  );
  const [selectedEpisode, setSelectedEpisode] = useState<number>(
    Number.isFinite(paramEpisode) && paramEpisode > 0 ? paramEpisode : 1
  );

  // Sync state when URL params change during render
  const [prevParams, setPrevParams] = useState({ season: paramSeason, episode: paramEpisode });
  if (paramSeason !== prevParams.season || paramEpisode !== prevParams.episode) {
    setPrevParams({ season: paramSeason, episode: paramEpisode });
    if (Number.isFinite(paramSeason) && paramSeason > 0) {
      setSelectedSeason(paramSeason);
    }
    if (Number.isFinite(paramEpisode) && paramEpisode > 0) {
      setSelectedEpisode(paramEpisode);
    }
  }

  // Fetch title details
  const {
    data,
    title,
    year,
    overview,
    genres,
    posterUrl,
    seasonOptions,
    loading: titleLoading,
    isError,
  } = useTitleDetails(Number.isFinite(id) ? id : NaN, playbackType);

  const { rating } = useTitleMeta(data, !isTv, isTv, id, playbackType);

  // Fetch TV episodes for currently selected season
  const { seasonData, loadingSeason } = useSeasonEpisodes({
    tmdbId: Number.isFinite(id) ? id : NaN,
    enabled: isTv && !isError,
    seasonNumber: selectedSeason,
  });

  const episodes: TmdbEpisode[] = useMemo(() => {
    if (!seasonData || (seasonData as { __error?: boolean }).__error) return [];
    const s = seasonData as TmdbSeason;
    return Array.isArray(s.episodes) ? s.episodes : [];
  }, [seasonData]);

  // Find currently active episode info
  const currentEpInfo: TmdbEpisode | null = useMemo(() => {
    if (!isTv) return null;
    return episodes.find((e: TmdbEpisode) => e.episode_number === selectedEpisode) ?? null;
  }, [isTv, episodes, selectedEpisode]);

  // Next / Previous episode calculation
  const currentEpIndex = useMemo(() => {
    return episodes.findIndex((e: TmdbEpisode) => e.episode_number === selectedEpisode);
  }, [episodes, selectedEpisode]);

  const hasNextEpisode = isTv && currentEpIndex >= 0 && currentEpIndex < episodes.length - 1;
  const hasPrevEpisode = isTv && currentEpIndex > 0;

  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      const nextEp = episodes[currentEpIndex + 1];
      if (nextEp) {
        setSelectedEpisode(nextEp.episode_number);
        nav(`/play/tv/${id}/${selectedSeason}/${nextEp.episode_number}`, { replace: true });
      }
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrevEpisode) {
      const prevEp = episodes[currentEpIndex - 1];
      if (prevEp) {
        setSelectedEpisode(prevEp.episode_number);
        nav(`/play/tv/${id}/${selectedSeason}/${prevEp.episode_number}`, { replace: true });
      }
    }
  };

  const handleSelectEpisode = (epNum: number) => {
    setSelectedEpisode(epNum);
    nav(`/play/tv/${id}/${selectedSeason}/${epNum}`, { replace: true });
  };

  const handleSeasonChange = (nextSeason: number) => {
    setSelectedSeason(nextSeason);
    setSelectedEpisode(1);
    nav(`/play/tv/${id}/${nextSeason}/1`, { replace: true });
  };

  // Dynamic document title
  useEffect(() => {
    if (!title) {
      document.title = "CineVault Player";
      return;
    }
    if (isTv) {
      const s = String(selectedSeason).padStart(2, "0");
      const e = String(selectedEpisode).padStart(2, "0");
      document.title = `Watching: ${title} • S${s}E${e} — CineVault`;
      return;
    }
    document.title = `Watching: ${title} — CineVault`;
    return () => {
      document.title = "CineVault";
    };
  }, [title, isTv, selectedSeason, selectedEpisode]);

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col selection:bg-[#e50914] selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#070709]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => nav(-1)}
            aria-label="Go Back"
            className="w-9 h-9 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-full text-white transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="min-w-0">
            {/* Breadcrumb row */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
              <Link to="/" className="hover:text-white transition-colors">
                Discover
              </Link>
              <span>/</span>
              <Link
                to={`/title/${playbackType}/${id}`}
                className="hover:text-white transition-colors truncate max-w-[140px] sm:max-w-xs"
              >
                {title || (titleLoading ? "Loading…" : "Title")}
              </Link>
              {isTv && (
                <>
                  <span>/</span>
                  <span className="text-[#e50914] font-bold">
                    S{selectedSeason} E{selectedEpisode}
                  </span>
                </>
              )}
            </div>

            {/* Title & Episode name */}
            <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-sm sm:max-w-md">
              {title}
              {isTv && currentEpInfo?.name && (
                <span className="font-normal text-zinc-400 ml-2 text-xs">
                  — {currentEpInfo.name}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Right Action: Title Details link */}
        <div className="flex items-center gap-3">
          <Link
            to={`/title/${playbackType}/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            <span>Overview & Cast ↗</span>
          </Link>
        </div>
      </header>

      {/* Main Theater Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* 16:9 Video Player Container with ambient glow */}
        <section className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/10">
          <VideoPlayer
            tmdbId={id}
            type={playbackType}
            season={isTv ? selectedSeason : undefined}
            episode={isTv ? selectedEpisode : undefined}
            title={title}
            episodeTitle={currentEpInfo?.name}
            hasNextEpisode={hasNextEpisode}
            hasPrevEpisode={hasPrevEpisode}
            onNextEpisode={handleNextEpisode}
            onPrevEpisode={handlePrevEpisode}
            className="w-full"
          />
        </section>

        {/* Player Navigation & Metadata Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#0e0e14] border border-white/[0.06]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              {rating && (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <StarIcon size={12} />
                  {rating}
                </span>
              )}
              {year && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{year}</span>
                </>
              )}
              <span className="text-zinc-600">•</span>
              <span className="uppercase text-[10px] font-bold text-zinc-300 tracking-wider">
                {isTv ? "TV Series" : "Feature Film"}
              </span>
              {genres && genres.length > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">{genres.slice(0, 2).join(", ")}</span>
                </>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
              {title}
            </h2>

            {isTv && currentEpInfo && (
              <p className="text-xs text-[#e50914] font-semibold mt-0.5">
                Season {selectedSeason}, Episode {selectedEpisode}: {currentEpInfo.name || `Episode ${selectedEpisode}`}
              </p>
            )}
          </div>

          {/* TV Next/Prev Controls */}
          {isTv && (
            <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
              <button
                type="button"
                disabled={!hasPrevEpisode}
                onClick={handlePrevEpisode}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
              >
                <span>← Prev Episode</span>
              </button>
              <button
                type="button"
                disabled={!hasNextEpisode}
                onClick={handleNextEpisode}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-[#e50914] hover:bg-[#b80710] text-white shadow-md shadow-[#e50914]/25"
              >
                <span>Next Episode →</span>
              </button>
            </div>
          )}
        </div>

        {/* Synopsis Accordion / Card */}
        {overview && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0e0e14] border border-white/[0.06] flex flex-col sm:flex-row gap-5 items-start">
            {posterUrl && (
              <img
                src={posterUrl}
                alt={title}
                className="w-20 sm:w-24 aspect-[2/3] object-cover rounded-xl border border-white/10 shadow-lg flex-shrink-0 hidden sm:block"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Synopsis
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                {isTv && currentEpInfo?.overview ? currentEpInfo.overview : overview}
              </p>
            </div>
          </div>
        )}

        {/* TV Episode Selector Drawer */}
        {isTv && (
          <section className="space-y-4 pt-4 border-t border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-4 rounded-full bg-[#e50914]" />
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Episodes in Season {selectedSeason}
                </h3>
              </div>

              {seasonOptions && seasonOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Season:</span>
                  <SeasonDropdown
                    seasons={seasonOptions}
                    value={selectedSeason}
                    onChange={handleSeasonChange}
                  />
                </div>
              )}
            </div>

            {loadingSeason ? (
              <div className="py-12 flex items-center justify-center gap-3 text-xs text-zinc-400">
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-[#e50914] rounded-full animate-spin" />
                <span>Loading season {selectedSeason} episodes…</span>
              </div>
            ) : episodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {episodes.map((ep: TmdbEpisode) => {
                  const isActive = ep.episode_number === selectedEpisode;
                  const thumb = getThumb(ep.still_path) || posterUrl;

                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => handleSelectEpisode(ep.episode_number)}
                      className={`text-left rounded-2xl overflow-hidden border p-2.5 transition-all flex flex-col group/ep cursor-pointer ${
                        isActive
                          ? "bg-[#181824] border-[#e50914] shadow-lg shadow-[#e50914]/15 ring-1 ring-[#e50914]"
                          : "bg-[#0e0e14] border-white/[0.06] hover:bg-[#14141d] hover:border-white/15"
                      }`}
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 mb-2">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={ep.name || `Episode ${ep.episode_number}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/ep:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                            No Preview
                          </div>
                        )}

                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                          EP {ep.episode_number}
                        </div>

                        {isActive && (
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-[#e50914] text-[10px] font-bold text-white shadow-md">
                            PLAYING
                          </div>
                        )}
                      </div>

                      <div className="px-1 flex-1">
                        <h4
                          className={`text-xs font-bold truncate mb-1 ${
                            isActive ? "text-[#e50914]" : "text-white group-hover/ep:text-[#e50914]"
                          }`}
                        >
                          {ep.name || `Episode ${ep.episode_number}`}
                        </h4>
                        {ep.overview && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                No episodes found for this season.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}