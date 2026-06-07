import type { AxiosResponse } from "axios";
import { usePlanFlowStore, type PlanFlowResult } from "@/stores/planFlow";

export function usePlanFlow() {
  const store = usePlanFlowStore();

  const runPlanned = (planFn: () => Promise<AxiosResponse>): Promise<PlanFlowResult> => store.runPlanned(planFn);

  const runGuarded = (
    directFn: () => Promise<AxiosResponse>,
    planFn: () => Promise<AxiosResponse>,
    errorTitle?: string,
  ): Promise<PlanFlowResult> => store.runGuarded(directFn, planFn, errorTitle);

  return { runPlanned, runGuarded };
}
