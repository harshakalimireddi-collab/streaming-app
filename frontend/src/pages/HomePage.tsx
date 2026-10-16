import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trendingTmdb, topRatedTmdb, type SearchResult } from "../api/tmdb";
import { Navbar } from "../components/layout/Navbar";
import { SearchOverlay } from "../components/ui/SearchOverlay";
import { HeroSection } from "../components/layout/HeroSection";
import { PosterCarousel } from "../components/rows/PosterCarousel";
import { MediaTypeToggle } from "../components/ui/MediaTypeToggle";
import { GenreRow } from "../components/rows/GenreRow";
import { IntroLoader } from "../components/ui/IntroLoader";

type TrendWindow = "day" | "week";
type RatedType = "movie" | "tv";

const homeCache = {
  main: null as SearchResult[] | null,
  trending: new Map<TrendWindow, SearchResult[]>(),
  topRated: new Map<RatedType, SearchResult[]>(),
};

export default function HomePage() {
  const nav = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const [mainItems, setMainItems] = useState<SearchResult[]>(() => homeCache.main ?? []);
  const [mainLoading, setMainLoading] = useState(() => homeCache.main === null);

  const [trendingItems, setTrendingItems] = useState<SearchResult[]>(
    () => homeCache.trending.get("day") ?? []
  );
  const [trendWindow, setTrendWindow] = useState<TrendWindow>("day");
  const [topRatedItems, setTopRatedItems] = useState<SearchResult[]>(
    () => homeCache.topRated.get("movie") ?? []
  );
  const [topRatedType, setTopRatedType] = useState<RatedType>("movie");

  useEffect(() => {
    document.title = "CineVault — Premium Streaming Experience";
  }, []);

  // Keyboard shortcut ⌘K / Ctrl+K for search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch Hero & Top 10 items
  useEffect(() => {
    let cancelled = false;
    trendingTmdb("all", "day")
      .then((data) => {
        const items = data.results ?? [];
        homeCache.main = items;
        if (!cancelled) setMainItems(items);
      })
      .catch(() => {
        if (!cancelled && homeCache.main === null) setMainItems([]);
      })
      .finally(() => {
        if (!cancelled) setMainLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Top Rated
  useEffect(() => {
    let cancelled = false;
    topRatedTmdb(topRatedType)
      .then((d) => {
        const items = d.results ?? [];
        homeCache.topRated.set(topRatedType, items);
        if (!cancelled) setTopRatedItems(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [topRatedType]);

  // Fetch Trending by Window / Media
  useEffect(() => {
    let cancelled = false;
    const type = trendWindow === "day" ? "movie" : "tv";
    trendingTmdb(type, "day")
      .then((data) => {
        const items = data.results ?? [];
        homeCache.trending.set(trendWindow, items);
        if (!cancelled) setTrendingItems(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trendWindow]);

  const openTitle = (item: SearchResult) => nav(`/title/${item.type}/${item.id}`);

  return (
    <div className="home-page min-h-screen bg-[#070709] text-white overflow-x-hidden">
      <IntroLoader loading={mainLoading} />
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Hero Section */}
      {mainLoading ? (
        <div className="w-full bg-[#0a0a0f] animate-pulse h-[88vh] min-h-[580px]" />
      ) : mainItems.length > 0 ? (
        <HeroSection
          items={mainItems}
          onPlay={(item) =>
            item.type === "movie"
              ? nav(`/play/movie/${item.id}`)
              : nav(`/play/tv/${item.id}/1/1`)
          }
          onDetails={(item) => nav(`/title/${item.type}/${item.id}`)}
        />
      ) : null}

      {/* Content Layout Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 py-8 sm:py-12">
        {/* Section 1: TOP 10 Showcase */}
        {mainLoading ? (
          <div className="space-y-4">
            <div className="h-6 w-48 bg-white/5 rounded-md animate-pulse" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44 aspect-[2/3] rounded-2xl bg-white/[0.05] animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <PosterCarousel
            title="Top 10 Global Chart"
            subtitle="Most Watched Today"
            items={mainItems.slice(0, 10)}
            onOpen={openTitle}
            badge
            scrollAmount={600}
            cardVariant="poster"
          />
        )}

        {/* Section 2: Trending Spotlight (Landscape Cards) */}
        <div id="section-trending">
          <PosterCarousel
            title="Trending in Entertainment"
            subtitle="Curated Recommendations"
            items={trendingItems}
            onOpen={openTitle}
            resetKey={trendWindow}
            cardVariant="backdrop"
            scrollItems={3}
            rightContent={
              <MediaTypeToggle
                value={trendWindow}
                options={[
                  { label: "Movies", value: "day" },
                  { label: "TV Series", value: "week" },
                ]}
                onChange={(v) => setTrendWindow(v)}
              />
            }
          />
        </div>

        {/* Section 3: Top Rated Masterpieces */}
        <div id="section-top-rated">
          <PosterCarousel
            title="Hall of Fame"
            subtitle="Critically Acclaimed Masterpieces"
            items={topRatedItems}
            onOpen={openTitle}
            resetKey={topRatedType}
            cardVariant="poster"
            scrollItems={4}
            rightContent={
              <MediaTypeToggle
                value={topRatedType}
                options={[
                  { label: "Feature Films", value: "movie" },
                  { label: "Series", value: "tv" },
                ]}
                onChange={(v) => setTopRatedType(v)}
              />
            }
          />
        </div>

        {/* Section 4: Genre Exploration */}
        <div id="section-genres">
          <GenreRow onOpen={openTitle} />
        </div>
      </main>

      {/* Cinematic Footer */}
      <footer className="border-t border-white/[0.06] bg-[#050507] py-12 mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-[#e50914] flex items-center justify-center text-white text-xs font-bold">
              ▶
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              CINE<span className="text-[#e50914]">VAULT</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 text-center sm:text-right">
            Metadata powered by TMDB. Embedded streams powered by frameXTV.
          </p>
        </div>
      </footer>
    </div>
  );
}
