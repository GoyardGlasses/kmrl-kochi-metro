import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, RefreshCw } from "lucide-react";
import type { AuditAction } from "@/types";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formatDateTime = (iso: string) => {
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

const AuditLogPage = () => {
  const navigate = useNavigate();

  const [action, setAction] = useState<AuditAction | "ALL">("ALL");
  const [trainsetId, setTrainsetId] = useState<string>("");
  const [page, setPage] = useState(0);

  const limit = 25;
  const skip = page * limit;

  const { data, isLoading, isError, refetch, isFetching } = useAuditLogs({
    limit,
    skip,
    action,
    trainsetId,
  });

  const rows = data?.logs ?? [];

  const canPrev = page > 0;
  const canNext = rows.length === limit;

  const title = useMemo(() => {
    if (action !== "ALL" && trainsetId) return `Audit Logs: ${action} for ${trainsetId}`;
    if (action !== "ALL") return `Audit Logs: ${action}`;
    if (trainsetId) return `Audit Logs: ${trainsetId}`;
    return "Audit Logs";
  }, [action, trainsetId]);

  if (isLoading) {
    return <Loader fullScreen message="Loading audit logs..." />;
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
              <CardTitle className="flex items-center justify-between">
                <span>{title}</span>
                <span className="text-xs text-muted-foreground">Showing {rows.length} / {limit}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="w-3 h-3" /> Action
                  </div>
                  <Select value={action} onValueChange={(v) => { setPage(0); setAction(v as any); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="UPDATE_DECISION">UPDATE_DECISION</SelectItem>
                      <SelectItem value="SIMULATE">SIMULATE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Trainset ID</div>
                  <Input
                    value={trainsetId}
                    onChange={(e) => { setPage(0); setTrainsetId(e.target.value); }}
                    placeholder="e.g. TS-001"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPage(0);
                      setAction("ALL");
                      setTrainsetId("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {isError ? (
                <div className="text-sm text-destructive">Failed to load audit logs.</div>
              ) : (
                <div className="overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/30">
                      <tr className="text-left">
                        <th className="p-3">Time</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Trainset</th>
                        <th className="p-3">Actor</th>
                        <th className="p-3">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row._id} className="border-t">
                          <td className="p-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                          <td className="p-3 font-mono">{row.action}</td>
                          <td className="p-3 font-mono">{row.trainsetId ?? "-"}</td>
                          <td className="p-3">{row.actorEmail ?? "-"}</td>
                          <td className="p-3 text-muted-foreground">
                            {row.action === "UPDATE_DECISION" ? (
                              <span>
                                {row.before?.recommendation ?? "?"} → {row.after?.recommendation ?? "?"}
                              </span>
                            ) : (
                              <span>
                                Simulated ({row.metadata?.resultCounts?.REVENUE ?? 0} R / {row.metadata?.resultCounts?.STANDBY ?? 0} S / {row.metadata?.resultCounts?.IBL ?? 0} I)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                            No audit logs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
                  Previous
                </Button>
                <div className="text-xs text-muted-foreground">Page {page + 1}</div>
                <Button variant="outline" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AuditLogPage;
