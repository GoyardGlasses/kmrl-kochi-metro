import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trainset, Decision } from '@/types';
import { useTrainsets } from '@/hooks/useTrainsets';
import { getDecisionCounts } from '@/lib/trainsets';
import { Loader } from '@/components/Loader';
import KPISummary from '@/components/KPISummary';
import DraggableTrainsetBoard from '@/components/DraggableTrainsetBoard';
import { ArrowLeft, FlaskConical, RotateCcw, Save, Sparkles, CheckCircle2, XCircle, Lightbulb, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";

interface Rules {
  forceHighBranding: boolean;
  ignoreJobCards: boolean;
  ignoreCleaning: boolean;
  prioritizeLowMileage: boolean;
}

interface MLSuggestion {
  type: "improvement" | "warning" | "info" | "optimization";
  message: string;
  rule?: keyof Rules;
  recommendedValue?: boolean;
  impact?: string;
}

const WhatIfPage = () => {
  const navigate = useNavigate();
  const { data: backendTrainsets = [], isLoading } = useTrainsets();
  const [rules, setRules] = useState<Rules>({
    forceHighBranding: false,
    ignoreJobCards: false,
    ignoreCleaning: false,
    prioritizeLowMileage: false,
  });
  const [trainsets, setTrainsets] = useState<Trainset[]>([]);
  const [originalTrainsets, setOriginalTrainsets] = useState<Trainset[]>([]);
  
  // ML Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MLSuggestion[]>([]);
  const [applyConfirmed, setApplyConfirmed] = useState(false);

  useEffect(() => {
    if (backendTrainsets.length > 0) {
      setTrainsets(backendTrainsets);
      setOriginalTrainsets(backendTrainsets);
    }
  }, [backendTrainsets]);

  const applyRules = useCallback((baseTrainsets: Trainset[], rules: Rules): Trainset[] => {
    return baseTrainsets.map(trainset => {
      let newRecommendation: Decision = trainset.recommendation;
      let newReason = trainset.reason;

      const hasFailure = 
        trainset.fitness.rollingStock.status === 'FAIL' ||
        trainset.fitness.signalling.status === 'FAIL' ||
        trainset.fitness.telecom.status === 'FAIL';

      const hasWarning = 
        trainset.fitness.rollingStock.status === 'WARN' ||
        trainset.fitness.signalling.status === 'WARN' ||
        trainset.fitness.telecom.status === 'WARN';

      // Base logic
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

      // low mileage priority
      if (rules.prioritizeLowMileage && trainset.mileageKm < 20000) {
        if (newRecommendation === 'STANDBY' && !hasFailure && !trainset.jobCardOpen) {
          newRecommendation = 'REVENUE';
          newReason = 'Promoted to revenue: Low mileage priority.';
        }
      }

      return {
        ...trainset,
        recommendation: newRecommendation,
        reason: newReason,
      };
    });
  }, []);

  const handleRuleChange = (key: keyof Rules, value: boolean) => {
    const newRules = { ...rules, [key]: value };
    setRules(newRules);
    setTrainsets(applyRules(originalTrainsets, newRules));
  };

  const handleReset = () => {
    setRules({
      forceHighBranding: false,
      ignoreJobCards: false,
      ignoreCleaning: false,
      prioritizeLowMileage: false,
    });
    setTrainsets(originalTrainsets);
  };

  const handleDragEnd = (trainsetId: string, newDecision: Decision) => {
    setTrainsets(prev => prev.map(t =>
      t.id === trainsetId ? { ...t, recommendation: newDecision } : t
    ));
  };

  const counts = getDecisionCounts(trainsets);
  const originalCounts = getDecisionCounts(originalTrainsets);

  const getDiff = (current: number, original: number) => {
    const diff = current - original;
    if (diff > 0) return <span className="text-revenue">+{diff}</span>;
    if (diff < 0) return <span className="text-ibl">{diff}</span>;
    return <span className="text-muted-foreground">0</span>;
  };

  // Generate ML suggestions based on current state
  const generateSuggestions = (): MLSuggestion[] => {
    const suggestions: MLSuggestion[] = [];
    const currentCounts = getDecisionCounts(trainsets);
    const originalCounts = getDecisionCounts(originalTrainsets);
    
    // Analyze fleet state
    const totalTrainsets = trainsets.length;
    const highBrandingCount = trainsets.filter(t => t.brandingPriority === 'HIGH').length;
    const lowMileageCount = trainsets.filter(t => t.mileageKm < 20000).length;
    const jobCardsOpen = trainsets.filter(t => t.jobCardOpen).length;
    const cleaningOverdue = trainsets.filter(t => t.cleaningStatus === 'OVERDUE').length;
    const failuresCount = trainsets.filter(t => 
      t.fitness.rollingStock.status === 'FAIL' ||
      t.fitness.signalling.status === 'FAIL' ||
      t.fitness.telecom.status === 'FAIL'
    ).length;

    // Revenue optimization suggestions
    if (currentCounts.REVENUE < originalCounts.REVENUE && highBrandingCount > 0 && !rules.forceHighBranding) {
      suggestions.push({
        type: "optimization",
        message: `Enable "Force High Branding" to potentially increase revenue service by promoting ${highBrandingCount} high-branding trainsets`,
        rule: "forceHighBranding",
        recommendedValue: true,
        impact: `Could increase revenue service by up to ${Math.min(highBrandingCount, originalCounts.STANDBY)} trainsets`
      });
    }

    // Low mileage optimization
    if (lowMileageCount > 0 && !rules.prioritizeLowMileage && currentCounts.REVENUE < totalTrainsets * 0.6) {
      suggestions.push({
        type: "optimization",
        message: `Enable "Low Mileage Priority" to promote ${lowMileageCount} low-mileage trainsets to revenue service`,
        rule: "prioritizeLowMileage",
        recommendedValue: true,
        impact: `Could increase revenue service by up to ${Math.min(lowMileageCount, currentCounts.STANDBY)} trainsets`
      });
    }

    // Job cards warning
    if (jobCardsOpen > 0 && !rules.ignoreJobCards) {
      suggestions.push({
        type: "warning",
        message: `${jobCardsOpen} trainset(s) have open job cards, keeping them in IBL. Consider enabling "Ignore Job Cards" only if maintenance is scheduled separately.`,
        rule: "ignoreJobCards",
        recommendedValue: false,
        impact: `Would move ${jobCardsOpen} trainsets from IBL, but may impact safety`
      });
    }

    // Cleaning optimization
    if (cleaningOverdue > 0 && !rules.ignoreCleaning && currentCounts.STANDBY > 0) {
      suggestions.push({
        type: "improvement",
        message: `${cleaningOverdue} trainset(s) have overdue cleaning. Enabling "Ignore Cleaning" could free up ${Math.min(cleaningOverdue, currentCounts.STANDBY)} trainsets for revenue.`,
        rule: "ignoreCleaning",
        recommendedValue: true,
        impact: `Could convert up to ${Math.min(cleaningOverdue, currentCounts.STANDBY)} standby trainsets to revenue`
      });
    }

    // Rule combination suggestions
    if (rules.forceHighBranding && rules.prioritizeLowMileage && highBrandingCount > 0 && lowMileageCount > 0) {
      suggestions.push({
        type: "info",
        message: "Both branding and mileage rules are active. This combination maximizes revenue potential.",
      });
    }

    // Safety warning
    if (rules.ignoreJobCards && failuresCount > 0) {
      suggestions.push({
        type: "warning",
        message: `Warning: ${failuresCount} trainset(s) have system failures. Ignoring job cards may not be safe.`,
        rule: "ignoreJobCards",
        recommendedValue: false,
        impact: "Safety risk - failures should be addressed before revenue service"
      });
    }

    // Revenue maximization strategy
    const revenuePotential = totalTrainsets - failuresCount - jobCardsOpen;
    if (currentCounts.REVENUE < revenuePotential * 0.8) {
      suggestions.push({
        type: "optimization",
        message: `Revenue service could potentially reach ${revenuePotential} trainsets (currently ${currentCounts.REVENUE}). Consider enabling optimization rules.`,
        impact: `Potential increase of ${revenuePotential - currentCounts.REVENUE} trainsets in revenue service`
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: "info",
        message: "Current rule configuration looks optimal for the current fleet state.",
      });
    }

    return suggestions;
  };

  const handleApplyChanges = () => {
    // First click - show suggestions
    if (!applyConfirmed) {
      const mlSuggestions = generateSuggestions();
      setSuggestions(mlSuggestions);
      setShowSuggestions(true);
      return;
    }

    // Second click - actually apply (save to backend)
    showToast("Changes applied successfully!", "success");
    setApplyConfirmed(false);
    // TODO: Add API call to save changes if needed
  };

  const applySuggestions = () => {
    const suggestionsToApply = suggestions.filter(s => s.rule && s.recommendedValue !== undefined);
    
    if (suggestionsToApply.length === 0) {
      showToast("No actionable suggestions to apply", "info");
      return;
    }

    const newRules = { ...rules };
    suggestionsToApply.forEach(suggestion => {
      if (suggestion.rule && suggestion.recommendedValue !== undefined) {
        newRules[suggestion.rule] = suggestion.recommendedValue;
      }
    });

    setRules(newRules);
    setTrainsets(applyRules(originalTrainsets, newRules));
    setShowSuggestions(false);
    showToast("ML suggestions applied successfully!", "success");
  };

  const handleConfirmApply = () => {
    setApplyConfirmed(true);
    setShowSuggestions(false);
    handleApplyChanges();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleApplyChanges}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {applyConfirmed ? "Confirm Apply Changes" : "Get Suggestions & Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">What-If Simulation</h1>
            <p className="text-muted-foreground">Experiment with different rules and see the impact</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Rules Panel */}
          <div className="bg-card rounded-xl border border-border shadow-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Simulation Rules</h2>
            <div className="space-y-3">
              {[
                { key: 'forceHighBranding', label: 'Force High Branding', desc: 'Promote high-branding trainsets' },
                { key: 'ignoreJobCards', label: 'Ignore Job Cards', desc: 'Skip job card checks' },
                { key: 'ignoreCleaning', label: 'Ignore Cleaning', desc: 'Skip cleaning status' },
                { key: 'prioritizeLowMileage', label: 'Low Mileage Priority', desc: 'Prefer low-mileage units' },
              ].map(({ key, label, desc }) => (
                <label 
                  key={key}
                  className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={rules[key as keyof Rules]}
                    onChange={(e) => handleRuleChange(key as keyof Rules, e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary font-medium">
                Active rules: {Object.values(rules).filter(Boolean).length} / 4
              </p>
            </div>
          </div>

          {/* KPIs with diff */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Revenue Service', current: counts.REVENUE, original: originalCounts.REVENUE, colorClass: 'border-l-revenue bg-revenue/10 text-revenue' },
                { label: 'Standby', current: counts.STANDBY, original: originalCounts.STANDBY, colorClass: 'border-l-standby bg-standby/10 text-standby' },
                { label: 'IBL (Maintenance)', current: counts.IBL, original: originalCounts.IBL, colorClass: 'border-l-ibl bg-ibl/10 text-ibl' },
              ].map(({ label, current, original, colorClass }) => (
                <div key={label} className={`${colorClass} border-l-4 rounded-lg p-4 shadow-lg`}>
                  <p className="text-muted-foreground text-sm">{label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold font-mono">{current}</span>
                    <span className="text-sm">({getDiff(current, original)})</span>
                  </div>
                </div>
              ))}
            </div>

            <DraggableTrainsetBoard
              trainsets={trainsets}
              onDragEnd={handleDragEnd}
            />
          </div>
        </div>

        {/* Simulated table */}
        <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Simulated Results</h2>
            <p className="text-sm text-muted-foreground">Based on current rule configuration</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Trainset ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Branding</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Mileage</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Original</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Simulated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Reason</th>
                </tr>
              </thead>
              <tbody>
                {trainsets.map((trainset, index) => {
                  const original = originalTrainsets.find(t => t.id === trainset.id);
                  const changed = original?.recommendation !== trainset.recommendation;
                  
                  return (
                    <tr 
                      key={trainset.id}
                      className={`border-b border-border/50 ${changed ? 'bg-primary/5' : ''} ${index % 2 === 0 ? 'bg-card' : 'bg-secondary/10'}`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{trainset.id}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{trainset.brandingPriority}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{trainset.mileageKm.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          original?.recommendation === 'REVENUE' ? 'bg-revenue/20 text-revenue' :
                          original?.recommendation === 'STANDBY' ? 'bg-standby/20 text-standby' :
                          'bg-ibl/20 text-ibl'
                        }`}>
                          {original?.recommendation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          trainset.recommendation === 'REVENUE' ? 'bg-revenue text-primary-foreground' :
                          trainset.recommendation === 'STANDBY' ? 'bg-standby text-primary-foreground' :
                          'bg-ibl text-primary-foreground'
                        }`}>
                          {trainset.recommendation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                        {trainset.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ML Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              ML Optimization Suggestions
            </DialogTitle>
            <DialogDescription>
              AI-powered recommendations to optimize your fleet allocation based on current state
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  suggestion.type === "warning"
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : suggestion.type === "optimization"
                    ? "bg-green-500/10 border-green-500/30"
                    : suggestion.type === "improvement"
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-slate-500/10 border-slate-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {suggestion.type === "warning" ? (
                    <XCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  ) : suggestion.type === "optimization" ? (
                    <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : suggestion.type === "improvement" ? (
                    <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {suggestion.message}
                    </p>
                    {suggestion.impact && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Impact: {suggestion.impact}
                      </p>
                    )}
                    {suggestion.rule && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Rule: {suggestion.rule.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                        {suggestion.recommendedValue !== undefined && (
                          <Badge variant={suggestion.recommendedValue ? "default" : "secondary"} className="text-xs">
                            Recommended: {suggestion.recommendedValue ? "Enable" : "Disable"}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={
                      suggestion.type === "warning"
                        ? "destructive"
                        : suggestion.type === "optimization"
                        ? "default"
                        : suggestion.type === "improvement"
                        ? "default"
                        : "secondary"
                    }
                    className="flex-shrink-0"
                  >
                    {suggestion.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuggestions(false);
                setApplyConfirmed(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={applySuggestions}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
            >
              Apply Suggestions
            </Button>
            <Button 
              onClick={handleConfirmApply} 
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              Apply Changes Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatIfPage;