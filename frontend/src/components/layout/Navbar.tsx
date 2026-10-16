import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SearchIcon } from "../ui/Icons";
import { Brand } from "./Brand";

export function Navbar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (location.pathname !== "/") {
      return;
    }
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#070709]/90 backdrop-blur-md border-b border-white/[0.06] py-3 shadow-2xl"
          : "bg-gradient-to-b from-[#070709]/90 via-[#070709]/40 to-transparent py-4 sm:py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand & Desktop Navigation Links */}
        <div className="flex items-center gap-8">
          <Brand />

          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-zinc-400">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                location.pathname === "/"
                  ? "text-white bg-white/[0.06]"
                  : "hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              Discover
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection("section-trending")}
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              Trending
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-top-rated")}
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              Top Rated
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-genres")}
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              Genres
            </button>
          </nav>
        </div>

        {/* Search Bar / Trigger Pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSearchOpen}
            aria-label="Search movies and series"
            className="flex items-center gap-2.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/20 text-zinc-400 hover:text-white transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          >
            <SearchIcon size={15} className="group-hover:text-[#e50914] transition-colors" />
            <span className="hidden sm:inline text-xs font-medium text-zinc-300">
              Search movies, series...
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/[0.08] border border-white/10 rounded">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
