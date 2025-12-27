import { Train, Clock, AlertTriangle } from 'lucide-react';

interface KPISummaryProps {
  revenue: number;
  standby: number;
  ibl: number;
}

const KPISummary = ({ revenue, standby, ibl }: KPISummaryProps) => {
  const kpis = [
    {
      label: 'Revenue Service',
      value: revenue,
      icon: Train,
      borderClass: 'border-l-revenue',
      bgClass: 'bg-revenue/10',
      textClass: 'text-revenue',
    },
    {
      label: 'Standby',
      value: standby,
      icon: Clock,
      borderClass: 'border-l-standby',
      bgClass: 'bg-standby/10',
      textClass: 'text-standby',
    },
    {
      label: 'IBL(Inspection Bay Line)',
      value: ibl,
      icon: AlertTriangle,
      borderClass: 'border-l-ibl',
      bgClass: 'bg-ibl/10',
      textClass: 'text-ibl',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`${kpi.bgClass} ${kpi.borderClass} border-l-4 rounded-lg p-4 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.textClass} font-mono mt-1`}>{kpi.value}</p>
            </div>
            <kpi.icon className={`w-10 h-10 ${kpi.textClass} opacity-80`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPISummary;