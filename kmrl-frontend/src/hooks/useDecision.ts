import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { decisionService } from "@/services/decisionService";
import { showToast } from "@/lib/toast";

// Fitness Certificates
export const useFitnessCertificates = (trainsetId?: string) => {
  return useQuery({
    queryKey: ["fitness-certificates", trainsetId],
    queryFn: () => decisionService.getFitnessCertificates(trainsetId),
  });
};

export const useMlSuggestions = (params?: { limit?: number; onlyChanged?: boolean }) => {
  return useQuery({
    queryKey: ["ml-suggestions", params?.limit ?? 6, params?.onlyChanged ?? true],
    queryFn: () => decisionService.getMlSuggestions(params),
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
  });
};

export const useUpdateFitnessCertificate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, certificate }: { id: string; certificate: any }) =>
      decisionService.updateFitnessCertificate(id, certificate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fitness-certificates"] });
      showToast("Fitness certificate updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to update fitness certificate: ${error.message}`, "error");
    },
  });
};

// Branding Contracts
export const useBrandingContracts = () => {
  return useQuery({
    queryKey: ["branding-contracts"],
    queryFn: () => decisionService.getBrandingContracts(),
  });
};

export const useUpdateBrandingContract = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, contract }: { id: string; contract: any }) =>
      decisionService.updateBrandingContract(id, contract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branding-contracts"] });
      showToast("Branding contract updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to update branding contract: ${error.message}`, "error");
    },
  });
};

// Mileage Balancing
export const useMileageBalances = () => {
  return useQuery({
    queryKey: ["mileage-balances"],
    queryFn: () => decisionService.getMileageBalances(),
  });
};

export const useOptimizeMileage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => decisionService.optimizeMileage(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mileage-balances"] });
      showToast("Mileage optimization completed successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to optimize mileage: ${error.message}`, "error");
    },
  });
};

// Cleaning Slots
export const useCleaningSlots = (date?: string) => {
  return useQuery({
    queryKey: ["cleaning-slots", date],
    queryFn: () => decisionService.getCleaningSlots(date),
  });
};

export const useBookCleaningSlot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bayId, trainsetId, cleaningType }: { bayId: string; trainsetId: string; cleaningType: string }) =>
      decisionService.bookCleaningSlot(bayId, trainsetId, cleaningType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaning-slots"] });
      showToast("Cleaning slot booked successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to book cleaning slot: ${error.message}`, "error");
    },
  });
};

// Stabling Geometry
export const useStablingGeometry = () => {
  return useQuery({
    queryKey: ["stabling-geometry"],
    queryFn: () => decisionService.getStablingGeometry(),
  });
};

export const useOptimizeStabling = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => decisionService.optimizeStabling(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stabling-geometry"] });
      showToast("Stabling optimization completed successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to optimize stabling: ${error.message}`, "error");
    },
  });
};

// Service Readiness
export const useServiceReadiness = () => {
  return useQuery({
    queryKey: ["service-readiness"],
    queryFn: () => decisionService.getServiceReadiness(),
  });
};

export const useCalculateServiceReadiness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (trainsetId: string) => decisionService.calculateServiceReadiness(trainsetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-readiness"] });
      showToast("Service readiness calculated successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to calculate service readiness: ${error.message}`, "error");
    },
  });
};

// Conflict Alerts
export const useConflictAlerts = () => {
  return useQuery({
    queryKey: ["conflict-alerts"],
    queryFn: () => decisionService.getConflictAlerts(),
  });
};

export const useResolveConflict = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, action }: { alertId: string; action: string }) =>
      decisionService.resolveConflict(alertId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conflict-alerts"] });
      showToast("Conflict resolved successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to resolve conflict: ${error.message}`, "error");
    },
  });
};

// Optimization Engine
export const useRunOptimization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (targetKpi?: string) => decisionService.runOptimization(targetKpi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optimization-results"] });
      showToast("Optimization completed successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to run optimization: ${error.message}`, "error");
    },
  });
};

export const useOptimizationHistory = () => {
  return useQuery({
    queryKey: ["optimization-history"],
    queryFn: () => decisionService.getOptimizationHistory(),
  });
};

// What-If Scenarios
export const useWhatIfScenarios = () => {
  return useQuery({
    queryKey: ["whatif-scenarios"],
    queryFn: () => decisionService.getWhatIfScenarios(),
  });
};

export const useCreateWhatIfScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scenario: any) => decisionService.createWhatIfScenario(scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatif-scenarios"] });
      showToast("What-if scenario created successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to create what-if scenario: ${error.message}`, "error");
    },
  });
};

export const useRunWhatIfScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scenarioId: string) => decisionService.runWhatIfScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatif-scenarios"] });
      showToast("What-if scenario executed successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to run what-if scenario: ${error.message}`, "error");
    },
  });
};

export const useDeleteWhatIfScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scenarioId: string) => decisionService.deleteWhatIfScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatif-scenarios"] });
      showToast("What-if scenario deleted successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to delete what-if scenario: ${error.message}`, "error");
    },
  });
};

// KPI Dashboard
export const useKPIDashboard = () => {
  return useQuery({
    queryKey: ["kpi-dashboard"],
    queryFn: () => decisionService.getKPIDashboard(),
  });
};
