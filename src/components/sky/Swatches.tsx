import { useState } from "react";
import { cn } from "@/lib/utils";

export function Swatches({
  swatches,
  size = "md",
  className,
  copyable = true,
}: {
  swatches: string[];
  size?: "sm" | "md" | "lg";
  className?: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const dim = size === "lg" ? "h-14" : size === "sm" ? "h-2" : "h-10";
  return (
    <div className={cn("flex w-full overflow-hidden rounded-xl shadow-neu", dim, className)}>
      {swatches.map((c, i) => (
        <button
          key={i + c}
          type="button"
          onClick={() => {
            if (!copyable) return;
            navigator.clipboard?.writeText(c);
            setCopied(c);
            window.setTimeout(() => setCopied(null), 1200);
          }}
          title={c.toUpperCase()}
          className="group relative flex-1 transition-all duration-300 hover:flex-[1.6] focus:outline-none"
          style={{ background: c }}
        >
          {size !== "sm" && (
            <span
              className={cn(
                "pointer-events-none absolute inset-0 grid place-items-center text-center font-mono text-[10px] uppercase tracking-[0.2em] mix-blend-difference text-white transition-opacity",
                copied === c ? "opacity-100" : "opacity-0 group-hover:opacity-90",
              )}
            >
              {copied === c ? "copied" : c.toUpperCase()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}