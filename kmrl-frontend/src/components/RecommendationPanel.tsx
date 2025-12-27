import type { Trainset } from "@/types";
import { TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecommendationPanelProps {
  trainsets: Trainset[];
  onSelect: (id: string) => void;
}

const RecommendationPanel = ({ trainsets, onSelect }: RecommendationPanelProps) => {
  const navigate = useNavigate();
  
  // Sorts
  const sortedTrainsets = [...trainsets]
    .filter(t => t.recommendation === 'REVENUE')
    .sort((a, b) => {
      const brandingOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (brandingOrder[a.brandingPriority] !== brandingOrder[b.brandingPriority]) {
        return brandingOrder[a.brandingPriority] - brandingOrder[b.brandingPriority];
      }
      return a.mileageKm - b.mileageKm;
    });

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-revenue" />
        <h3 className="text-lg font-semibold text-foreground">Recommended Induction Order</h3>
      </div>

      {sortedTrainsets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No trainsets recommended for revenue service</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTrainsets.map((trainset, index) => (
            <div
              key={trainset.id}
              onClick={() => onSelect(trainset.id)}
              className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg cursor-pointer hover:bg-secondary/40 transition-all duration-150 group"
            >
              <div className="w-6 h-6 rounded-full bg-revenue/20 text-revenue flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
<p className="font-mono font-semibold text-[16px] text-foreground">
  {trainset.id}
</p>
                <p className="text-xs text-muted-foreground">
                  {trainset.brandingPriority} branding • {trainset.mileageKm.toLocaleString()} km
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/whatif')}
        className="w-full mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
      >
        <span>Open What-If Simulation</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default RecommendationPanel;