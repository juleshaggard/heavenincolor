import { Outlet } from "react-router-dom";
import { Nav } from "./Nav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-paper text-foreground">
      <Nav />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-10">
        <Outlet />
      </main>
      <footer className="border-t border-hairline py-6 text-center text-[10px] uppercase tracking-[0.25em] text-ink-faint">
        captured every 30 minutes · since the sky began
      </footer>
    </div>
  );
}