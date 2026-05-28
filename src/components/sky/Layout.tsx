import { Outlet } from "react-router-dom";
import { Nav } from "./Nav";
import { ArchiveViewModeProvider } from "./ArchiveViewMode";

export default function Layout() {
  return (
    <ArchiveViewModeProvider>
      <div className="min-h-screen bg-paper text-foreground transition-colors duration-700">
        <Nav />
        <main className="px-6 pb-4 pt-16">
          <Outlet />
        </main>
      </div>
    </ArchiveViewModeProvider>
  );
}
