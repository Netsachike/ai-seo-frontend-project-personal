function tryParseJsonObject(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Pulls the first usable message out of a single candidate payload, which may
 * be a string or an object shaped like `{ message }` or `{ message, errors }`.
 * Validation errors take precedence over the top-level message.
 */
function extractMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed ? trimmed : null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const validationErrors = record.errors;
  if (validationErrors && typeof validationErrors === "object") {
    for (const value of Object.values(validationErrors as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string" && value[0].trim()) {
        return value[0];
      }
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return null;
}

/**
 * Extracts a human-readable error message from an API error. Accepts the raw
 * axios error (reads `response.data`), the response body object directly, or a
 * JSON / plain string. Validation errors are preferred over the generic
 * message; the network-level message is only used as a last resort.
 */
export function getErrorMessage(error: unknown, defaultMessage = "Something went wrong"): string {
  const candidates: unknown[] = [];

  if (typeof error === "string") {
    candidates.push(tryParseJsonObject(error) ?? error);
  } else if (error && typeof error === "object") {
    const err = error as {
      response?: { data?: unknown };
      data?: unknown;
      message?: unknown;
    };

    // Richest first: the API response body, then the object itself.
    candidates.push(err.response?.data);
    candidates.push(err.data);
    candidates.push(error);

    // A network/Error message is the weakest signal, and might itself be JSON.
    if (typeof err.message === "string") {
      candidates.push(tryParseJsonObject(err.message) ?? err.message);
    }
  }

  for (const candidate of candidates) {
    const message = extractMessage(candidate);
    if (message) {
      return message;
    }
  }

  return defaultMessage;
}

/** The backend signals plan limits with an error message that mentions upgrading. */
export const mentionsUpgrade = (message: string) => message.toLowerCase().includes("upgrade");
