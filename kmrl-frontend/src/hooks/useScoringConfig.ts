import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScoringConfigResponse, ScoringWeights } from "@/types";
import { useServices } from "@/context/ServicesProvider";

const SCORING_CONFIG_KEY = ["scoringConfig"]; 

export const useScoringConfig = () => {
  const { trainsets } = useServices();
  const queryClient = useQueryClient();

  const query = useQuery<ScoringConfigResponse>({
    queryKey: SCORING_CONFIG_KEY,
    queryFn: () => (trainsets as any).getScoringConfig(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: (weights: ScoringWeights) => (trainsets as any).updateScoringConfig(weights),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCORING_CONFIG_KEY });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => (trainsets as any).resetScoringConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCORING_CONFIG_KEY });
    },
  });

  return useMemo(
    () => ({
      ...query,
      save: updateMutation.mutateAsync,
      saveStatus: updateMutation.status,
      saveError: updateMutation.error,
      reset: resetMutation.mutateAsync,
      resetStatus: resetMutation.status,
      resetError: resetMutation.error,
    }),
    [query, updateMutation, resetMutation]
  );
};
