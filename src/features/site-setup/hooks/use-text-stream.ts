"use client";

import * as React from "react";

export type StreamState = "idle" | "loading" | "streaming" | "done" | "error";

/**
 * Reads a text stream into state. `source` is called per run with an abort
 * signal; today it is the in-browser fake, later a fetch of the streaming
 * endpoint piped through TextDecoderStream.
 */
export function useTextStream(source: (signal: AbortSignal) => AsyncIterable<string>) {
  const [text, setText] = React.useState("");
  const [state, setState] = React.useState<StreamState>("idle");
  const abortRef = React.useRef<AbortController | null>(null);
  const sourceRef = React.useRef(source);
  React.useEffect(() => {
    sourceRef.current = source;
  });

  const start = React.useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setText("");
    setState("loading");
    try {
      let first = true;
      for await (const chunk of sourceRef.current(ac.signal)) {
        if (first) {
          setState("streaming");
          first = false;
        }
        setText((t) => t + chunk);
      }
      if (!ac.signal.aborted) setState("done");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setState("error");
    }
  }, []);

  const stop = React.useCallback(() => abortRef.current?.abort(), []);
  React.useEffect(() => stop, [stop]);

  return { text, state, start, stop };
}
