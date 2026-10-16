import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { type SearchResult } from "../../api/tmdb";
import useDebounce from "../../hooks/useDebounce";
import { useTmdbSearch } from "../../hooks/useTmdbSearch";
import {
  SearchIcon,
  CloseIcon,
  PlayIcon,
  InfoIcon,
  StarIcon,
  ChevronDown,
  ClockIcon,
  CheckIcon,
} from "./Icons";
import { useRecentQueries } from "../../hooks/useRecentQueries";

const STORAGE_KEY = "xalonstream:recentQueries";
const RECENT_CLEAR_ROW_MS = 220;
const RECENT_CLEAR_STAGGER_MS = 25;

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState<"multi" | "movie" | "tv">("multi");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPos, setFilterPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const prevResultsRef = useRef<SearchResult[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const previousBodyHeightRef = useRef(0);
  const bodyAnimationFrameRef = useRef<number | null>(null);
  const bodyAnimationTimerRef = useRef<number | null>(null);
  const resultRefs = useRef(new Map<string, HTMLDivElement>());
  const clearRecentTimerRef = useRef<number | null>(null);

  const dq = useDebounce(q, 350);
  const trimmed = dq.trim();

  const { results, loading } = useTmdbSearch({
    query: trimmed,
    type: filterType,
    enabled: trimmed.length >= 2,
  });
  const { recent, commit, clear } = useRecentQueries(STORAGE_KEY);
  const [clearingRecentSnapshot, setClearingRecentSnapshot] = useState<string[] | null>(null);
  const visibleRecent = clearingRecentSnapshot ?? recent;
  const clearingRecent = clearingRecentSnapshot !== null;

  useEffect(() => {
    if (results !== prevResultsRef.current) {
      prevResultsRef.current = results;
      setResultsVersion((v) => v + 1);
    }
  }, [results]);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const body = bodyRef.current;
    if (!inner || !body || (clearingRecent && !q)) return;

    if (bodyAnimationFrameRef.current !== null) cancelAnimationFrame(bodyAnimationFrameRef.current);
    if (bodyAnimationTimerRef.current !== null) window.clearTimeout(bodyAnimationTimerRef.current);

    const nextHeight = Math.min(inner.scrollHeight, window.innerHeight * 0.62);
    setBodyHeight(previousBodyHeightRef.current);
    previousBodyHeightRef.current = nextHeight;

    bodyAnimationFrameRef.current = requestAnimationFrame(() => {
      setBodyHeight(nextHeight);
      bodyAnimationFrameRef.current = null;
    });
    bodyAnimationTimerRef.current = window.setTimeout(() => {
      setBodyHeight(null);
      bodyAnimationTimerRef.current = null;
    }, 420);

    return () => {
      if (bodyAnimationFrameRef.current !== null) cancelAnimationFrame(bodyAnimationFrameRef.current);
      if (bodyAnimationTimerRef.current !== null) window.clearTimeout(bodyAnimationTimerRef.current);
    };
  }, [results, q, visibleRecent, clearingRecent, mounted]);

  useEffect(() => {
    const keepBottomVisible = () => {
      if (!expandedId) return;
      const body = bodyRef.current;
      const row = resultRefs.current.get(expandedId);
      if (!body || !row) return;

      const overflow = row.getBoundingClientRect().bottom - body.getBoundingClientRect().bottom + 8;
      if (overflow > 0) body.scrollBy({ top: overflow, behavior: "smooth" });
    };

    const visibilityTimer = window.setTimeout(keepBottomVisible, 320);
    return () => {
      window.clearTimeout(visibilityTimer);
    };
  }, [expandedId]);

  useEffect(() => {
    return () => {
      if (clearRecentTimerRef.current !== null) {
        window.clearTimeout(clearRecentTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => {
        setShow(true);
        inputRef.current?.focus();
      }, 20);
      return () => clearTimeout(t);
    } else {
      setShow(false);
      const t = setTimeout(() => {
        setMounted(false);
        setQ("");
        setExpandedId(null);
      }, 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!filterOpen) return;
    const close = () => setFilterOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [filterOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function openFilter() {
    if (filterBtnRef.current) {
      const r = filterBtnRef.current.getBoundingClientRect();
      setFilterPos({ top: r.bottom + 6, left: r.right - 180 });
    }
    setFilterOpen((o) => !o);
  }

  function handlePlay(item: SearchResult) {
    commit(q.trim());
    if (item.type === "movie") {
      nav(`/play/movie/${item.id}`);
    } else {
      nav(`/play/tv/${item.id}/1/1`);
    }
    onClose();
  }

  function handleDetails(item: SearchResult) {
    commit(q.trim());
    nav(`/title/${item.type}/${item.id}`);
    onClose();
  }

  function handleClearRecent() {
    if (clearingRecent || visibleRecent.length === 0) return;

    if (clearRecentTimerRef.current !== null) {
      window.clearTimeout(clearRecentTimerRef.current);
    }

    if (bodyAnimationFrameRef.current !== null) cancelAnimationFrame(bodyAnimationFrameRef.current);
    if (bodyAnimationTimerRef.current !== null) window.clearTimeout(bodyAnimationTimerRef.current);
    bodyAnimationFrameRef.current = null;
    bodyAnimationTimerRef.current = null;
    const currentHeight = bodyRef.current?.getBoundingClientRect().height ?? 0;
    previousBodyHeightRef.current = currentHeight;
    setBodyHeight(currentHeight);
    setClearingRecentSnapshot(visibleRecent);
    clear();

    const totalDuration = RECENT_CLEAR_ROW_MS + (visibleRecent.length - 1) * RECENT_CLEAR_STAGGER_MS;
    clearRecentTimerRef.current = window.setTimeout(() => {
      setClearingRecentSnapshot(null);
      clearRecentTimerRef.current = null;
    }, totalDuration);
  }

  function toggleExpandedResult(key: string, isExpanded: boolean) {
    if (bodyAnimationFrameRef.current !== null) cancelAnimationFrame(bodyAnimationFrameRef.current);
    if (bodyAnimationTimerRef.current !== null) window.clearTimeout(bodyAnimationTimerRef.current);
    bodyAnimationFrameRef.current = null;
    bodyAnimationTimerRef.current = null;
    setBodyHeight(null);
    setExpandedId(isExpanded ? null : key);
  }

  const filterLabel =
    filterType === "multi" ? "All Categories" : filterType === "movie" ? "Movies Only" : "TV Series Only";

  if (!mounted) return null;

  return (
    <>
      <style>{`@keyframes slideInRow { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div
        onClick={onClose}
        className="fixed inset-0 flex items-center justify-center px-4"
        style={{
          zIndex: 100,
          background: show ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0)",
          backdropFilter: show ? "blur(12px)" : "blur(0px)",
          WebkitBackdropFilter: show ? "blur(12px)" : "blur(0px)",
          transition: "background 0.3s ease, backdrop-filter 0.3s ease",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[620px] bg-[#0e0e14] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)",
            transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Header Title & Filter Bar */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[#e50914]" />
              <span className="text-white font-extrabold text-lg tracking-tight">Search Catalog</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  ref={filterBtnRef}
                  onClick={openFilter}
                  className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl px-3 py-1.5 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                >
                  <span>{filterLabel}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      transform: filterOpen ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <ChevronDown size={13} />
                  </span>
                </button>

                {createPortal(
                  <div
                    className="fixed rounded-xl overflow-hidden border border-white/[0.12] bg-[#161620]"
                    style={{
                      top: filterPos.top,
                      left: filterPos.left,
                      zIndex: 99999,
                      minWidth: 180,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.8)",
                      opacity: filterOpen ? 1 : 0,
                      transform: filterOpen ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
                      pointerEvents: filterOpen ? "auto" : "none",
                      transition: "opacity 0.18s ease, transform 0.18s ease",
                    }}
                  >
                    {(["multi", "movie", "tv"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setFilterType(opt);
                          setFilterOpen(false);
                          setExpandedId(null);
                        }}
                        className={`flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold border-none cursor-pointer text-left transition-colors ${
                          opt !== "tv" ? "border-b border-white/[0.05]" : ""
                        } ${
                          filterType === opt
                            ? "bg-[#e50914] text-white"
                            : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        <span>{opt === "multi" ? "All Categories" : opt === "movie" ? "Movies Only" : "TV Series Only"}</span>
                        {filterType === opt && <CheckIcon size={12} />}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="w-8 h-8 flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.16] rounded-full text-zinc-400 hover:text-white transition-colors border-none cursor-pointer"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="px-6 pb-3">
            <div className="flex items-center gap-3 bg-[#08080c] rounded-2xl px-4 py-3 border border-white/10 focus-within:border-[#e50914] focus-within:ring-1 focus-within:ring-[#e50914] transition-all">
              <SearchIcon size={17} className="text-zinc-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setExpandedId(null);
                }}
                placeholder="Search by movie title, series, actor, or genre…"
                className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-zinc-500 font-medium"
              />
              {loading && (
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-[#e50914] rounded-full animate-spin flex-shrink-0" />
              )}
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0 flex"
                >
                  <CloseIcon size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Body Container */}
          <div
            ref={bodyRef}
            style={{
              height: bodyHeight ?? "auto",
              maxHeight: "62vh",
              overflowY: "auto",
              transition: "height 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              scrollbarWidth: "thin",
              scrollbarColor: "#2a2a2a transparent",
            }}
          >
            <div ref={innerRef}>
              {/* Recent Queries */}
              {!q && visibleRecent.length > 0 && (
                <div
                  className="px-6 py-4 border-t overflow-hidden"
                  style={{
                    borderColor: clearingRecent ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.06)",
                    transition: `border-color ${RECENT_CLEAR_ROW_MS}ms ease`,
                  }}
                >
                  <div
                    className="flex items-center justify-between mb-2.5"
                    style={{
                      opacity: clearingRecent ? 0 : 1,
                      transform: clearingRecent ? "translateX(-12px)" : "translateX(0)",
                      transition: `opacity ${RECENT_CLEAR_ROW_MS}ms ease, transform ${RECENT_CLEAR_ROW_MS}ms ease`,
                    }}
                  >
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={handleClearRecent}
                      disabled={clearingRecent}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-[#e50914] disabled:text-zinc-700 bg-transparent border-none cursor-pointer disabled:cursor-default transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  {visibleRecent.map((r, i) => {
                    const rowDelay = clearingRecent
                      ? (visibleRecent.length - i - 1) * RECENT_CLEAR_STAGGER_MS
                      : i * 40;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setQ(r)}
                        className="flex items-center gap-2.5 w-full px-2 py-2.5 bg-transparent border-none cursor-pointer text-zinc-300 hover:text-white hover:bg-white/[0.04] rounded-xl text-xs font-semibold text-left transition-colors overflow-hidden"
                        style={{
                          opacity: show && !clearingRecent ? 1 : 0,
                          pointerEvents: clearingRecent ? "none" : "auto",
                          transform: clearingRecent
                            ? "translateX(-24px)"
                            : show
                            ? "translateY(0)"
                            : "translateY(-6px)",
                          transition: `opacity ${RECENT_CLEAR_ROW_MS}ms ease ${rowDelay}ms, transform ${RECENT_CLEAR_ROW_MS}ms cubic-bezier(0.4, 0, 0.2, 1) ${rowDelay}ms`,
                        }}
                      >
                        <ClockIcon size={13} className="text-zinc-500" />
                        <span>{r}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty state when query has no results */}
              {!loading && trimmed.length >= 2 && results.length === 0 && (
                <div className="py-16 text-center px-6">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-3 text-zinc-500">
                    <SearchIcon size={16} />
                  </div>
                  <h4 className="text-white text-sm font-bold mb-1">No matches found</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    We couldn't find anything matching &ldquo;{trimmed}&rdquo;. Try another title or switch category filter.
                  </p>
                </div>
              )}

              {/* Results List */}
              <div key={resultsVersion}>
                {results.map((item, i) => {
                  const key = `${item.type}:${item.id}`;
                  const isExpanded = expandedId === key;
                  const hasRating = typeof item.vote_average === "number" && item.vote_average >= 1;

                  return (
                    <div
                      key={key}
                      ref={(el) => {
                        if (el) resultRefs.current.set(key, el);
                        else resultRefs.current.delete(key);
                      }}
                      className={`border-t border-white/[0.06] transition-colors ${
                        isExpanded ? "bg-white/[0.04]" : ""
                      }`}
                      style={{
                        animation: "slideInRow 0.22s ease both",
                        animationDelay: `${i * 35}ms`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpandedResult(key, isExpanded)}
                        className="flex items-center gap-3.5 w-full px-6 py-3.5 bg-transparent border-none cursor-pointer text-left hover:bg-white/[0.03] transition-colors"
                      >
                        <img
                          src={item.poster ?? undefined}
                          alt={item.title}
                          className="w-11 h-15 rounded-xl object-cover bg-zinc-800 flex-shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-bold truncate">{item.title}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                            <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                              {item.type === "tv" ? "TV Series" : "Movie"}
                            </span>
                            {item.year && (
                              <>
                                <span className="text-zinc-600">•</span>
                                <span>{item.year}</span>
                              </>
                            )}
                            {hasRating && (
                              <>
                                <span className="text-zinc-600">•</span>
                                <span className="flex items-center gap-1 font-bold text-amber-400">
                                  <StarIcon size={11} />
                                  {item.vote_average!.toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <span
                          className="text-zinc-500 flex-shrink-0 transition-transform duration-200"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          <ChevronDown size={14} />
                        </span>
                      </button>

                      {/* Expandable Overview & CTAs */}
                      <div
                        className="overflow-hidden transition-all duration-300"
                        style={{
                          maxHeight: isExpanded ? 220 : 0,
                          opacity: isExpanded ? 1 : 0,
                        }}
                      >
                        <div className="px-6 pb-4">
                          {item.overview && (
                            <p className="text-xs text-zinc-400 leading-relaxed mb-3.5 line-clamp-3 font-normal">
                              {item.overview}
                            </p>
                          )}
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handlePlay(item)}
                              className="flex items-center gap-1.5 bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-xs rounded-xl px-4 py-2 cursor-pointer border-none transition-colors shadow-md shadow-[#e50914]/20"
                            >
                              <PlayIcon size={12} />
                              <span>Watch Now</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDetails(item)}
                              className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-white font-semibold text-xs rounded-xl px-4 py-2 cursor-pointer border border-white/10 transition-colors"
                            >
                              <InfoIcon size={13} />
                              <span>Title Details</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
