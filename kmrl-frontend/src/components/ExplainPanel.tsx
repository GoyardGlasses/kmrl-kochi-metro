import type { Trainset } from "@/types";

import { Info, CheckCircle, AlertCircle, XCircle, Wrench, Sparkles, Gauge, Brush } from 'lucide-react';

interface ExplainPanelProps {
  trainset: Trainset | null;
}

const ExplainPanel = ({ trainset }: ExplainPanelProps) => {
  if (!trainset) {
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Explanation</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-19 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Select a trainset from the table to view detailed reasoning
          </p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: 'PASS' | 'WARN' | 'FAIL') => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-4 h-4 text-revenue" />;
      case 'WARN': return <AlertCircle className="w-4 h-4 text-standby" />;
      case 'FAIL': return <XCircle className="w-4 h-4 text-ibl" />;
    }
  };

  const getCleaningColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-revenue';
      case 'PENDING': return 'text-standby';
      case 'OVERDUE': return 'text-ibl';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-6 animate-slide-in">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Explanation</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <span className="font-mono text-xl font-bold text-primary">{trainset.id}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            trainset.recommendation === 'REVENUE' ? 'bg-revenue text-primary-foreground' :
            trainset.recommendation === 'STANDBY' ? 'bg-standby text-primary-foreground' :
            'bg-ibl text-primary-foreground'
          }`}>
            {trainset.recommendation}
          </span>
        </div>

        <div className="bg-secondary/30 rounded-lg p-4">
          <p className="text-sm text-foreground leading-relaxed">{trainset.reason}</p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fitness Status</h4>
          
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
              {getStatusIcon(trainset.fitness.rollingStock.status)}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Rolling Stock</p>
                <p className="text-xs text-muted-foreground mt-0.5">{trainset.fitness.rollingStock.details}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
              {getStatusIcon(trainset.fitness.signalling.status)}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Signalling</p>
                <p className="text-xs text-muted-foreground mt-0.5">{trainset.fitness.signalling.details}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
              {getStatusIcon(trainset.fitness.telecom.status)}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Telecom</p>
                <p className="text-xs text-muted-foreground mt-0.5">{trainset.fitness.telecom.details}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Wrench className={`w-4 h-4 ${trainset.jobCardOpen ? 'text-ibl' : 'text-revenue'}`} />
            <span className="text-xs text-muted-foreground">
              Job Card: <span className={trainset.jobCardOpen ? 'text-ibl' : 'text-revenue'}>{trainset.jobCardOpen ? 'Open' : 'Clear'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              Branding: <span className="text-foreground">{trainset.brandingPriority}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              Mileage: <span className="font-mono text-foreground">{trainset.mileageKm.toLocaleString()} km</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Brush className={`w-4 h-4 ${getCleaningColor(trainset.cleaningStatus)}`} />
            <span className="text-xs text-muted-foreground">
              Cleaning: <span className={getCleaningColor(trainset.cleaningStatus)}>{trainset.cleaningStatus}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplainPanel;