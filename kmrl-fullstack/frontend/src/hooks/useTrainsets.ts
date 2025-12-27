import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DecisionUpdatePayload, SimulationRules, Trainset } from "@/types";
import { useServices } from "@/context/ServicesProvider";
import { showToast } from "@/lib/toast";

const TRAINSETS_KEY = ["trainsets"];

export const useTrainsets = () => {
  const { trainsets } = useServices();
  const queryClient = useQueryClient();
  const seenHighConflictsRef = useRef<Set<string>>(new Set());

  const listQuery = useQuery({
    queryKey: TRAINSETS_KEY,
    queryFn: () => trainsets.listTrainsets(),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
  });

  useEffect(() => {
    const data = listQuery.data;
    if (!Array.isArray(data)) return;

    const nextHigh = new Set<string>();
    const newHigh: string[] = [];

    data.forEach((t) => {
      (t.conflicts || []).forEach((c) => {
        if (c.severity !== "HIGH") return;
        const key = `${t.id}:${c.type}:${c.message}`;
        nextHigh.add(key);
        if (!seenHighConflictsRef.current.has(key)) {
          newHigh.push(`${t.id}: ${c.message}`);
        }
      });
    });

    if (newHigh.length > 0) {
      showToast(
        `New high-severity conflict(s): ${newHigh.slice(0, 2).join(" | ")}${newHigh.length > 2 ? "..." : ""}`,
        "error"
      );
    }

    seenHighConflictsRef.current = nextHigh;
  }, [listQuery.data]);

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
