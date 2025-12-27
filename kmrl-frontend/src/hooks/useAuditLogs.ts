import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditAction, AuditLogListResponse } from "@/types";
import { useServices } from "@/context/ServicesProvider";

export const useAuditLogs = (params: {
  limit: number;
  skip: number;
  action?: AuditAction | "ALL";
  trainsetId?: string;
}) => {
  const { trainsets } = useServices();

  const query = useQuery({
    queryKey: ["auditLogs", params],
    queryFn: () =>
      (trainsets as any).listAuditLogs({
        limit: params.limit,
        skip: params.skip,
        action: params.action && params.action !== "ALL" ? params.action : undefined,
        trainsetId: params.trainsetId || undefined,
      }) as Promise<AuditLogListResponse>,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });

  return useMemo(() => ({ ...query }), [query]);
};
