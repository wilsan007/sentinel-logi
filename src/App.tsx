import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Habillement from "./pages/Habillement";
import Alimentaire from "./pages/Alimentaire";
import Personnel from "./pages/Personnel";
import Procurement from "./pages/Procurement";
import Demandes from "./pages/Demandes";
import Loans from "./pages/Loans";
import Export from "./pages/Export";
import Fleet from "./pages/Fleet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/habillement" element={<Habillement />} />
          <Route path="/alimentaire" element={<Alimentaire />} />
          <Route path="/personnel" element={<Personnel />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/demandes" element={<Demandes />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/export" element={<Export />} />
          <Route path="/fleet" element={<Fleet />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
