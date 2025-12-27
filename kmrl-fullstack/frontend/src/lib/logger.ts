type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

const getTimestamp = () => new Date().toISOString();

export const log = (message: string, level: LogLevel = "info", data?: any) => {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    data,
  };

  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const consoleMethod = console[level] || console.log;
    consoleMethod(`[${level.toUpperCase()}] ${message}`, data || "");
  }
};

export const logApiRequest = (method: string, url: string, data?: any) => {
  log(`API ${method} ${url}`, "debug", { method, url, data });
};

export const logApiResponse = (method: string, url: string, status: number, data?: any) => {
  log(`API ${method} ${url} - ${status}`, "debug", { method, url, status, data });
};

export const logApiError = (method: string, url: string, error: any) => {
  log(`API ${method} ${url} - Error`, "error", { method, url, error });
};

export const logAuthEvent = (event: string, data?: any) => {
  log(`Auth: ${event}`, "info", data);
};

export const getLogs = () => [...logs];

export const clearLogs = () => {
  logs.length = 0;
};
