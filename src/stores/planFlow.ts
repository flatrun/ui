import { defineStore } from "pinia";
import { ref } from "vue";
import type { AxiosResponse } from "axios";
import type { Plan } from "@/types";
import { plansApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

export type PlanFlowResult = AxiosResponse | false;

export const usePlanFlowStore = defineStore("planFlow", () => {
  const plan = ref<Plan | null>(null);
  const applying = ref(false);

  let resolver: ((result: PlanFlowResult) => void) | null = null;

  function settle(result: PlanFlowResult) {
    const resolve = resolver;
    resolver = null;
    plan.value = null;
    applying.value = false;
    resolve?.(result);
  }

  async function runGuarded(
    directFn: () => Promise<AxiosResponse>,
    planFn: () => Promise<AxiosResponse>,
    errorTitle = "Action Failed",
  ): Promise<PlanFlowResult> {
    const notifications = useNotificationsStore();
    try {
      return await directFn();
    } catch (err: any) {
      if (err.response?.status === 428 && err.response?.data?.code === "plan_required") {
        return runPlanned(planFn);
      }
      notifications.error(errorTitle, err.response?.data?.error || err.message);
      return false;
    }
  }

  async function runPlanned(planFn: () => Promise<AxiosResponse>): Promise<PlanFlowResult> {
    const notifications = useNotificationsStore();
    let response: AxiosResponse;
    try {
      response = await planFn();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      notifications.error("Preview Failed", msg);
      return false;
    }

    const created: Plan | undefined = response.data?.plan;
    if (!created) {
      return response;
    }

    plan.value = created;
    return new Promise<PlanFlowResult>((resolve) => {
      resolver = resolve;
    });
  }

  async function apply() {
    if (!plan.value || applying.value) return;
    const notifications = useNotificationsStore();
    applying.value = true;
    try {
      const response = await plansApi.apply(plan.value.id);
      settle(response);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 409 && data?.drifted) {
        notifications.warning("Plan Stale", "State changed since preview; please retry");
      } else if (status === 410) {
        notifications.warning("Plan Expired", "The preview expired before it was applied; please retry");
      } else {
        notifications.error("Apply Failed", data?.error || err.message);
      }
      settle(false);
    }
  }

  async function discard() {
    if (applying.value) return;
    const current = plan.value;
    settle(false);
    if (current) {
      try {
        await plansApi.discard(current.id);
      } catch {
        // The plan expires on its own; a failed discard is not actionable.
      }
    }
  }

  return { plan, applying, runGuarded, runPlanned, apply, discard };
});
