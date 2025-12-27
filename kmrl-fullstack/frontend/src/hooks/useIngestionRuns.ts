import { useQuery } from "@tanstack/react-query";
import type { IngestionRunListResponse } from "@/types";
import { useServices } from "@/context/ServicesProvider";

export const useIngestionRuns = (params?: {
  limit?: number;
  skip?: number;
  source?: string;
  status?: string;
}) => {
  const { trainsets } = useServices();

  return useQuery<IngestionRunListResponse>({
    queryKey: ["ingestionRuns", params],
    queryFn: () => (trainsets as any).listIngestionRuns(params),
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  });
};
