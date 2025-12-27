import { useQuery } from "@tanstack/react-query";
import { useServices } from "@/context/ServicesProvider";

export const useTrainset = (id?: string) => {
  const { trainsets } = useServices();

  return useQuery({
    queryKey: ["trainsets", id],
    queryFn: () => trainsets.getTrainset(id as string),
    enabled: Boolean(id),
  });
};
