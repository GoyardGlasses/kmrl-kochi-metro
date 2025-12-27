import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataIntegrationService } from "@/services/dataIntegrationService";
import { showToast } from "@/lib/toast";

// IoT Sensor Hooks
export const useIoTReadings = (params?: {
  trainsetId?: string;
  department?: string;
  since?: string;
}) => {
  return useQuery({
    queryKey: ["iot-readings", params],
    queryFn: () => dataIntegrationService.getIoTReadings(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useLatestIoTReadings = (trainsetId: string) => {
  return useQuery({
    queryKey: ["iot-readings-latest", trainsetId],
    queryFn: () => dataIntegrationService.getLatestIoTReadings(trainsetId),
    refetchInterval: 15000, // Refresh every 15 seconds
  });
};

export const useSubmitIoTReading = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (reading: any) => dataIntegrationService.submitIoTReading(reading),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iot-readings"] });
      showToast("IoT reading submitted successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to submit IoT reading: ${error.message}`, "error");
    },
  });
};

// Maximo Integration Hooks
export const useMaximoJobCards = (params?: {
  trainsetId?: string;
  status?: string;
  priority?: string;
}) => {
  return useQuery({
    queryKey: ["maximo-jobcards", params],
    queryFn: () => dataIntegrationService.getMaximoJobCards(params),
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useOpenJobCards = (trainsetId: string) => {
  return useQuery({
    queryKey: ["maximo-jobcards-open", trainsetId],
    queryFn: () => dataIntegrationService.getOpenJobCards(trainsetId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCreateMaximoJobCard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (jobCard: any) => dataIntegrationService.createMaximoJobCard(jobCard),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maximo-jobcards"] });
      showToast("Job card created successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to create job card: ${error.message}`, "error");
    },
  });
};

export const useUpdateMaximoJobCard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workOrderId, updates }: { workOrderId: string; updates: any }) =>
      dataIntegrationService.updateMaximoJobCard(workOrderId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maximo-jobcards"] });
      showToast("Job card updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to update job card: ${error.message}`, "error");
    },
  });
};

// Manual Override Hooks
export const useManualOverrides = (params?: {
  trainsetId?: string;
  field?: string;
  active?: boolean;
}) => {
  return useQuery({
    queryKey: ["manual-overrides", params],
    queryFn: () => dataIntegrationService.getManualOverrides(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCreateManualOverride = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (override: any) => dataIntegrationService.createManualOverride(override),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-overrides"] });
      showToast("Manual override created successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to create manual override: ${error.message}`, "error");
    },
  });
};

export const useDeleteManualOverride = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => dataIntegrationService.deleteManualOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-overrides"] });
      showToast("Manual override deleted successfully", "success");
    },
    onError: (error: any) => {
      showToast(`Failed to delete manual override: ${error.message}`, "error");
    },
  });
};

// Data Integration Dashboard Hook
export const useDataIntegrationDashboard = () => {
  return useQuery({
    queryKey: ["data-integration-dashboard"],
    queryFn: () => dataIntegrationService.getDataIntegrationDashboard(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Real-time Data Subscription Hooks
export const useIoTSubscription = (trainsetId: string, callback: (reading: any) => void) => {
  const [subscription, setSubscription] = useState<{ cleanup: () => void } | null>(null);
  
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        const cleanup = await dataIntegrationService.subscribeToIoTUpdates(callback);
        setSubscription({ cleanup });
      } catch (error) {
        console.error('Failed to setup IoT subscription:', error);
      }
    };
    
    setupSubscription();
    
    return () => {
      if (subscription?.cleanup) {
        subscription.cleanup();
      }
    };
  }, [trainsetId, callback]);
  
  return subscription;
};

export const useMaximoSubscription = (trainsetId: string, callback: (jobCard: any) => void) => {
  const [subscription, setSubscription] = useState<{ cleanup: () => void } | null>(null);
  
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        const cleanup = await dataIntegrationService.subscribeToMaximoUpdates(callback);
        setSubscription({ cleanup });
      } catch (error) {
        console.error('Failed to setup Maximo subscription:', error);
      }
    };
    
    setupSubscription();
    
    return () => {
      if (subscription?.cleanup) {
        subscription.cleanup();
      }
    };
  }, [trainsetId, callback]);
  
  return subscription;
};
