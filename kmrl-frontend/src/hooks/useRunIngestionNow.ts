import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/context/ServicesProvider";

export const useRunIngestionNow = () => {
  const { trainsets } = useServices();
  const queryClient = useQueryClient();

  const runMaximo = useMutation({
    mutationFn: () => (trainsets as any).runNowMaximoJobCards(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestionRuns"] });
    },
  });

  const runFitness = useMutation({
    mutationFn: () => (trainsets as any).runNowFitness(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestionRuns"] });
    },
  });

  return {
    runMaximo: runMaximo.mutateAsync,
    runMaximoStatus: runMaximo.status,
    runMaximoError: runMaximo.error,
    runFitness: runFitness.mutateAsync,
    runFitnessStatus: runFitness.status,
    runFitnessError: runFitness.error,
  };
};
