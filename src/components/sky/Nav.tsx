import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { curveSwipePath } from "@/lib/modalMotion";
import { ExternalLink, X } from "lucide-react";
import { useArchiveViewMode } from "./ArchiveViewMode";

gsap.registerPlugin(useGSAP);

export function Nav() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const { archiveViewMode, toggleArchiveViewMode } = useArchiveViewMode();
  const paletteMode = archiveViewMode === "palette";

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
          <div className="justify-self-end">
            <button
              type="button"
              aria-label={paletteMode ? "Show photo grid" : "Show palette grid"}
              aria-pressed={paletteMode}
              onClick={toggleArchiveViewMode}
              className={cn(
                "pointer-events-auto inline-flex items-center gap-2 rounded-full px-1 py-1 text-ink transition-colors",
                paletteMode ? "text-ink" : "text-ink-faint hover:text-ink",
              )}
            >
              <span>Palette</span>
              <span
                aria-hidden
                className={cn(
                  "relative h-4 w-7 rounded-full border transition-colors",
                  paletteMode ? "border-ink/35 bg-ink" : "border-hairline bg-paper",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-[transform,background-color,box-shadow]",
                    paletteMode
                      ? "translate-x-3.5 bg-paper shadow-[0_0_0_1px_hsl(var(--paper)),0_1px_2px_rgba(0,0,0,0.2)]"
                      : "translate-x-0 bg-ink-faint shadow-none",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const wipeRef = useRef<SVGSVGElement | null>(null);
  const wipePathRef = useRef<SVGPathElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const entryTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const exitTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const isClosingRef = useRef(false);

  const close = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const modal = modalRef.current;
    const wipe = wipeRef.current;
    const wipePath = wipePathRef.current;
    const closeButton = closeButtonRef.current;
    const revealItems = contentRef.current ? Array.from(contentRef.current.querySelectorAll("[data-about-reveal]")) : [];
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!modal || !wipe || !wipePath || prefersReducedMotion) {
      onClose();
      return;
    }

    entryTimelineRef.current?.kill();
    exitTimelineRef.current?.kill();

    const curve = { edgeY: 100, controlY: 100 };
    const syncCurve = () => wipePath.setAttribute("d", curveSwipePath(curve.edgeY, curve.controlY));
    syncCurve();

    gsap.set(wipe, { autoAlpha: 1, clearProps: "transform", willChange: "contents" });

    exitTimelineRef.current = gsap.timeline({
      defaults: { ease: "power4.out" },
      onComplete: () => {
        exitTimelineRef.current = null;
        onClose();
      },
    });

    exitTimelineRef.current
      .addLabel("out", 0)
      .to([closeButton, ...revealItems].filter(Boolean), {
        autoAlpha: 0,
        y: -10,
        duration: 0.2,
        stagger: { each: 0.015, from: "end" },
      }, "out")
      .to(curve, { edgeY: 48, controlY: 0, duration: 0.34, ease: "power2.in", onUpdate: syncCurve }, "out")
      .to(curve, { edgeY: 0, controlY: 0, duration: 0.42, ease: "power2.out", onUpdate: syncCurve })
      .set(wipe, { clearProps: "willChange" });
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 520);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(focusTimer);
      entryTimelineRef.current?.kill();
      exitTimelineRef.current?.kill();
    };
  }, [close]);

  useGSAP(() => {
    isClosingRef.current = false;
    const modal = modalRef.current;
    const wipe = wipeRef.current;
    const wipePath = wipePathRef.current;
    const closeButton = closeButtonRef.current;
    const revealItems = contentRef.current ? Array.from(contentRef.current.querySelectorAll("[data-about-reveal]")) : [];
    if (!modal || !wipe || !wipePath) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      entryTimelineRef.current = null;
      gsap.set(modal, { autoAlpha: 1 });
      gsap.set(wipe, { autoAlpha: 0 });
      gsap.set([closeButton, ...revealItems].filter(Boolean), { autoAlpha: 1, clearProps: "transform" });
      return;
    }

    const curve = { edgeY: 0, controlY: 0 };
    const syncCurve = () => wipePath.setAttribute("d", curveSwipePath(curve.edgeY, curve.controlY));
    syncCurve();

    gsap.set(modal, { autoAlpha: 1 });
    gsap.set(wipe, { autoAlpha: 1, clearProps: "transform", willChange: "contents" });
    gsap.set(closeButton, { autoAlpha: 0, scale: 0.92 });
    gsap.set(revealItems, { autoAlpha: 0, y: 24 });

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    entryTimelineRef.current = tl;
    tl.addLabel("wipe", 0)
      .to(curve, { edgeY: 50, controlY: 0, duration: 0.34, ease: "power2.in", onUpdate: syncCurve }, "wipe")
      .to(curve, { edgeY: 100, controlY: 100, duration: 0.5, ease: "power2.out", onUpdate: syncCurve })
      .addLabel("content", 0.18)
      .to(revealItems, { autoAlpha: 1, y: 0, duration: 0.62, stagger: 0.055 }, "content")
      .to(closeButton, { autoAlpha: 1, scale: 1, duration: 0.34 }, "content+=0.14")
      .set(wipe, { autoAlpha: 0, clearProps: "willChange" });

    return () => {
      if (entryTimelineRef.current === tl) entryTimelineRef.current = null;
    };
  }, { scope: modalRef, dependencies: [], revertOnUpdate: true });

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      className="fixed inset-0 z-[60] h-screen w-screen overflow-y-auto opacity-0"
      onClick={close}
      style={{
        background: "var(--about-wash)",
      }}
    >
      <svg
        ref={wipeRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[90] h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path ref={wipePathRef} d={curveSwipePath()} fill="hsl(var(--paper))" />
      </svg>

      <button
        ref={closeButtonRef}
        onClick={(e) => { e.stopPropagation(); close(); }}
        aria-label="Close"
        className="fixed right-5 top-5 z-[80] grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-paper/70 text-ink backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <div
        ref={contentRef}
        className="relative z-[68] min-h-screen px-6 py-24 text-ink sm:px-[6vw] sm:py-28"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
          <div>
            <p data-about-reveal className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-faint">
              Heaven in Color
            </p>
            <h2
              id="about-title"
              data-about-reveal
              className="mt-8 max-w-[11ch] font-display text-[clamp(4.4rem,12vw,12rem)] leading-[0.9] tracking-[-0.03em]"
            >
              An archive of the sky.
            </h2>
          </div>

          <div data-about-reveal className="max-w-[36rem] text-[clamp(1rem,1.45vw,1.35rem)] leading-[1.45] text-ink-dim">
            <p>
              A Raspberry Pi watches the San Francisco sky every thirty minutes. Each frame is
              reduced, archived, and arranged into a living grid of light, weather, and time.
            </p>
            <p className="mt-5">
              The image is small on purpose. The accumulation is the photograph.
            </p>
          </div>
        </div>

        <div data-about-reveal className="mx-auto mt-16 h-px max-w-[1180px] bg-ink/12" />

        <div className="mx-auto mt-10 grid max-w-[1180px] gap-x-10 gap-y-9 sm:grid-cols-3">
          {[
            ["01", "Every 30 minutes", "A day becomes a row, moving from morning light through evening color."],
            ["02", "Stored on GitHub", "The archive is built to keep years of tiny sky records online."],
            ["03", "Computed palettes", "Each frame carries its own color notes, ready to copy, compare, or wander through."],
          ].map(([index, title, body]) => (
            <section key={index} data-about-reveal className="border-t border-ink/14 pt-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">{index}</div>
              <h3 className="mt-5 font-display text-[clamp(1.8rem,3vw,3.1rem)] leading-none">{title}</h3>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-dim">{body}</p>
            </section>
          ))}
        </div>

        <div data-about-reveal className="mx-auto mt-16 flex max-w-[1180px] justify-start">
          <a
            href="https://www.haggard.design/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/18 bg-paper/55 px-4 text-[13px] text-ink backdrop-blur-md transition-colors hover:border-ink/35 hover:bg-paper/85"
          >
            By Haggard and Associates LLC
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
          </a>
        </div>
      </div>
    </div>
  );
}
