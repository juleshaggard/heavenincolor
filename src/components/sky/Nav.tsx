import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Grid" },
  { to: "/now", label: "Real Time" },
];

export function Nav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="flex items-start justify-between px-6 py-5 text-[13px]">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              cn(
                "pointer-events-auto transition-colors",
                isActive ? "text-ink underline underline-offset-4" : "text-ink-dim hover:text-ink",
              )
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}