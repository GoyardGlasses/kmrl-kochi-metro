import type { Decision, Trainset } from "@/types";

export const getDecisionCounts = (trainsets: Trainset[]) => {
  return trainsets.reduce<Record<Decision, number>>(
    (acc, ts) => {
      acc[ts.recommendation] += 1;
      return acc;
    },
    {
      REVENUE: 0,
      STANDBY: 0,
      IBL: 0,
    }
  );
};
