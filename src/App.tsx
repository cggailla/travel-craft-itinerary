import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoginForm } from "@/components/auth/LoginForm";
import Dashboard from "./pages/Dashboard";
import IndexNew from "./pages/IndexNew";
import TravelBooklet from "./pages/TravelBooklet";
import TravelQuote from "./pages/TravelQuote";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Route publique de login */}
            <Route path="/login" element={<LoginForm />} />
            
            {/* Routes protégées */}
            <Route element={<ProtectedRoute />}>
              {/* Dashboard - nouvelle page d'accueil */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Création/édition de voyage */}
              <Route path="/trip/create" element={<IndexNew />} />
              <Route path="/trip/:tripId" element={<IndexNew />} />
              
              {/* Génération PDF */}
              <Route path="/booklet" element={<TravelBooklet />} />
              
              {/* Génération Devis */}
              <Route path="/quote" element={<TravelQuote />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
