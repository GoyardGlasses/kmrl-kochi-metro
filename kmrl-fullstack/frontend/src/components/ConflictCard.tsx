import { AlertCircle, AlertTriangle, Info, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Conflict } from "@/types/trainset";

interface ConflictCardProps {
  conflicts: Conflict[];
  lastConflictCheck?: Date;
  className?: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "HIGH":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "MEDIUM":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "LOW":
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "default";
    case "LOW":
      return "secondary";
    default:
      return "default";
  }
};

const getConflictTypeLabel = (type: string) => {
  switch (type) {
    case "MISSING_CERTIFICATE":
      return "Certificate Issue";
    case "BRANDING_SLA_RISK":
      return "Branding SLA Risk";
    case "MILEAGE_IMBALANCE":
      return "Mileage Imbalance";
    case "CLEANING_CLASH":
      return "Cleaning Conflict";
    case "STABLING_CLASH":
      return "Stabling Conflict";
    default:
      return type;
  }
};

const formatDate = (date?: Date | string) => {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

export function ConflictCard({ conflicts, lastConflictCheck, className }: ConflictCardProps) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-green-500" />
            No Conflicts Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This trainset has no detected conflicts and is ready for operation.
          </p>
          {lastConflictCheck && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last checked: {formatDate(lastConflictCheck)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const highSeverityCount = conflicts.filter(c => c.severity === "HIGH").length;
  const mediumSeverityCount = conflicts.filter(c => c.severity === "MEDIUM").length;
  const lowSeverityCount = conflicts.filter(c => c.severity === "LOW").length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Conflicts Detected
          </span>
          <div className="flex gap-1">
            {highSeverityCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {highSeverityCount} High
              </Badge>
            )}
            {mediumSeverityCount > 0 && (
              <Badge variant="default" className="text-xs">
                {mediumSeverityCount} Medium
              </Badge>
            )}
            {lowSeverityCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {lowSeverityCount} Low
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {conflicts.map((conflict, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-0.5">{getSeverityIcon(conflict.severity)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={getSeverityColor(conflict.severity)} className="text-xs">
                    {getConflictTypeLabel(conflict.type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(conflict.detectedAt)}
                  </span>
                </div>
                <p className="text-sm">{conflict.message}</p>
              </div>
            </div>
          ))}
        </div>
        {lastConflictCheck && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last conflict check: {formatDate(lastConflictCheck)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
