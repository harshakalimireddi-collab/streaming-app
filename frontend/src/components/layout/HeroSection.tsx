import { useEffect, useState } from "react";
import { type SearchResult, getTitleImages } from "../../api/tmdb";
import { StarIcon, PlayIcon, InfoIcon } from "../ui/Icons";
import { useSlideshow } from "../../hooks/useSlideshow";
import { getTvDetails } from "../../api/details";

export function HeroSection({
  items,
  onPlay,
  onDetails,
}: {
  items: SearchResult[];
  onPlay: (item: SearchResult) => void;
  onDetails: (item: SearchResult) => void;
}) {
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [seasonCounts, setSeasonCounts] = useState<Record<string, number | null>>({});

  const top10 = items.slice(0, 8);
  const { activeIdx, prevIdx, goTo } = useSlideshow(top10.length);

  function cacheKey(item: SearchResult) {
    return `${item.type}:${item.id}`;
  }

  function prefetch(item: SearchResult) {
    const key = cacheKey(item);
    setLogos((prev) => {
      if (key in prev) return prev;
      getTitleImages(item.type, item.id)
        .then((d) => setLogos((p) => ({ ...p, [key]: d.logoUrl })))
        .catch(() => setLogos((p) => ({ ...p, [key]: null })));
      return { ...prev, [key]: null };
    });
  }

  function prefetchSeasonCount(item: SearchResult) {
    if (item.type !== "tv") return;
    const key = cacheKey(item);
    setSeasonCounts((prev) => {
      if (key in prev) return prev;
      getTvDetails(item.id)
        .then((d) =>
          setSeasonCounts((p) => ({
            ...p,
            [key]: typeof d.number_of_seasons === "number" ? d.number_of_seasons : null,
          }))
        )
        .catch(() => setSeasonCounts((p) => ({ ...p, [key]: null })));
      return { ...prev, [key]: null };
    });
  }

  useEffect(() => {
    if (!top10.length) return;
    prefetch(top10[activeIdx]);
    prefetchSeasonCount(top10[activeIdx]);
    const next = top10[(activeIdx + 1) % top10.length];
    if (next) {
      prefetch(next);
      prefetchSeasonCount(next);
    }
  }, [activeIdx, top10.length]);

  const active = top10[activeIdx];
  const prev = prevIdx !== null ? top10[prevIdx] : null;

  if (!active) return null;

  const logoUrl = logos[cacheKey(active)] ?? null;
  const hasRating = typeof active.vote_average === "number" && active.vote_average >= 1;
  const numberOfSeasons = active.type === "tv" ? seasonCounts[cacheKey(active)] : null;

  return (
    <section className="relative w-full h-[88vh] min-h-[580px] max-h-[860px] overflow-hidden select-none bg-[#070709]">
      {/* Background Slideshow Layer */}
      {prev && (
        <div
          key={`prev-${prevIdx}`}
          className="absolute inset-0 transition-opacity duration-700 ease-out z-0"
        >
          <img
            src={prev.backdrop ?? prev.poster ?? undefined}
            alt=""
            className="w-full h-full object-cover object-center filter brightness-[0.85]"
          />
          <div className="absolute inset-0 scrim-hero" />
        </div>
      )}

      <div
        key={`active-${activeIdx}`}
        className="absolute inset-0 z-10 animate-fadeIn"
      >
        <img
          src={active.backdrop ?? active.poster ?? undefined}
          alt=""
          className="w-full h-full object-cover object-center filter brightness-[0.88] transform scale-100 transition-transform duration-1000 ease-out"
          loading="eager"
        />
        {/* Cinematic Scrim & Vignette Gradient Overlays */}
        <div className="absolute inset-0 scrim-hero" />
      </div>

      {/* Hero Content Information Container */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 sm:pb-20">
        <div className="max-w-2xl animate-slideUp">
          {/* Featured Eyebrow */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/10 backdrop-blur-md mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e50914] animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
              Featured Premiere
            </span>
          </div>

          {/* Title or Official PNG Logo */}
          <div className="mb-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={active.title}
                className="h-16 sm:h-24 md:h-28 w-auto object-contain drop-shadow-2xl"
                style={{ maxWidth: "420px" }}
              />
            ) : (
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] drop-shadow-lg">
                {active.title}
              </h1>
            )}
          </div>

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-zinc-300 mb-4">
            {hasRating && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 font-bold">
                <StarIcon size={12} />
                {active.vote_average!.toFixed(1)}
              </span>
            )}

            {active.year && (
              <span className="font-semibold text-zinc-300">{active.year}</span>
            )}

            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-200 border border-white/10">
              4K UHD
            </span>

            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-200 border border-white/10">
              {active.type === "tv" ? "TV SERIES" : "MOVIE"}
            </span>

            {!!numberOfSeasons && (
              <span className="text-zinc-400">
                {numberOfSeasons} Season{numberOfSeasons > 1 ? "s" : ""}
              </span>
            )}

            {active.genres && active.genres.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-zinc-400">
                <span>•</span>
                <span>{active.genres.slice(0, 2).join(", ")}</span>
              </span>
            )}
          </div>

          {/* Overview Synopsis */}
          {active.overview && (
            <p className="text-sm sm:text-base text-zinc-300/90 leading-relaxed line-clamp-3 mb-7 max-w-xl text-shadow-sm font-normal">
              {active.overview}
            </p>
          )}

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={() => onPlay(active)}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#e50914]/30 hover:shadow-[#e50914]/50 transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <PlayIcon size={15} />
              <span>Watch Now</span>
            </button>

            <button
              type="button"
              onClick={() => onDetails(active)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white font-semibold text-sm backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
            >
              <InfoIcon size={16} />
              <span>More Details</span>
            </button>
          </div>
        </div>

        {/* Carousel Slide Indicators */}
        <div className="absolute bottom-6 right-4 sm:right-8 z-30 flex items-center gap-2">
          {top10.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}: ${item.title}`}
              className={`group/dot relative h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIdx
                  ? "w-8 bg-[#e50914]"
                  : "w-2.5 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
