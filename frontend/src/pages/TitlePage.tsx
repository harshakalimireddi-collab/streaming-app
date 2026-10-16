import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useRecommendations } from "../hooks/useRecommendations";
import { PlayIcon, StarIcon, SearchIcon, ChevronLeft } from "../components/ui/Icons";
import { useTitleMeta } from "../hooks/useTitleMeta";
import { ActorCard } from "../components/cards/ActorCard";
import { SeasonDropdown } from "../components/ui/SeasonDropdown";
import { TrailerModal } from "../components/ui/TrailerModal";
import { RecommendationsGrid } from "../components/rows/RecommendationsGrid";
import { useTitleDetails, type ErrorLike } from "../hooks/useTitleDetails";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import { useCrossSeasonEpisodeSearch } from "../hooks/useCrossSeasonEpisodeSearch";
import { useCollection } from "../hooks/useCollection";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1.5 h-5 rounded-full bg-[#e50914]" />
      <h2 className="text-white font-extrabold text-lg sm:text-xl tracking-tight">{children}</h2>
    </div>
  );
}

export default function TitlePage() {
  const { type, id } = useParams();
  const nav = useNavigate();
  const tmdbId = Number(id);

  const {
    data,
    loading,
    isError,
    isTv,
    isMovie,
    title,
    year,
    overview,
    genres,
    backdropUrl: backdrop,
    posterUrl,
    seasonOptions,
    initialSeasonNumber,
  } = useTitleDetails(tmdbId, type);

  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [episodeFilter, setEpisodeFilter] = useState("");
  const [showTrailer, setShowTrailer] = useState(false);
  const episodesListRef = useRef<HTMLDivElement>(null);

  const handleSeasonChange = (nextSeasonNumber: number) => {
    if (nextSeasonNumber === seasonNumber) return;
    setSeasonNumber(nextSeasonNumber);
    if (episodesListRef.current) episodesListRef.current.scrollTop = 0;
  };

  const [prevKey, setPrevKey] = useState(`${type}-${id}`);
  if (`${type}-${id}` !== prevKey) {
    setPrevKey(`${type}-${id}`);
    setEpisodeFilter("");
    setShowTrailer(false);
  }

  const [prevData, setPrevData] = useState(data);
  if (isTv && !isError && data && data !== prevData) {
    setPrevData(data);
    setSeasonNumber(initialSeasonNumber ?? 1);
    setEpisodeFilter("");
  }

  useEffect(() => {
    document.title = loading
      ? "Loading…"
      : title
      ? `${title} ${year ? `(${year})` : ""} — CineVault`
      : "CineVault";
    return () => {
      document.title = "CineVault";
    };
  }, [loading, title, year]);

  useEffect(() => {
    if (!showTrailer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTrailer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTrailer]);

  const { seasonData, loadingSeason, setSeasonCache } = useSeasonEpisodes({
    tmdbId,
    enabled: isTv && !isError,
    seasonNumber,
  });

  const { episodes, isCrossSeason } = useCrossSeasonEpisodeSearch({
    tmdbId,
    enabled: isTv && !isError,
    seasonNumber,
    seasonData,
    episodeFilter,
    setSeasonCache,
  });

  const {
    runtime,
    numberOfSeasons,
    rating,
    trailer,
    trailerEmbedUrl,
    trailerModalUrl,
    fullCast,
    logoUrl,
  } = useTitleMeta(data, isMovie, isTv, tmdbId, type);

  const collectionSummary =
    isMovie && data && !(data as ErrorLike).__error
      ? (data as any).belongs_to_collection
      : null;
  const collection = useCollection(collectionSummary?.id);
  const recommendations = useRecommendations(tmdbId, type);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-[#e50914] animate-spin" />
        </div>
        <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">
          Loading Title Details…
        </p>
      </div>
    );
  }

  if (isError || (data as ErrorLike).__error) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center px-4">
        <div className="text-center max-w-md p-8 rounded-2xl bg-zinc-950 border border-white/10">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            ✕
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Title Unavailable</h2>
          <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
            We couldn't retrieve the details for this title from TMDB. Please check your connection or return to the catalog.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-semibold text-xs transition-colors"
          >
            ← Return to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-[#e50914] selection:text-white">
      {/* Cinematic Hero Header */}
      <section className="relative w-full h-[76vh] min-h-[500px] max-h-[750px] overflow-hidden">
        {/* Background Visual: Video trailer backdrop or high-res poster */}
        <div className="absolute inset-0">
          {trailerEmbedUrl ? (
            <iframe
              src={trailerEmbedUrl}
              title="Backdrop Trailer"
              allow="autoplay; encrypted-media"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "125vw",
                height: "70vw",
                minWidth: "100vw",
                minHeight: "100%",
                transform: "translate(-50%, -50%)",
                border: 0,
                pointerEvents: "none",
                filter: "brightness(0.8)",
              }}
            />
          ) : backdrop ? (
            <img
              src={backdrop}
              alt=""
              className="w-full h-full object-cover object-center filter brightness-[0.85]"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-[#0c0c12]" />
          )}
        </div>

        {/* Cinematic Scrims */}
        <div className="absolute inset-0 scrim-hero" />

        {/* Top Back Navigation Pill */}
        <div className="absolute top-5 left-4 sm:left-8 z-30 flex items-center gap-3">
          <button
            type="button"
            onClick={() => nav(-1)}
            aria-label="Return"
            className="w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 rounded-full text-white transition-all active:scale-95 cursor-pointer shadow-xl hover:border-white/30"
          >
            <ChevronLeft size={18} />
          </button>
          <Link
            to="/"
            className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-xl"
          >
            ← Browse Catalog
          </Link>
        </div>

        {/* Content Metadata Block */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16">
          <div className="max-w-2xl">
            {/* Title / Official Logo */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className="h-20 sm:h-28 w-auto object-contain mb-4 drop-shadow-2xl"
                style={{ maxWidth: "420px" }}
              />
            ) : (
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3 drop-shadow-lg">
                {title}
              </h1>
            )}

            {/* Metadata Tags Row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-300 mb-4">
              {rating && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 font-bold">
                  <StarIcon size={12} />
                  {rating}
                </span>
              )}

              {year && <span className="font-semibold text-zinc-300">{year}</span>}

              {isMovie && !!runtime && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{runtime} min</span>
                </>
              )}

              {isTv && !!numberOfSeasons && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>
                    {numberOfSeasons} Season{numberOfSeasons > 1 ? "s" : ""}
                  </span>
                </>
              )}

              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-200 border border-white/10 uppercase tracking-wider">
                {isTv ? "TV Series" : "Movie"}
              </span>

              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-200 border border-white/10">
                4K Ultra HD
              </span>

              {genres.length > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">{genres.slice(0, 3).join(", ")}</span>
                </>
              )}
            </div>

            {/* Synopsis */}
            {overview && (
              <p className="text-sm text-zinc-300/90 leading-relaxed line-clamp-3 mb-6 max-w-xl font-normal">
                {overview}
              </p>
            )}

            {/* Primary Actions Row */}
            <div className="flex flex-wrap items-center gap-3">
              {isMovie ? (
                <Link
                  to={`/play/movie/${tmdbId}`}
                  className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#e50914]/30 hover:shadow-[#e50914]/50 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <PlayIcon size={16} />
                  <span>Watch Now</span>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to={`/play/tv/${tmdbId}/${seasonNumber}/1`}
                    className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#e50914]/30 hover:shadow-[#e50914]/50 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <PlayIcon size={16} />
                    <span>Play S{seasonNumber} E1</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("episodes")?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white font-semibold text-sm backdrop-blur-md transition-all cursor-pointer"
                  >
                    <span>☰ Browse Episodes</span>
                  </button>
                </div>
              )}

              {trailerModalUrl && (
                <button
                  type="button"
                  onClick={() => setShowTrailer(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white font-semibold text-sm backdrop-blur-md transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                >
                  <PlayIcon size={13} />
                  <span>Official Trailer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Details Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* TV Series Season & Episode Section */}
        {isTv && (
          <section id="episodes" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <SectionHeading>Seasons & Episodes</SectionHeading>

              <div className="flex flex-wrap items-center gap-3">
                {seasonOptions && seasonOptions.length > 0 && (
                  <SeasonDropdown
                    seasons={seasonOptions}
                    value={seasonNumber}
                    onChange={handleSeasonChange}
                  />
                )}

                <div className="relative w-48 sm:w-60">
                  <SearchIcon
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    value={episodeFilter}
                    onChange={(e) => setEpisodeFilter(e.target.value)}
                    placeholder="Search episode…"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3.5 py-2 text-xs text-white outline-none placeholder-zinc-500 focus:border-[#e50914] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Episode Grid */}
            <div
              ref={episodesListRef}
              className={`relative transition-opacity ${loadingSeason ? "opacity-40 pointer-events-none" : ""}`}
            >
              {(seasonData as ErrorLike | null)?.__error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
                  Failed to load season {seasonNumber} episodes.
                </div>
              ) : episodes?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {episodes.map((ep) => (
                    <Link
                      key={`${ep.season}-${ep.id}`}
                      to={`/play/tv/${tmdbId}/${ep.season}/${ep.episode}`}
                      className="group flex flex-col rounded-2xl overflow-hidden bg-[#101017] border border-white/[0.06] hover:border-white/20 transition-all duration-300 p-3 hover:shadow-xl hover:shadow-black/50"
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 mb-3">
                        {ep.still ? (
                          <img
                            src={ep.still}
                            alt={ep.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={title}
                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                            No Preview Available
                          </div>
                        )}

                        {/* Episode pill */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                          {isCrossSeason ? `S${ep.season}·` : ""}EP {ep.episode}
                        </div>

                        {/* Play hover button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg">
                            <PlayIcon size={14} />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-[#e50914] transition-colors truncate">
                            {ep.name || `Episode ${ep.episode}`}
                          </h4>
                          {ep.runtime && (
                            <span className="text-[11px] text-zinc-500 flex-shrink-0 font-mono">
                              {ep.runtime}m
                            </span>
                          )}
                        </div>
                        {ep.overview ? (
                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                            {ep.overview}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-600 italic">No synopsis available</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-zinc-500">
                  No episodes found.
                </div>
              )}

              {loadingSeason && (
                <div className="absolute inset-0 flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-xl border border-white/15 px-5 py-3 text-sm text-zinc-200">
                    <div className="w-4 h-4 border-2 border-zinc-600 border-t-[#e50914] rounded-full animate-spin" />
                    Loading season episodes…
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Cast & Crew Section */}
        {fullCast.length > 0 && (
          <section>
            <SectionHeading>Top Cast & Credits</SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {fullCast.slice(0, 12).map((actor) => (
                <ActorCard key={actor.id} actor={actor} />
              ))}
            </div>
          </section>
        )}

        {/* Collection Grid if part of franchise */}
        {collection && collection.parts.length > 1 && (
          <RecommendationsGrid
            title={`The Complete ${collection.name}`}
            items={collection.parts}
            limit={null}
          />
        )}

        {/* Recommended Titles */}
        <RecommendationsGrid items={recommendations} title="More Like This" />
      </main>

      {/* Trailer Modal */}
      {showTrailer && trailerModalUrl && (
        <TrailerModal
          url={trailerModalUrl}
          name={trailer?.name}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
}
