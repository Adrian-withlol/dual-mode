export type AskStreamEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: { stopReason?: string } }
  | { event: "error"; data: { message: string } };

/**
 * Calls /api/ask and yields parsed Server-Sent Events as they arrive.
 * Not EventSource-based (EventSource can't send a POST body) — this is a
 * minimal manual SSE parser over a streamed fetch response body.
 */
export async function* streamAsk(
  question: string,
  signal: AbortSignal
): AsyncGenerator<AskStreamEvent> {
  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      yield { event: "error", data: { message: "Generation stopped." } };
      return;
    }
    yield {
      event: "error",
      data: {
        message:
          "Could not reach the server. Check your connection and try again.",
      },
    };
    return;
  }

  if (!res.ok || !res.body) {
    let message = `Request failed (status ${res.status}).`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // response wasn't JSON; keep the generic message
    }
    yield { event: "error", data: { message } };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        const eventMatch = /^event: (.+)$/m.exec(rawEvent);
        const dataMatch = /^data: (.+)$/m.exec(rawEvent);
        if (!dataMatch) continue;

        const eventName = eventMatch?.[1]?.trim() ?? "message";
        try {
          const data = JSON.parse(dataMatch[1]);
          yield { event: eventName, data } as AskStreamEvent;
        } catch {
          // Malformed chunk — skip it rather than crash the stream.
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      yield { event: "error", data: { message: "Generation stopped." } };
      return;
    }
    yield {
      event: "error",
      data: { message: "The connection to the AI service was interrupted." },
    };
  }
}
