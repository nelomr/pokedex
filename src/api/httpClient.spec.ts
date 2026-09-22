import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkError, NotFoundError, RateLimitError } from "../domain/errors";
import { httpGet } from "./httpClient";

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("httpClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("throws NotFoundError after exactly one fetch call on 404, never retried", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(404));

    const promise = httpGet("https://pokeapi.co/api/v2/pokemon/does-not-exist");
    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries 429 up to 2 times with ~1s then ~2s backoff, then throws RateLimitError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(429));

    const promise = httpGet("https://pokeapi.co/api/v2/pokemon?limit=100000");
    const assertion = expect(promise).rejects.toBeInstanceOf(RateLimitError);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2500);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await assertion;
  });

  it("retries 500 up to 2 times then throws NetworkError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(500));

    const promise = httpGet("https://pokeapi.co/api/v2/pokemon?limit=100000");
    const assertion = expect(promise).rejects.toBeInstanceOf(NetworkError);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(2500);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await assertion;
  });

  it("surfaces NetworkError on a dropped connection", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const promise = httpGet("https://pokeapi.co/api/v2/pokemon?limit=100000");
    const assertion = expect(promise).rejects.toBeInstanceOf(NetworkError);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(2500);

    await assertion;
  });

  it("aborts and surfaces NetworkError when a request exceeds 8s", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const promise = httpGet("https://pokeapi.co/api/v2/pokemon?limit=100000");
    const assertion = expect(promise).rejects.toBeInstanceOf(NetworkError);

    await vi.runAllTimersAsync();

    await assertion;
  }, 10_000);

  it("throws NotFoundError after exactly one fetch call on a non-404 4xx, never retried", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(400));

    const promise = httpGet("https://pokeapi.co/api/v2/pokemon?limit=100000");
    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resolves normally on a success on retry #1", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = httpGet<{ ok: boolean }>(
      "https://pokeapi.co/api/v2/pokemon?limit=100000",
    );

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
