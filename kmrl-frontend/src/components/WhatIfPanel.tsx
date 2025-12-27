import { useState, useEffect } from 'react';
import type { Trainset, Decision } from '@/types';
import { mockTrainsets } from '@/data/mockTrainsets';
import { applySimulationRules } from '@/lib/simulation';
import { FlaskConical, RotateCcw } from 'lucide-react';

interface WhatIfPanelProps {
  onSimulate: (trainsets: Trainset[]) => void;
}

interface Rules {
  forceHighBranding: boolean;
  ignoreJobCards: boolean;
  ignoreCleaning: boolean;
}

const WhatIfPanel = ({ onSimulate }: WhatIfPanelProps) => {
  const [rules, setRules] = useState<Rules>({
    forceHighBranding: false,
    ignoreJobCards: false,
    ignoreCleaning: false,
  });

  const applyRules = (baseTrainsets: Trainset[], rules: Rules): Trainset[] => {
    return baseTrainsets.map(trainset => {
      let newRecommendation: Decision = trainset.recommendation;
      let newReason = trainset.reason;

      // Check fitness status
      const hasFailure = 
        trainset.fitness.rollingStock.status === 'FAIL' ||
        trainset.fitness.signalling.status === 'FAIL' ||
        trainset.fitness.telecom.status === 'FAIL';

      const hasWarning = 
        trainset.fitness.rollingStock.status === 'WARN' ||
        trainset.fitness.signalling.status === 'WARN' ||
        trainset.fitness.telecom.status === 'WARN';

      // Base logic: failures always go to IBL
      if (hasFailure) {
        newRecommendation = 'IBL';
        newReason = 'Critical system failure detected.';
      } else if (hasWarning) {
        newRecommendation = 'STANDBY';
        newReason = 'System warning detected. Suitable for standby.';
      } else {
        newRecommendation = 'REVENUE';
        newReason = 'All systems operational.';
      }

      // job card rule
      if (!rules.ignoreJobCards && trainset.jobCardOpen) {
        newRecommendation = 'IBL';
        newReason = 'Open job card requires attention.';
      }

      // cleaning rule
      if (!rules.ignoreCleaning && trainset.cleaningStatus === 'OVERDUE') {
        if (newRecommendation === 'REVENUE') {
          newRecommendation = 'STANDBY';
          newReason = 'Cleaning overdue. Hold for non-peak service.';
        }
      }

      // branding rule
      if (rules.forceHighBranding && trainset.brandingPriority === 'HIGH') {
        if (newRecommendation === 'STANDBY' && !hasFailure && !trainset.jobCardOpen) {
          newRecommendation = 'REVENUE';
          newReason = 'Promoted to revenue: High branding priority override.';
        }
      }

      return {
        ...trainset,
        recommendation: newRecommendation,
        reason: newReason,
      };
    });
  };

  useEffect(() => {
    const simulated = applyRules(mockTrainsets, rules);
    onSimulate(simulated);
  }, [rules, onSimulate]);

  const handleReset = () => {
    setRules({
      forceHighBranding: false,
      ignoreJobCards: false,
      ignoreCleaning: false,
    });
  };

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">What-If Simulation</h3>
        </div>
        <button
          onClick={handleReset}
          className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded-lg transition-colors"
          title="Reset rules"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Toggle rules to see how recommendations change
      </p>

      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
          <input
            type="checkbox"
            checked={rules.forceHighBranding}
            onChange={(e) => setRules({ ...rules, forceHighBranding: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Force High Branding</p>
            <p className="text-xs text-muted-foreground">Promote high-branding trainsets to revenue when possible</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
          <input
            type="checkbox"
            checked={rules.ignoreJobCards}
            onChange={(e) => setRules({ ...rules, ignoreJobCards: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Ignore Job Cards</p>
            <p className="text-xs text-muted-foreground">Don't penalize trainsets with open job cards</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
          <input
            type="checkbox"
            checked={rules.ignoreCleaning}
            onChange={(e) => setRules({ ...rules, ignoreCleaning: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Ignore Cleaning Status</p>
            <p className="text-xs text-muted-foreground">Don't consider cleaning status in recommendations</p>
          </div>
        </label>
      </div>

      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-xs text-primary">
          Active rules: {Object.values(rules).filter(Boolean).length} / 3
        </p>
      </div>
    </div>
  );
};

export default WhatIfPanel;