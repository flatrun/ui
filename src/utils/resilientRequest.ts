import type { AxiosError } from "axios";

export interface ResilientRequestOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number) => void;
  onWaiting?: (isWaiting: boolean) => void;
}

function isNetworkError(error: AxiosError): boolean {
  return (
    !error.response &&
    (error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ECONNABORTED" ||
      error.message?.includes("Network Error"))
  );
}

export async function resilientRequest<T>(
  requestFn: () => Promise<T>,
  options: ResilientRequestOptions = {},
): Promise<T> {
  const { maxRetries = 10, initialDelay = 1000, maxDelay = 5000, onRetry, onWaiting } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        onWaiting?.(false);
      }
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      const axiosError = error as AxiosError;

      if (!isNetworkError(axiosError) || attempt >= maxRetries) {
        onWaiting?.(false);
        throw error;
      }

      const delay = Math.min(initialDelay * Math.pow(1.5, attempt), maxDelay);
      onWaiting?.(true);
      onRetry?.(attempt + 1, delay);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function executeWithServiceRestart<T>(
  actionFn: () => Promise<T>,
  verifyFn: () => Promise<unknown>,
  options: ResilientRequestOptions & { actionTimeout?: number } = {},
): Promise<{ result: T | null; serviceRestarted: boolean }> {
  const { actionTimeout = 30000, ...retryOptions } = options;

  let result: T | null = null;
  let serviceRestarted = false;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Action timeout")), actionTimeout),
    );
    result = await Promise.race([actionFn(), timeoutPromise]);
  } catch (error) {
    const axiosError = error as AxiosError;
    if (isNetworkError(axiosError)) {
      serviceRestarted = true;
    } else {
      throw error;
    }
  }

  if (serviceRestarted) {
    await resilientRequest(verifyFn, retryOptions);
  }

  return { result, serviceRestarted };
}
