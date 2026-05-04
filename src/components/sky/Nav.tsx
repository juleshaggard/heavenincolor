import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Nav() {
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!aboutOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAboutOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [aboutOpen]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="grid grid-cols-3 items-start px-6 py-5 text-[13px]">
          <div className="justify-self-start" />
          <div className="justify-self-center">
            <button
              onClick={() => setAboutOpen(true)}
              className="pointer-events-auto text-ink-dim transition-colors hover:text-ink"
            >
              About
            </button>
          </div>
          <div className="justify-self-end" />
        </div>
      </header>

      {aboutOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 backdrop-blur-md animate-fade-in"
          onClick={() => setAboutOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setAboutOpen(false); }}
            aria-label="Close"
            className="fixed right-5 top-5 z-[90] grid h-11 w-11 place-items-center rounded-full bg-paper/90 text-ink shadow-neu backdrop-blur-md transition-all hover:scale-105 hover:bg-paper active:shadow-neu-pressed"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div
            className="relative max-w-xl rounded-2xl bg-paper p-10 text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-4xl leading-tight">About</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-dim">
              <p>
                Sky Archive is an ongoing record of the sky over San Francisco — a single
                photograph captured every thirty minutes, day and night, archived with the
                color of that exact moment.
              </p>
              <p>
                It's a small meditation on time, weather, and how light keeps changing
                even when nothing else seems to.
              </p>
            </div>
            <a
              href="https://www.jonathanhaggard.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper transition-colors hover:bg-ink-dim"
            >
              By Haggard ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}