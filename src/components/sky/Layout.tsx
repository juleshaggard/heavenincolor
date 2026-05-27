import { Outlet } from "react-router-dom";
import { Nav } from "./Nav";
import { ArchiveViewModeProvider } from "./ArchiveViewMode";

export default function Layout() {
  return (
    <ArchiveViewModeProvider>
      <div className="min-h-screen bg-paper text-foreground">
        <Nav />
        <main className="px-6 pb-4 pt-16">
          <Outlet />
        </main>
      </div>
    </ArchiveViewModeProvider>
  );
}
