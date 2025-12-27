import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'PASS' | 'WARN' | 'FAIL';
  showLabel?: boolean;
}

const StatusBadge = ({ status, showLabel = false }: StatusBadgeProps) => {
  const config = {
    PASS: {
      icon: CheckCircle,
      bgClass: 'bg-revenue/20',
      textClass: 'text-revenue',
      label: 'Pass',
    },
    WARN: {
      icon: AlertCircle,
      bgClass: 'bg-standby/20',
      textClass: 'text-standby',
      label: 'Warning',
    },
    FAIL: {
      icon: XCircle,
      bgClass: 'bg-ibl/20',
      textClass: 'text-ibl',
      label: 'Fail',
    },
  };

  const { icon: Icon, bgClass, textClass, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgClass} ${textClass}`}>
      <Icon className="w-3 h-3" />
      {showLabel && <span>{label}</span>}
    </span>
  );
};

export default StatusBadge;