import { type SearchResult } from "../../api/tmdb";
import { StarIcon, PlayIcon } from "../ui/Icons";

export type MediaCardVariant = "poster" | "backdrop" | "spotlight";

export function MediaCard({
  item,
  onClick,
  rank,
  variant = "poster",
  imageLoading = "lazy",
}: {
  item: SearchResult;
  onClick: () => void;
  rank?: number;
  variant?: MediaCardVariant;
  imageLoading?: "eager" | "lazy";
}) {
  const isBackdrop = variant === "backdrop";
  const isSpotlight = variant === "spotlight";
  const imageSrc = (isBackdrop || isSpotlight) ? item.backdrop ?? item.poster : item.poster ?? item.backdrop;
  const rankLabel = rank ? rank.toString().padStart(2, "0") : null;

  if (isBackdrop) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-shrink-0 group/card text-left w-[280px] sm:w-[340px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-2xl select-none"
      >
        {/* Landscape 16:9 Image Container */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#121218] border border-white/[0.08] group-hover/card:border-white/20 shadow-lg shadow-black/40 transition-all duration-300 transform-gpu group-hover/card:scale-[1.02] will-change-transform">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
              loading={imageLoading}
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 bg-zinc-900 p-4 text-center">
              {item.title}
            </div>
          )}

          {/* Dark Scrim overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover/card:opacity-90 transition-opacity" />

          {/* Play Icon floating pill on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
            <div className="w-11 h-11 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-xl shadow-[#e50914]/40 transform scale-75 group-hover/card:scale-100 transition-transform">
              <PlayIcon size={16} />
            </div>
          </div>

          {/* Rank Badge for Top 10 */}
          {rankLabel && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-black text-white flex items-center gap-1 shadow-md">
              <span className="text-[#e50914]">#</span>
              <span>{rankLabel}</span>
            </div>
          )}

          {/* Embedded Bottom Metadata */}
          <div className="absolute bottom-0 inset-x-0 p-3.5 flex flex-col justify-end">
            <h3 className="text-white text-sm font-bold truncate drop-shadow-sm group-hover/card:text-[#e50914] transition-colors">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-300">
              {item.vote_average && item.vote_average >= 1 && (
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <StarIcon size={11} />
                  <span>{item.vote_average.toFixed(1)}</span>
                </span>
              )}
              {item.year && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{item.year}</span>
                </>
              )}
              <span className="text-zinc-600">•</span>
              <span className="uppercase text-[9px] font-semibold text-zinc-400 tracking-wider">
                {item.type === "tv" ? "Series" : "Movie"}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  // Conventional 2:3 Vertical Movie Poster Card
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 group/card text-left w-[170px] sm:w-[200px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-2xl select-none"
    >
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#121218] border border-white/[0.08] group-hover/card:border-white/25 shadow-lg shadow-black/50 transition-all duration-300 transform-gpu group-hover/card:scale-[1.03] will-change-transform">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            loading={imageLoading}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 bg-zinc-900 p-4 text-center">
            {item.title}
          </div>
        )}

        {/* Hover overlay with Play CTA button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-xl shadow-[#e50914]/40 transform scale-75 group-hover/card:scale-100 transition-transform">
            <PlayIcon size={16} />
          </div>
        </div>

        {/* Rank Watermark for Top 10 */}
        {rank !== undefined && (
          <div className="absolute bottom-1 right-2 pointer-events-none opacity-30 group-hover/card:opacity-40 transition-opacity font-black text-5xl italic tracking-tighter text-white select-none">
            {rank}
          </div>
        )}

        {/* Top Tag: Type or Year */}
        {item.type && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
            {item.type === "tv" ? "TV" : "Film"}
          </div>
        )}
      </div>

      {/* Title & Metadata Details */}
      <div className="mt-2.5 px-1">
        <h3 className="text-white text-xs sm:text-sm font-semibold truncate group-hover/card:text-[#e50914] transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
          {item.vote_average && item.vote_average >= 1 && (
            <span className="flex items-center gap-1 font-bold text-amber-400">
              <StarIcon size={11} />
              <span>{item.vote_average.toFixed(1)}</span>
            </span>
          )}
          {item.year && (
            <>
              <span className="text-zinc-600">•</span>
              <span>{item.year}</span>
            </>
          )}
          {item.genres && item.genres[0] && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="truncate max-w-[80px] text-zinc-500">{item.genres[0]}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
