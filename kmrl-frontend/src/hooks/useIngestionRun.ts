import { useQuery } from "@tanstack/react-query";
import type { IngestionRun } from "@/types";
import { useServices } from "@/context/ServicesProvider";

export const useIngestionRun = (id?: string, enabled = true) => {
  const { trainsets } = useServices();

  return useQuery<IngestionRun>({
    queryKey: ["ingestionRun", id],
    queryFn: () => (trainsets as any).getIngestionRun(id),
    enabled: !!id && enabled,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  });
};
