import { Link } from "react-router-dom";

const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

type Actor = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

export function ActorCard({ actor }: { actor: Actor }) {
  const img = actor.profile_path ? `${PROFILE_BASE}${actor.profile_path}` : null;

  return (
    <Link
      to={`/actor/${actor.id}`}
      className="group flex items-center gap-3 bg-[#111118] hover:bg-[#191924] border border-white/[0.06] hover:border-white/20 rounded-2xl p-2.5 transition-all duration-200 select-none"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/10 group-hover:ring-[#e50914] transition-all">
        {img ? (
          <img
            src={img}
            alt={actor.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 font-bold">
            {actor.name.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="min-w-0 pr-1">
        <h4 className="text-xs font-bold text-white group-hover:text-[#e50914] transition-colors truncate">
          {actor.name}
        </h4>
        {actor.character && (
          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
            {actor.character}
          </p>
        )}
      </div>
    </Link>
  );
}