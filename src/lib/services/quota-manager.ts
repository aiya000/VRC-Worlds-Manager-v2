import { Context, Effect, Layer } from 'effect';

const QUOTA_STORAGE_KEY = 'cf_worker_quota_remaining';
const QUOTA_RESET_KEY = 'cf_worker_quota_reset_at';

export class QuotaService extends Context.Tag('QuotaService')<
  QuotaService,
  {
    readonly getQuotaRemaining: () => Effect.Effect<number>;
    readonly updateQuotaFromResponse: (
      response: Response,
    ) => Effect.Effect<void>;
    readonly hasEnoughQuota: (
      estimatedRequests: number,
    ) => Effect.Effect<boolean>;
  }
>() {}

export const QuotaServiceLive = Layer.succeed(QuotaService, {
  getQuotaRemaining: () =>
    Effect.sync(() => {
      if (typeof window === 'undefined') {
        return Infinity;
      }
      const resetAt = localStorage.getItem(QUOTA_RESET_KEY);
      if (resetAt && Date.now() > Number(resetAt)) {
        localStorage.removeItem(QUOTA_STORAGE_KEY);
        localStorage.removeItem(QUOTA_RESET_KEY);
        return Infinity;
      }
      const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
      return stored === null ? Infinity : Number(stored);
    }),

  updateQuotaFromResponse: (response) =>
    Effect.sync(() => {
      if (typeof window === 'undefined') {
        return;
      }
      const remaining = response.headers.get('X-Quota-Remaining');
      if (remaining !== null) {
        localStorage.setItem(QUOTA_STORAGE_KEY, remaining);
      }
      const resetAt = response.headers.get('X-Quota-Reset');
      if (resetAt !== null) {
        localStorage.setItem(QUOTA_RESET_KEY, resetAt);
      }
    }),

  hasEnoughQuota: (estimatedRequests) =>
    Effect.sync(() => {
      if (typeof window === 'undefined') {
        return true;
      }
      const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (stored === null) {
        return true;
      }
      return Number(stored) >= estimatedRequests;
    }),
});
