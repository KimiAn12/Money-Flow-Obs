import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import IndustryFlow from "./pages/IndustryFlow";
import GlobalMarkets from "./pages/GlobalMarkets";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <Routes>
      <Route path="/" element={<IndustryFlow />} />
      <Route path="/global-markets" element={<GlobalMarkets />} />
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
