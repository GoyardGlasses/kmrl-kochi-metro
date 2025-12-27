import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trainset, Decision } from "@/types";
import Tooltip from './Tooltip';
import StatusBadge from './StatusBadge';
import DecisionBadge from './DecisionBadge';
import { Wrench, Sparkles, Gauge } from 'lucide-react';

interface TrainsetTableProps {
  trainsets: Trainset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDecisionChange: (id: string, decision: Decision) => void;
}

const TrainsetTable = ({ trainsets, selectedId, onSelect, onDecisionChange }: TrainsetTableProps) => {
  const navigate = useNavigate();

  //  Filter & Sort States 
  const [fitnessFilter, setFitnessFilter] = useState<'ALL' | 'PASS' | 'WARN' | 'FAIL'>('ALL');
  const [brandingFilter, setBrandingFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [sortBy, setSortBy] = useState<'NONE' | 'MILEAGE' | 'BRANDING'>('NONE');

  // Helpers 
  const getWorstFitness = (ts: Trainset) => {
    const statuses = [ts.fitness.rollingStock.status, ts.fitness.signalling.status, ts.fitness.telecom.status];
    if (statuses.includes('FAIL')) return 'FAIL';
    if (statuses.includes('WARN')) return 'WARN';
    return 'PASS';
  };

  const cycleDecision = (current: Decision): Decision => {
    const cycle: Decision[] = ['REVENUE', 'STANDBY', 'IBL'];
    const currentIndex = cycle.indexOf(current);
    return cycle[(currentIndex + 1) % cycle.length];
  };

  const handleRowClick = (id: string) => onSelect(id);
  const handleRowDoubleClick = (id: string) => navigate(`/trainset/${id}`);
  const handleDecisionClick = (e: React.MouseEvent, trainset: Trainset) => {
    e.stopPropagation();
    const newDecision = cycleDecision(trainset.recommendation);
    onDecisionChange(trainset.id, newDecision);
  };

  const getBrandingColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-revenue';
      case 'MEDIUM': return 'text-standby';
      case 'LOW': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const displayedTrainsets = trainsets
    .filter(ts => fitnessFilter === 'ALL' || getWorstFitness(ts) === fitnessFilter)
    .filter(ts => brandingFilter === 'ALL' || ts.brandingPriority === brandingFilter)
    .sort((a, b) => {
      if (sortBy === 'MILEAGE') return b.mileageKm - a.mileageKm;
      if (sortBy === 'BRANDING') {
        const priorityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityMap[b.brandingPriority] - priorityMap[a.brandingPriority];
      }
      return 0;
    });

  return (
<div className="bg-card rounded-xl shadow-xl overflow-hidden border border-border h-[62vh] flex flex-col">
      <div className="flex gap-5 p-5 bg-secondary/20 border-b border-border text-foreground">
  <label>
    Fitness:
    <select
      value={fitnessFilter}
      onChange={e => setFitnessFilter(e.target.value as 'ALL' | 'PASS' | 'WARN' | 'FAIL')}
      className="ml-1 px-2 py-1 border rounded bg-background text-foreground"
    >

            <option value="ALL">All</option>
            <option value="PASS">PASS</option>
            <option value="WARN">WARN</option>
            <option value="FAIL">FAIL</option>
          </select>
        </label>

       <label className="text-foreground">
  Branding:
  <select
    value={brandingFilter}
    onChange={e => setBrandingFilter(e.target.value as 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW')}
    className="ml-1 px-2 py-1 border rounded bg-background text-foreground"
  >
    <option value="ALL" className="bg-background text-foreground">All</option>
    <option value="HIGH" className="bg-background text-foreground">HIGH</option>
    <option value="MEDIUM" className="bg-background text-foreground">MEDIUM</option>
    <option value="LOW" className="bg-background text-foreground">LOW</option>
  </select>
</label>


        <label className="text-foreground">
  Sort By:
  <select
    value={sortBy}
    onChange={e => setSortBy(e.target.value as 'NONE' | 'MILEAGE' | 'BRANDING')}
    className="ml-1 px-2 py-1 border rounded bg-background text-foreground"
  >
    <option value="NONE" className="bg-background text-foreground">None</option>
    <option value="MILEAGE" className="bg-background text-foreground">Mileage</option>
    <option value="BRANDING" className="bg-background text-foreground">Branding Priority</option>
  </select>
</label>

      </div>

      {/* Table*/}
<div className="overflow-x-auto overflow-y-auto flex-1 flex flex-col">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary/50 border-b border-border">
              <th className="px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trainset ID</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rolling Stock</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">SIGNALLING</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">TELECOM</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Card</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branding</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mileage</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decision</th>
            </tr>
          </thead>
          <tbody>
            {displayedTrainsets.map((trainset, index) => (
              <tr
                key={trainset.id}
                onClick={() => handleRowClick(trainset.id)}
                onDoubleClick={() => handleRowDoubleClick(trainset.id)}
                className={`
  border-b border-border/50 transition-all duration-150 cursor-pointer
  min-h-[56px]
  ${selectedId === trainset.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/30'}
  ${index % 2 === 0 ? 'bg-card' : 'bg-secondary/10'}
`}

              >
                <td className="px-4 py-3 text-[15px]">
{trainset.id}</td>
                
                {/* RollingStock */}
                <td className="px-4 py-3 text-center">
                  <Tooltip content={<p className="text-xs">{trainset.fitness.rollingStock.details}</p>}>
                    <StatusBadge status={trainset.fitness.rollingStock.status} />
                  </Tooltip>
                </td>
                
                {/* signalling */}
                <td className="px-4 py-3 text-center">
                  <Tooltip content={<p className="text-xs">{trainset.fitness.signalling.details}</p>}>
                    <StatusBadge status={trainset.fitness.signalling.status} />
                  </Tooltip>
                </td>
                
                {/* Telecom */}
                <td className="px-4 py-3 text-center">
                  <Tooltip content={<p className="text-xs">{trainset.fitness.telecom.details}</p>}>
                    <StatusBadge status={trainset.fitness.telecom.status} />
                  </Tooltip>
                </td>

                {/* Job Card */}
                <td className="px-4 py-3 text-center">
                  <Tooltip content={<p className="text-xs">{trainset.jobCardOpen ? 'Open job card requiring attention' : 'No open job cards'}</p>}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trainset.jobCardOpen ? 'bg-ibl/20 text-ibl' : 'bg-revenue/20 text-revenue'}`}>
                      <Wrench className="w-3 h-3" />
                      {trainset.jobCardOpen ? 'Open' : 'Clear'}
                    </span>
                  </Tooltip>
                </td>

                {/* branding*/}
                <td className="px-4 py-3 text-center">
                  <Tooltip content={<p className="text-xs">{trainset.brandingPriority}</p>}>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${getBrandingColor(trainset.brandingPriority)}`}>
                      <Sparkles className="w-3 h-3" />
                      {trainset.brandingPriority}
                    </span>
                  </Tooltip>
                </td>

                {/* Mileage*/}
                <td className="px-4 py-3 text-right">
                  <Tooltip content={<p className="text-xs">{trainset.mileageKm.toLocaleString()} km since last maintenance</p>}>
                    <span className="inline-flex items-center gap-1 font-mono text-sm text-muted-foreground">
                      <Gauge className="w-3 h-3" />
                      {trainset.mileageKm.toLocaleString()}
                    </span>
                  </Tooltip>
                </td>

                {/* Decision*/}
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex flex-col items-center">
                    <DecisionBadge
                      decision={trainset.recommendation}
                      onClick={(e) => handleDecisionClick(e, trainset)}
                      interactive
                    />
                    {trainset.manualOverride && (
                      <span className="mt-1 text-[10px] font-semibold text-warning">
                        Manually Overridden
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    <div className="px-4 py-2 bg-secondary/30 border-t border-border text-[11px] text-muted-foreground">
  <p className="text-primary font-semibold mb-1">Tips:</p>
  <ul className="list-disc list-inside space-y-0.5">
    <li>Click decision button to override the decision</li>
    <li>Double-click a row to view trainset details</li>
  </ul>
</div>

    </div>
  );
};

export default TrainsetTable;
