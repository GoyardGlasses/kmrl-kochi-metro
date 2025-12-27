import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScoredInductionResponse, ScoringWeights } from "@/types";
import { createServices } from "@/services/serviceFactory";

export const SCORED_INDUCTION_KEY = "scoredInduction";

export const useScoredInduction = (params?: {
  limit?: number;
  skip?: number;
  decision?: string;
  brandingPriority?: string;
  cleaningStatus?: string;
  jobCardOpen?: boolean;
  minScore?: number;
  weights?: Partial<ScoringWeights>;
}) => {
  const queryClient = useQueryClient();
  const services = createServices();

  const query = useQuery<ScoredInductionResponse>({
    queryKey: [SCORED_INDUCTION_KEY, params],
    queryFn: () => services.trainsets.getScoredInduction(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [SCORED_INDUCTION_KEY] });

  return { ...query, invalidate };
};
