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
  const dim = size === "lg" ? "h-12" : size === "sm" ? "h-2" : "h-6";
  return (
    <div className={cn("flex w-full overflow-hidden rounded-sm", dim, className)}>
      {swatches.map((c, i) => (
        <button
          key={i + c}
          type="button"
          onClick={() => {
            if (!copyable) return;
            navigator.clipboard?.writeText(c);
            setCopied(c);
            window.setTimeout(() => setCopied(null), 900);
          }}
          title={c.toUpperCase()}
          className="group relative flex-1 transition-all duration-300 hover:flex-[1.6]"
          style={{ background: c }}
        >
          {size === "lg" && (
            <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-[10px] uppercase opacity-0 transition-opacity group-hover:opacity-90 mix-blend-difference text-white">
              {copied === c ? "copied" : c}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}