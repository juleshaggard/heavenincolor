import { Outlet } from "react-router-dom";
import { Aurora } from "./Aurora";
import { Nav } from "./Nav";

export default function Layout() {
  return (
    <div className="grain min-h-screen bg-background text-foreground">
      <Aurora />
      <Nav />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-8">
        <Outlet />
      </main>
      <footer className="border-t border-hairline py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
        Captured every 30 minutes · since the sky began
      </footer>
    </div>
  );
}