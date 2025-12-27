import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Filter, Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "@/components/Loader";
import { useIngestionRuns } from "@/hooks/useIngestionRuns";
import { useIngestionRun } from "@/hooks/useIngestionRun";
import { useRunIngestionNow } from "@/hooks/useRunIngestionNow";
import { useIngestionNotificationSettings } from "@/hooks/useIngestionNotificationSettings";
import type { IngestionStatus } from "@/types";

const formatDateTime = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
};

export default function IngestionRunsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [source, setSource] = useState<string>("ALL");
  const [status, setStatus] = useState<IngestionStatus | "ALL">("ALL");
  const [search, setSearch] = useState<string>("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);

  const { runMaximo, runMaximoStatus, runFitness, runFitnessStatus } = useRunIngestionNow();
  const settings = useIngestionNotificationSettings();
  const runDetails = useIngestionRun(selectedRunId, detailsOpen);

  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(false);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);

  const limit = 25;
  const skip = page * limit;

  const { data, isLoading, isFetching, refetch } = useIngestionRuns({
    limit,
    skip,
    source: source === "ALL" ? undefined : source,
    status: status === "ALL" ? undefined : status,
  });

  const rows = useMemo(() => {
    const base = data?.runs ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => {
      const err = (r.error || "").toLowerCase();
      const src = (r.source || "").toLowerCase();
      return err.includes(q) || src.includes(q) || (r._id || "").toLowerCase().includes(q);
    });
  }, [data?.runs, search]);

  const canPrev = page > 0;
  const canNext = (data?.runs?.length || 0) === limit;

  if (settings.data) {
    // lightweight sync without adding new effects
    if (settingsEmail === "" && settingsPhone === "" && notifyOnSuccess === false && notifyOnFailure === true) {
      setSettingsEmail(settings.data.email || "");
      setSettingsPhone(settings.data.phone || "");
      setNotifyOnSuccess(!!settings.data.notifyOnSuccess);
      setNotifyOnFailure(!!settings.data.notifyOnFailure);
    }
  }

  if (isLoading) {
    return <Loader fullScreen message="Loading ingestion runs..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => runMaximo()}
              disabled={runMaximoStatus === "pending"}
              title="Run Maximo Job Cards ingestion now"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Maximo
            </Button>
            <Button
              variant="outline"
              onClick={() => runFitness()}
              disabled={runFitnessStatus === "pending"}
              title="Run Fitness ingestion now"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Fitness
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <Input value={settingsEmail} onChange={(e) => setSettingsEmail(e.target.value)} placeholder="alerts@example.com" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <Input value={settingsPhone} onChange={(e) => setSettingsPhone(e.target.value)} placeholder="+91xxxxxxxxxx" />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={notifyOnSuccess} onCheckedChange={(v) => setNotifyOnSuccess(!!v)} />
                  Notify on success
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={notifyOnFailure} onCheckedChange={(v) => setNotifyOnFailure(!!v)} />
                  Notify on failure
                </label>
                <div className="flex-1" />
                <Button
                  variant="default"
                  onClick={() =>
                    settings.save({
                      email: settingsEmail,
                      phone: settingsPhone,
                      notifyOnSuccess,
                      notifyOnFailure,
                    })
                  }
                  disabled={settings.saveStatus === "pending"}
                >
                  Save
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Email/SMS will only send if backend SMTP/Twilio env vars are configured.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Ingestion Runs</span>
                <span className="text-xs text-muted-foreground">Showing {rows.length} / {limit}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="w-3 h-3" /> Source
                  </div>
                  <Select value={source} onValueChange={(v) => { setPage(0); setSource(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="MAXIMO_JOB_CARDS">MAXIMO_JOB_CARDS</SelectItem>
                      <SelectItem value="FITNESS">FITNESS</SelectItem>
                      <SelectItem value="UNS_FITNESS">UNS_FITNESS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Select value={status} onValueChange={(v) => { setPage(0); setStatus(v as any); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="RUNNING">RUNNING</SelectItem>
                      <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                      <SelectItem value="FAILED">FAILED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Search</div>
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by source/id/error" />
                </div>
              </div>

              <div className="overflow-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Source</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Started</th>
                      <th className="px-3 py-2 text-left">Finished</th>
                      <th className="px-3 py-2 text-right">Read</th>
                      <th className="px-3 py-2 text-right">Upserted</th>
                      <th className="px-3 py-2 text-right">Trainsets</th>
                      <th className="px-3 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r._id}
                        className="border-t border-border cursor-pointer hover:bg-secondary/30"
                        onClick={() => {
                          setSelectedRunId(r._id);
                          setDetailsOpen(true);
                        }}
                        title="Click to view details"
                      >
                        <td className="px-3 py-2 font-mono">{r.source}</td>
                        <td className="px-3 py-2 font-mono">{r.status}</td>
                        <td className="px-3 py-2">{formatDateTime(r.startedAt)}</td>
                        <td className="px-3 py-2">{formatDateTime(r.finishedAt)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.recordsRead ?? "-"}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.recordsUpserted ?? "-"}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.trainsetsUpdated ?? "-"}</td>
                        <td className="px-3 py-2 text-xs text-red-600 max-w-[360px] truncate" title={r.error || ""}>{r.error || ""}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                          No ingestion runs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Prev
                </Button>
                <div className="text-xs text-muted-foreground">Page {page + 1}</div>
                <Button variant="outline" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={detailsOpen}
            onOpenChange={(open) => {
              setDetailsOpen(open);
              if (!open) setSelectedRunId(undefined);
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Ingestion Run Details
                </DialogTitle>
                <DialogDescription>
                  {selectedRunId ? `Run ID: ${selectedRunId}` : ""}
                </DialogDescription>
              </DialogHeader>

              {runDetails.isLoading ? (
                <div className="py-8">
                  <Loader fullScreen={false} message="Loading run details..." />
                </div>
              ) : runDetails.data ? (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Source</div>
                      <div className="font-mono">{runDetails.data.source}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="font-mono">{runDetails.data.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Started</div>
                      <div className="font-mono">{formatDateTime(runDetails.data.startedAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Finished</div>
                      <div className="font-mono">{formatDateTime(runDetails.data.finishedAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Read</div>
                      <div className="font-mono">{runDetails.data.recordsRead ?? "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Upserted</div>
                      <div className="font-mono">{runDetails.data.recordsUpserted ?? "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Trainsets updated</div>
                      <div className="font-mono">{runDetails.data.trainsetsUpdated ?? "-"}</div>
                    </div>
                  </div>

                  {runDetails.data.error ? (
                    <div className="rounded-md border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Error</div>
                      <pre className="whitespace-pre-wrap text-red-600 text-xs">{runDetails.data.error}</pre>
                    </div>
                  ) : null}

                  {runDetails.data.metadata ? (
                    <div className="rounded-md border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Metadata</div>
                      <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(runDetails.data.metadata, null, 2)}</pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No details available.</div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
