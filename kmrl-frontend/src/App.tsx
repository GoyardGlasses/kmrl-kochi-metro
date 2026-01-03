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
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import { ServicesProvider } from "@/context/ServicesProvider";
import { AuthProvider } from "@/context/AuthProvider";
import Toast from "@/components/Toast";
import DebugPanel from "@/components/DebugPanel";
import ProtectedRoute from "./auth/ProtectedRoute";

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
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* Protected Routes - require authentication */}
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/trainset/:id" element={<ProtectedRoute><TrainsetDetails /></ProtectedRoute>} />
                <Route path="/whatif" element={<ProtectedRoute><WhatIfPage /></ProtectedRoute>} />
                <Route path="/ingest" element={<ProtectedRoute><IngestPage /></ProtectedRoute>} />
                <Route path="/ingestion-runs" element={<ProtectedRoute><IngestionRunsPage /></ProtectedRoute>} />
                <Route path="/scored-induction" element={<ProtectedRoute><ScoredInductionPage /></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
                <Route path="/decision" element={<ProtectedRoute><DecisionDashboard /></ProtectedRoute>} />
                <Route path="/dsa" element={<ProtectedRoute><DSADemoPage /></ProtectedRoute>} />

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
