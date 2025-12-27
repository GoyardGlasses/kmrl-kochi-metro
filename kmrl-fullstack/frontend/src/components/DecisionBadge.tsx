import type { Decision } from "@/types";

interface DecisionBadgeProps {
  decision: Decision;
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
}

const DecisionBadge = ({ decision, onClick, interactive = false }: DecisionBadgeProps) => {
  const config = {
    REVENUE: {
      bgClass: 'bg-revenue',
      textClass: 'text-primary-foreground',
      hoverClass: interactive ? 'hover:bg-revenue/80 cursor-pointer' : '',
    },
    STANDBY: {
      bgClass: 'bg-standby',
      textClass: 'text-primary-foreground',
      hoverClass: interactive ? 'hover:bg-standby/80 cursor-pointer' : '',
    },
    IBL: {
      bgClass: 'bg-ibl',
      textClass: 'text-primary-foreground',
      hoverClass: interactive ? 'hover:bg-ibl/80 cursor-pointer' : '',
    },
  };

  const { bgClass, textClass, hoverClass } = config[decision];

  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 ${bgClass} ${textClass} ${hoverClass} ${interactive ? 'shadow-md hover:shadow-lg' : ''}`}
    >
      {decision}
    </button>
  );
};

export default DecisionBadge;