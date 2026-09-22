import { NetworkError, NotFoundError, RateLimitError } from "../domain/errors";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = [1_000, 2_000];
const JITTER_MS = 250;

function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attemptIndex: number): number {
  const base =
    BASE_BACKOFF_MS[attemptIndex] ??
    BASE_BACKOFF_MS[BASE_BACKOFF_MS.length - 1];
  return base + Math.random() * JITTER_MS;
}

async function fetchOnce(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function httpGet<T>(url: string): Promise<T> {
  let lastStatus: number | null = null;
  let lastWasConnectionFailure = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchOnce(url);

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (!isTransientStatus(response.status)) {
        throw new NotFoundError();
      }

      lastStatus = response.status;
      lastWasConnectionFailure = false;

      if (!isTransientStatus(response.status) || attempt === MAX_RETRIES) {
        break;
      }
    } catch (caughtError) {
      if (caughtError instanceof NotFoundError) {
        throw caughtError;
      }

      lastStatus = null;
      lastWasConnectionFailure = true;

      if (attempt === MAX_RETRIES) {
        break;
      }
    }

    await wait(backoffDelay(attempt));
  }

  if (lastStatus === 429) {
    throw new RateLimitError();
  }

  if (lastWasConnectionFailure || (lastStatus !== null && lastStatus >= 500)) {
    throw new NetworkError();
  }

  throw new NetworkError();
}
