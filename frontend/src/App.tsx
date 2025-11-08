import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Hero from "./pages/Hero";
import IndustryFlow from "./pages/IndustryFlow";
import GlobalMarkets from "./pages/GlobalMarkets";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => (
  <div className="h-screen bg-background overflow-hidden flex flex-col">
    <Navbar />
    <div className="flex-1 min-h-0 overflow-hidden">
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/industry-flow" element={<IndustryFlow />} />
        <Route path="/global-markets" element={<GlobalMarkets />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
