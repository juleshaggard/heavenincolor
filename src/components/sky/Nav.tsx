import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Now" },
  { to: "/calendar", label: "Calendar" },
  { to: "/compare", label: "Compare" },
  { to: "/archive", label: "Archive" },
];

export function Nav() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-hairline/20 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--paper) / 0.92), hsl(var(--paper) / 0.6)), hsl(var(--sky-h) var(--sky-s) var(--sky-l) / 0.05)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <NavLink to="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl italic tracking-tight text-ink">Sky</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">archive</span>
          <span
            className="ml-2 h-2 w-2 rounded-full transition-shadow group-hover:scale-125"
            style={{
              background: "hsl(var(--sky-h) var(--sky-s) var(--sky-l))",
              boxShadow: "0 0 12px hsl(var(--sky-h) var(--sky-s) var(--sky-l) / 0.8)",
            }}
          />
        </NavLink>
        <nav className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em]">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-sm px-3 py-1.5 transition-colors",
                  isActive ? "text-ink bg-secondary" : "text-ink-dim hover:text-ink",
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