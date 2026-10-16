import { useEffect, useState } from "react";
import { type SearchResult, type Genre, getGenresTmdb, discoverByGenreTmdb } from "../../api/tmdb";
import { MediaTypeToggle } from "../ui/MediaTypeToggle";
import { PosterCarousel } from "./PosterCarousel";

export function GenreRow({ onOpen }: { onOpen: (item: SearchResult) => void }) {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<Genre | null>(null);
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGenresTmdb(mediaType)
      .then((d) => {
        setGenres(d.genres);
        setActiveGenre((prev) => {
          const match = prev
            ? d.genres.find(
                (g) =>
                  g.name.toLowerCase().includes(prev.name.toLowerCase().split(" ")[0]) ||
                  prev.name.toLowerCase().includes(g.name.toLowerCase().split(" ")[0])
              )
            : null;
          return match ?? d.genres[0] ?? null;
        });
      })
      .catch(() => {});
  }, [mediaType]);

  useEffect(() => {
    if (!activeGenre) return;
    let cancelled = false;
    setLoading(true);
    discoverByGenreTmdb(mediaType, activeGenre.id)
      .then((d) => {
        if (!cancelled) setItems(d.results ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeGenre, mediaType]);

  return (
    <div className="space-y-4">
      {/* Genre Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
        {genres.map((g) => {
          const isActive = activeGenre?.id === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGenre(g)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#e50914] text-white shadow-md shadow-[#e50914]/25 scale-105"
                  : "bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06]"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {/* Dynamic Results Carousel */}
      <PosterCarousel
        title={activeGenre ? `${activeGenre.name} Highlights` : "Explore Genres"}
        subtitle="Genre Spotlight"
        items={items}
        onOpen={onOpen}
        resetKey={`${mediaType}:${activeGenre?.id ?? "none"}`}
        cardVariant="backdrop"
        scrollItems={3}
        rightContent={
          <MediaTypeToggle
            value={mediaType}
            options={[
              { label: "Movies", value: "movie" },
              { label: "Series", value: "tv" },
            ]}
            onChange={(v) => setMediaType(v)}
          />
        }
      >
        {loading && (
          <div className="py-8 flex items-center justify-center text-xs text-zinc-500 gap-2">
            <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-[#e50914] rounded-full animate-spin" />
            <span>Curating {activeGenre?.name} titles…</span>
          </div>
        )}
      </PosterCarousel>
    </div>
  );
}
