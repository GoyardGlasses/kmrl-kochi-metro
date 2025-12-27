import { ArrowRight, Calendar } from 'lucide-react';

const ContextBanner = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-primary/10 border-l-4 border-l-primary rounded-lg p-4 mb-6 backdrop-blur-sm">
      <div className="flex items-center gap-4 flex-wrap">
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(today)}</span>
          <ArrowRight className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">{formatDate(tomorrow)}</span>
        </div>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <div className="text-sm">
          <span className="text-muted-foreground">Next AM Peak Induction: </span>
          <span className="text-primary font-semibold">05:30</span>
        </div>
      </div>
    </div>
  );
};

export default ContextBanner;
