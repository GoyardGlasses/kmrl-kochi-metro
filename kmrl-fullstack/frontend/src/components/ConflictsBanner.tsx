import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Conflict } from "@/types/trainset";

interface ConflictsBannerProps {
  conflicts: Conflict[];
  className?: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "HIGH":
      return <AlertCircle className="h-4 w-4" />;
    case "MEDIUM":
      return <AlertTriangle className="h-4 w-4" />;
    case "LOW":
      return <Info className="h-4 w-4" />;
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

export function ConflictsBanner({ conflicts, className }: ConflictsBannerProps) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const highSeverityConflicts = conflicts.filter(c => c.severity === "HIGH");
  const mediumSeverityConflicts = conflicts.filter(c => c.severity === "MEDIUM");
  const lowSeverityConflicts = conflicts.filter(c => c.severity === "LOW");

  return (
    <div className={`space-y-3 ${className}`}>
      {highSeverityConflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {highSeverityConflicts.length} High Severity Conflict{highSeverityConflicts.length > 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              {highSeverityConflicts.map((conflict, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span>{conflict.message}</span>
                  <Badge variant={getSeverityColor(conflict.severity)}>
                    {getConflictTypeLabel(conflict.type)}
                  </Badge>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {mediumSeverityConflicts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {mediumSeverityConflicts.length} Medium Severity Conflict{mediumSeverityConflicts.length > 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              {mediumSeverityConflicts.map((conflict, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span>{conflict.message}</span>
                  <Badge variant={getSeverityColor(conflict.severity)}>
                    {getConflictTypeLabel(conflict.type)}
                  </Badge>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {lowSeverityConflicts.length > 0 && (
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertTitle>
            {lowSeverityConflicts.length} Low Severity Conflict{lowSeverityConflicts.length > 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              {lowSeverityConflicts.map((conflict, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span>{conflict.message}</span>
                  <Badge variant={getSeverityColor(conflict.severity)}>
                    {getConflictTypeLabel(conflict.type)}
                  </Badge>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
