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
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route 
        path="/industry-flow" 
        element={
          <div className="flex-1 min-h-0 overflow-hidden">
            <IndustryFlow />
          </div>
        } 
      />
      <Route 
        path="/global-markets" 
        element={
          <div className="flex-1 min-h-0 overflow-hidden">
            <GlobalMarkets />
          </div>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
