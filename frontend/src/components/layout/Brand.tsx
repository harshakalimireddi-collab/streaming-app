import { Link } from "react-router-dom";

type BrandProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  linkToHome?: boolean;
};

export function Brand({
  className = "",
  markClassName = "",
  wordmarkClassName = "",
  linkToHome = true,
}: BrandProps) {
  const content = (
    <div className={`flex items-center gap-2.5 group/brand select-none ${className}`}>
      {/* Cinematic Geometric Icon Mark */}
      <div
        className={`relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#e50914] to-[#99060e] shadow-md shadow-[#e50914]/25 transition-transform duration-300 group-hover/brand:scale-105 ${markClassName}`}
      >
        {/* Subtle geometric aperture shape */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white">
          <path
            d="M5 3.5L19 12L5 20.5V3.5Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`text-[15px] font-extrabold tracking-tight text-white leading-none ${wordmarkClassName}`}
        >
          CINE<span className="text-[#e50914]">VAULT</span>
        </span>
        <span className="text-[9px] font-semibold tracking-widest text-zinc-500 uppercase leading-none mt-0.5">
          Cinema & TV
        </span>
      </div>
    </div>
  );

  if (linkToHome) {
    return (
      <Link to="/" aria-label="CineVault Home" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
