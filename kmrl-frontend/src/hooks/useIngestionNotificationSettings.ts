import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IngestionNotificationSettingsResponse } from "@/types";
import { useServices } from "@/context/ServicesProvider";

const KEY = ["ingestionNotificationSettings"]; 

export const useIngestionNotificationSettings = () => {
  const { trainsets } = useServices();
  const queryClient = useQueryClient();

  const query = useQuery<IngestionNotificationSettingsResponse>({
    queryKey: KEY,
    queryFn: () => (trainsets as any).getIngestionNotificationSettings(),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      phone: string;
      notifyOnSuccess: boolean;
      notifyOnFailure: boolean;
    }) => (trainsets as any).updateIngestionNotificationSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  return useMemo(
    () => ({
      ...query,
      save: saveMutation.mutateAsync,
      saveStatus: saveMutation.status,
      saveError: saveMutation.error,
    }),
    [query, saveMutation]
  );
};
