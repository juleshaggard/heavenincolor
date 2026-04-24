import { Outlet } from "react-router-dom";
import { Nav } from "./Nav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-paper text-foreground">
      <Nav />
      <main className="px-6 pb-24 pt-16">
        <Outlet />
      </main>
    </div>
  );
}