import { useParams, useNavigate } from 'react-router-dom';
import { useTrainset } from '@/hooks/useTrainset';
import { Loader } from '@/components/Loader';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, Train, Wrench, Sparkles, Gauge, Brush } from 'lucide-react';

const TrainsetDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: trainset, isLoading, isError } = useTrainset(id);

  if (isLoading) {
    return <Loader fullScreen message="Loading trainset details..." />;
  }

  if (isError || !trainset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Trainset Not Found</h1>
          <p className="text-muted-foreground mb-4">The trainset "{id}" could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: 'PASS' | 'WARN' | 'FAIL') => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-5 h-5 text-revenue" />;
      case 'WARN': return <AlertCircle className="w-5 h-5 text-standby" />;
      case 'FAIL': return <XCircle className="w-5 h-5 text-ibl" />;
    }
  };

  const getStatusBg = (status: 'PASS' | 'WARN' | 'FAIL') => {
    switch (status) {
      case 'PASS': return 'bg-revenue/10 border-revenue/20';
      case 'WARN': return 'bg-standby/10 border-standby/20';
      case 'FAIL': return 'bg-ibl/10 border-ibl/20';
    }
  };

  const getDecisionStyles = () => {
    switch (trainset.recommendation) {
      case 'REVENUE': return 'bg-revenue text-primary-foreground';
      case 'STANDBY': return 'bg-standby text-primary-foreground';
      case 'IBL': return 'bg-ibl text-primary-foreground';
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header C */}
          <div className="bg-card rounded-xl border border-border shadow-xl p-6 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Train className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold font-mono text-foreground">{trainset.id}</h1>
                  <p className="text-muted-foreground">Trainset Details & Analysis</p>
                </div>
              </div>
              <div className={`px-6 py-3 rounded-xl ${getDecisionStyles()} shadow-lg`}>
                <p className="text-sm opacity-80">Current Decision</p>
                <p className="text-2xl font-bold">{trainset.recommendation}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Decision Rationale</h2>
            <p className="text-foreground leading-relaxed bg-secondary/30 p-4 rounded-lg">
              {trainset.reason}
            </p>
          </div>

          {/* Fitness Status */}
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">System Fitness Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Rolling Stock', data: trainset.fitness.rollingStock },
                { label: 'Signalling', data: trainset.fitness.signalling },
                { label: 'Telecom', data: trainset.fitness.telecom },
              ].map(({ label, data }) => (
                <div
                  key={label}
                  className={`p-4 rounded-xl border ${getStatusBg(data.status)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(data.status)}
                    <h3 className="font-semibold text-foreground">{label}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{data.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* additional info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border shadow-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Operational Details</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Mileage</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    {trainset.mileageKm.toLocaleString()} km
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Branding Priority</span>
                  </div>
                  <span className={`font-semibold ${
                    trainset.brandingPriority === 'HIGH' ? 'text-revenue' :
                    trainset.brandingPriority === 'MEDIUM' ? 'text-standby' : 'text-muted-foreground'
                  }`}>
                    {trainset.brandingPriority}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Maintenance Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wrench className={`w-5 h-5 ${trainset.jobCardOpen ? 'text-ibl' : 'text-revenue'}`} />
                    <span className="text-muted-foreground">Job Card</span>
                  </div>
                  <span className={`font-semibold ${trainset.jobCardOpen ? 'text-ibl' : 'text-revenue'}`}>
                    {trainset.jobCardOpen ? 'Open' : 'Clear'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brush className={`w-5 h-5 ${getCleaningColor(trainset.cleaningStatus)}`} />
                    <span className="text-muted-foreground">Cleaning Status</span>
                  </div>
                  <span className={`font-semibold ${getCleaningColor(trainset.cleaningStatus)}`}>
                    {trainset.cleaningStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TrainsetDetails;