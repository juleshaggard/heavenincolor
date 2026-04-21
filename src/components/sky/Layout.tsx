import { Outlet } from "react-router-dom";
import { Aurora } from "./Aurora";
import { Nav } from "./Nav";

export default function Layout() {
  return (
    <div className="grain min-h-screen bg-paper text-foreground">
      <Aurora />
      <Nav />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-8">
        <Outlet />
      </main>
      <footer className="border-t border-hairline/30 py-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint">
        captured every 30 minutes · since the sky began
      </footer>
    </div>
  );
}