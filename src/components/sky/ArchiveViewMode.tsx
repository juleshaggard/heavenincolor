import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ArchiveViewMode = "photo" | "palette";

type ArchiveViewModeContextValue = {
  archiveViewMode: ArchiveViewMode;
  setArchiveViewMode: (mode: ArchiveViewMode) => void;
  toggleArchiveViewMode: () => void;
};

const ArchiveViewModeContext = createContext<ArchiveViewModeContextValue | null>(null);

const STORAGE_KEY = "heaven:archive-view-mode";

function readInitialMode(): ArchiveViewMode {
  if (typeof window === "undefined") return "photo";
  return window.localStorage.getItem(STORAGE_KEY) === "palette" ? "palette" : "photo";
}

export function ArchiveViewModeProvider({ children }: { children: ReactNode }) {
  const [archiveViewMode, setArchiveViewMode] = useState<ArchiveViewMode>(readInitialMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, archiveViewMode);
  }, [archiveViewMode]);

  const value = useMemo<ArchiveViewModeContextValue>(
    () => ({
      archiveViewMode,
      setArchiveViewMode,
      toggleArchiveViewMode: () => setArchiveViewMode((mode) => (mode === "palette" ? "photo" : "palette")),
    }),
    [archiveViewMode],
  );

  return <ArchiveViewModeContext.Provider value={value}>{children}</ArchiveViewModeContext.Provider>;
}

export function useArchiveViewMode() {
  const context = useContext(ArchiveViewModeContext);
  if (!context) {
    throw new Error("useArchiveViewMode must be used within ArchiveViewModeProvider");
  }
  return context;
}
