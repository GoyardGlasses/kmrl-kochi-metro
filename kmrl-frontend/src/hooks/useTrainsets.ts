import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DecisionUpdatePayload, SimulationRules, Trainset } from "@/types";
import { useServices } from "@/context/ServicesProvider";
import { showToast } from "@/lib/toast";

const TRAINSETS_KEY = ["trainsets"];

export const useTrainsets = () => {
  const { trainsets } = useServices();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: TRAINSETS_KEY,
    queryFn: () => trainsets.listTrainsets(),
    staleTime: 1000 * 60 * 5,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DecisionUpdatePayload }) =>
      trainsets.updateDecision(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: TRAINSETS_KEY });
      const prevData = queryClient.getQueryData<Trainset[]>(TRAINSETS_KEY);
      queryClient.setQueryData(TRAINSETS_KEY, (prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((t) =>
          t.id === id ? { ...t, ...payload } : t
        );
      });
      return { prevData };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(TRAINSETS_KEY, (prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((t) => (t.id === updated.id ? updated : t));
      });
    },
    onError: (err, variables, context) => {
      if (context?.prevData) {
        queryClient.setQueryData(TRAINSETS_KEY, context.prevData);
      }

      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("failed with 401") || message.includes("failed with 403")) {
        showToast("Not authorized. Please login again to update trainset decisions.", "error", 5000);
      } else {
        showToast("Failed to update trainset decision.", "error", 4000);
      }

      console.error("Failed to update trainset decision:", err);
    },
  });

  const simulateMutation = useMutation({
    mutationFn: (rules: SimulationRules) => trainsets.simulate(rules),
    onError: (err) => {
      console.error("Simulation failed:", err);
    },
  });

  return useMemo(
    () => ({
      ...listQuery,
      updateDecision: updateMutation.mutateAsync,
      updateStatus: updateMutation.status,
      updateError: updateMutation.error,
      simulate: simulateMutation.mutateAsync,
      simulationStatus: simulateMutation.status,
      simulationError: simulateMutation.error,
    }),
    [listQuery, updateMutation, simulateMutation]
  );
};
