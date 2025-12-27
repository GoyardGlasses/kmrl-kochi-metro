import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import TrainsetDetails from "./pages/TrainsetDetails";
import WhatIfPage from "./pages/WhatIfPage";
import NotFound from "./pages/NotFound";
import AuditLogPage from "@/pages/AuditLogPage";
import IngestPage from "@/pages/IngestPage";
import ScoredInductionPage from "@/pages/ScoredInductionPage";
import IngestionRunsPage from "@/pages/IngestionRunsPage";

import AdminLogin from "./admin/AdminLogin";
import AdminSignup from "./admin/AdminSignup";

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
                <Route path="/" element={<Home />} />

                <Route path="/trainset/:id" element={<TrainsetDetails />} />

                <Route path="/whatif" element={<WhatIfPage />} />

                <Route path="/admin/audit" element={<AuditLogPage />} />

                <Route path="/admin/ingest" element={<IngestPage />} />

                <Route path="/admin/ingestion-runs" element={<IngestionRunsPage />} />

                <Route path="/admin/scored-induction" element={<ScoredInductionPage />} />

                <Route path="/admin/login" element={<Navigate to="/" replace />} />
                <Route path="/admin/signup" element={<Navigate to="/" replace />} />

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
