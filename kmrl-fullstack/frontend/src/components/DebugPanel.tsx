import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Trash2, Copy } from "lucide-react";
import { getLogs, clearLogs } from "@/lib/logger";

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState(getLogs());
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs([...getLogs()]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.level.toLowerCase().includes(filter.toLowerCase())
  );

  const copyToClipboard = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
  };

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-96 max-h-96 bg-card border border-border rounded-lg shadow-xl flex flex-col">
      <div
        className="flex items-center justify-between p-3 border-b border-border cursor-pointer hover:bg-secondary/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-semibold text-foreground text-sm">Debug Logs</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{logs.length} logs</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <>
          <div className="p-2 border-b border-border space-y-2">
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-secondary/30 border border-border rounded text-foreground placeholder-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 px-2 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors flex items-center justify-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <button
                onClick={() => {
                  clearLogs();
                  setLogs([]);
                }}
                className="flex-1 px-2 py-1 text-xs bg-ibl/20 text-ibl rounded hover:bg-ibl/30 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 p-2 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <p className="text-muted-foreground">No logs match filter</p>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-1 rounded ${
                    log.level === "error"
                      ? "bg-ibl/10 text-ibl"
                      : log.level === "warn"
                      ? "bg-standby/10 text-standby"
                      : log.level === "info"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <div className="flex gap-2">
                    <span className="text-muted-foreground flex-shrink-0">{log.timestamp.split("T")[1]}</span>
                    <span className="font-semibold flex-shrink-0">[{log.level.toUpperCase()}]</span>
                    <span className="flex-1 break-words">{log.message}</span>
                  </div>
                  {log.data && (
                    <div className="ml-2 text-muted-foreground text-xs mt-1">
                      {JSON.stringify(log.data, null, 2).split("\n").slice(0, 3).join("\n")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DebugPanel;
