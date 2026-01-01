import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import TrainsetDetails from "./pages/TrainsetDetails";
import WhatIfPage from "./pages/WhatIfPage";
import NotFound from "@/pages/NotFound";
import IngestPage from "./pages/IngestPage";
import IngestionRunsPage from "./pages/IngestionRunsPage";
import ScoredInductionPage from "./pages/ScoredInductionPage";
import AuditLogPage from "./pages/AuditLogPage";
import DecisionDashboard from "@/pages/DecisionDashboard";
import DSADemoPage from "@/pages/DSADemoPage";
import AdminLogin from "./admin/AdminLogin";
import AdminSignup from "./admin/AdminSignup";
import ProtectedRoute from "./auth/ProtectedRoute";

import { ServicesProvider } from "@/context/ServicesProvider";
import { AuthProvider } from "@/context/AuthProvider";
import Toast from "@/components/Toast";
import DebugPanel from "@/components/DebugPanel";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Toast />
            <DebugPanel />

            <BrowserRouter>
              <Routes>
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/signup" element={<AdminSignup />} />

                <Route path="/" element={<Home />} />
                <Route path="/trainset/:id" element={<TrainsetDetails />} />
                <Route path="/whatif" element={<WhatIfPage />} />
                <Route path="/ingest" element={<IngestPage />} />
                <Route path="/ingestion-runs" element={<IngestionRunsPage />} />
                <Route path="/scored-induction" element={<ScoredInductionPage />} />
                <Route path="/audit" element={<AuditLogPage />} />
                <Route path="/decision" element={<DecisionDashboard />} />
                <Route path="/dsa" element={<DSADemoPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ServicesProvider>
    </QueryClientProvider>
  );
};

export default App;
