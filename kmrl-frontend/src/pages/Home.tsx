import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Decision } from "@/types";

import { useAuth } from "@/context/AuthProvider";
import { useTrainsets } from "@/hooks/useTrainsets";
import { Loader } from "@/components/Loader";
import { getDecisionCounts } from "@/lib/trainsets";
import { showToast } from "@/lib/toast";

import KPISummary from "@/components/KPISummary";
import ContextBanner from "@/components/ContextBanner";
import TrainsetTable from "@/components/TrainsetTable";
import ExplainPanel from "@/components/ExplainPanel";
import RecommendationPanel from "@/components/RecommendationPanel";
/*  import WhatIfPanel from "@/components/WhatIfPanel"; */
import DraggableTrainsetBoard from "@/components/DraggableTrainsetBoard";

import { LayoutGrid, Table, LogOut, User, Database, FileText, TrendingUp, ClipboardList, Brain } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: trainsets = [], isLoading, isError, updateDecision, updateError } = useTrainsets();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  useEffect(() => {
    if (updateError) {
      showToast("Failed to update trainset decision", "error");
    }
  }, [updateError]);

  const counts = getDecisionCounts(trainsets);
  const selectedTrainset = trainsets.find((t) => t.id === selectedId) || null;

  const handleDecisionChange = async (id: string, decision: Decision) => {
    try {
      await updateDecision({ id, payload: { recommendation: decision, manualOverride: true } });
      showToast("Decision updated successfully", "success");
    } catch {
      showToast("Failed to update decision", "error");
    }
  };

  const handleDragEnd = async (trainsetId: string, newDecision: Decision) => {
    try {
      await updateDecision({
        id: trainsetId,
        payload: { recommendation: newDecision, manualOverride: true },
      });
      showToast("Decision updated successfully", "success");
    } catch {
      showToast("Failed to update decision", "error");
    }
  };

  /*  logout */
  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  if (isLoading) {
    return <Loader fullScreen message="Loading dashboard..." />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-foreground">
            We couldn't load the trainsets right now.
          </p>
          <p className="text-sm text-muted-foreground">Please refresh and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
<div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
  <img src="/logo.jpg" alt="KMR Logo" className="w-29 h-12 object-cover" />

</div>

              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Kochi Metro Rail
                </h1>
                <p className="text-sm text-muted-foreground">
                  Decision Support Dashboard
                </p>
              </div>
            </div>

            {/* Toggle and Profile */}
            <div className="flex items-center gap-2 relative">
              {/* Navigation */}
              <button
                onClick={() => navigate("/ingest")}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                title="Ingestion"
              >
                <Database className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate("/ingestion-runs")}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                title="Ingestion Runs"
              >
                <FileText className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate("/scored-induction")}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                title="Scored Induction"
              >
                <TrendingUp className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate("/audit")}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                title="Audit Logs"
              >
                <ClipboardList className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate("/decision")}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                title="Decision Support"
              >
                <Brain className="w-5 h-5" />
              </button>

              {/* Toggle */}
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
                title="Table View"
              >
                <Table className="w-5 h-5" />
              </button>

              <button
                onClick={() => setViewMode("board")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "board"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>

              {/* Profile */}
              <button
                onClick={() => setShowProfile((p) => !p)}
                className="ml-2 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition"
              >
                <User className="w-5 h-5" />
              </button>

              {/* profile drop */}
              {showProfile && (
                <div className="absolute right-0 top-14 w-56 rounded-xl border border-border bg-card shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <p className="text-sm text-muted-foreground">
                      Logged in as
                    </p>
                    <p className="font-medium truncate">
                      {user?.email ?? "Admin"}
                    </p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
<main className="w-full px-6 py-6">
        <ContextBanner />
        <KPISummary
          revenue={counts.REVENUE}
          standby={counts.STANDBY}
          ibl={counts.IBL}
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
  <div className="xl:col-span-3 space-y-6">

            {viewMode === "table" ? (
              <TrainsetTable
                trainsets={trainsets}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDecisionChange={handleDecisionChange}
              />
            ) : (
              <DraggableTrainsetBoard
                trainsets={trainsets}
                onDragEnd={handleDragEnd}
              />
            )}
          </div>

          <div className="space-y-6">
            <ExplainPanel trainset={selectedTrainset} />
            <RecommendationPanel
              trainsets={trainsets}
              onSelect={setSelectedId}
            />
          </div>
        </div>
      </main>



      {/* Footer*/}
      <footer className="border-t border-border bg-card/30 mt-12">
<div className="w-full px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            KMRL Trainset Decision Support System • MVP Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
