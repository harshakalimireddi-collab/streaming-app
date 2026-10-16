import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePersonDetails } from "../hooks/usePersonDetails";
import { type SearchResult } from "../api/tmdb";
import { ChevronLeft } from "../components/ui/Icons";
import { PosterCarousel } from "../components/rows/PosterCarousel";

const PROFILE_BASE = "https://image.tmdb.org/t/p/w500";

export default function ActorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, loading, error } = usePersonDetails(Number(id));
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    if (data?.name) document.title = `${data.name} — CineVault`;
    return () => {
      document.title = "CineVault";
    };
  }, [data]);

  useEffect(() => {
    setBioExpanded(false);
  }, [id]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-[#e50914] animate-spin" />
        </div>
        <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">
          Loading Person Details…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center px-4">
        <div className="text-center max-w-md p-8 rounded-2xl bg-zinc-950 border border-white/10">
          <p className="text-red-400 text-sm font-semibold mb-4">Failed to load actor biography.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            ← Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const profileImg = data.profile_path ? `${PROFILE_BASE}${data.profile_path}` : null;
  const openTitle = (item: SearchResult) => nav(`/title/${item.type}/${item.id}`);

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-[#e50914] selection:text-white">
      {/* Top Header Navigation */}
      <div className="border-b border-white/[0.08] bg-[#09090f] pt-6 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => nav(-1)}
              aria-label="Go Back"
              className="w-10 h-10 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-full text-white transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <ChevronLeft size={18} />
            </button>
            <Link
              to="/"
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              ← Discover
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 sm:gap-10 items-center sm:items-start">
            {/* High-res Portrait Image */}
            <div className="flex-shrink-0 w-44 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl bg-zinc-900">
              {profileImg ? (
                <img
                  src={profileImg}
                  alt={data.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-600 font-bold">
                  {data.name.slice(0, 1)}
                </div>
              )}
            </div>

            {/* Biographical Metadata */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              {data.known_for_department && (
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#e50914] mb-2">
                  {data.known_for_department}
                </div>
              )}

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                {data.name}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-zinc-400 mb-6 font-medium">
                {data.birthday && (
                  <div>
                    Born:{" "}
                    <span className="text-zinc-200">
                      {new Date(data.birthday).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {data.place_of_birth && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-700">•</span>
                    <span>{data.place_of_birth}</span>
                  </div>
                )}
              </div>

              {data.biography && (
                <div className="relative max-w-3xl">
                  <p
                    className={`text-sm text-zinc-300 leading-relaxed font-normal text-left ${
                      bioExpanded ? "" : "line-clamp-4 sm:line-clamp-6"
                    }`}
                  >
                    {data.biography}
                  </p>
                  {!bioExpanded && (
                    <button
                      type="button"
                      onClick={() => setBioExpanded(true)}
                      className="mt-2 text-xs font-bold text-[#e50914] hover:underline cursor-pointer"
                    >
                      Read full biography →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filmography and Credits Showcase */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {data.knownFor && data.knownFor.length > 0 && (
          <PosterCarousel
            title="Known For"
            subtitle="Iconic Performances"
            items={data.knownFor}
            onOpen={openTitle}
            cardVariant="poster"
            scrollAmount={600}
          />
        )}

        {data.movies && data.movies.length > 0 && (
          <PosterCarousel
            title="Feature Films"
            subtitle="Movie Appearances"
            items={data.movies}
            onOpen={openTitle}
            cardVariant="backdrop"
            scrollItems={3}
          />
        )}

        {data.shows && data.shows.length > 0 && (
          <PosterCarousel
            title="Television Series"
            subtitle="Television & Shows"
            items={data.shows}
            onOpen={openTitle}
            cardVariant="backdrop"
            scrollItems={3}
          />
        )}
      </main>
    </div>
  );
}
