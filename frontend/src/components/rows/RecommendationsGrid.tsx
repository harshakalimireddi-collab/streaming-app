import { Link } from "react-router-dom";
import { type SearchResult } from "../../api/tmdb";
import { StarIcon, PlayIcon } from "../ui/Icons";

export function RecommendationsGrid({
  items,
  title = "You May Also Like",
  limit = 12,
}: {
  items: SearchResult[];
  title?: string;
  limit?: number | null;
}) {
  if (!items.length) return null;

  const visibleItems = limit == null ? items : items.slice(0, limit);

  return (
    <section className="pt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-5 rounded-full bg-[#e50914]" />
        <h2 className="text-white font-extrabold text-lg sm:text-xl tracking-tight">{title}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {visibleItems.map((item) => {
          const img = item.poster ?? item.backdrop;

          return (
            <Link
              key={item.id}
              to={`/title/${item.type}/${item.id}`}
              className="group block select-none"
            >
              <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#111118] border border-white/[0.08] group-hover:border-white/20 transition-all duration-300 transform-gpu group-hover:scale-[1.03] shadow-md shadow-black/40">
                {img ? (
                  <img
                    src={img}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 p-2 text-center bg-zinc-900">
                    {item.title}
                  </div>
                )}

                {/* Hover Play Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg">
                    <PlayIcon size={14} />
                  </div>
                </div>

                {/* Media Type Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-bold text-zinc-300 uppercase tracking-wider border border-white/10">
                  {item.type === "tv" ? "TV" : "Movie"}
                </div>
              </div>

              <div className="mt-2.5 px-0.5">
                <h4 className="text-white text-xs font-semibold truncate group-hover:text-[#e50914] transition-colors">
                  {item.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                  {item.vote_average && item.vote_average >= 1 && (
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <StarIcon size={10} />
                      <span>{item.vote_average.toFixed(1)}</span>
                    </span>
                  )}
                  {item.year && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span>{item.year}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
