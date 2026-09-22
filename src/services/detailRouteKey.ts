const DIGITS_ONLY = /^\d+$/;

export function normalizeDetailKey(raw: string): string | number | null {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return null;
  }

  if (DIGITS_ONLY.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed.toLowerCase();
}
