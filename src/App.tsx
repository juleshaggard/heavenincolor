import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/sky/Layout";
import Now from "./pages/Now";
import Timelapse from "./pages/Timelapse";
import CalendarPage from "./pages/Calendar";
import ComparePage from "./pages/Compare";
import Archive from "./pages/Archive";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Now />} />
            <Route path="/timelapse" element={<Timelapse />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/archive" element={<Archive />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
