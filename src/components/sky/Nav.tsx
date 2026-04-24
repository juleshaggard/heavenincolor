import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Grid" },
  { to: "/now", label: "Real Time" },
  { to: "/calendar", label: "Calendar" },
];

export function Nav() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <NavLink to="/" className="flex items-baseline gap-3">
          <span className="text-[15px] font-bold tracking-tight text-ink">SKY ARCHIVE</span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-ink-faint">San Francisco</span>
        </NavLink>
        <nav className="flex items-center gap-6 text-[12px] uppercase tracking-[0.18em]">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "py-1.5 transition-colors",
                  isActive ? "text-ink border-b border-ink" : "text-ink-faint hover:text-ink",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}