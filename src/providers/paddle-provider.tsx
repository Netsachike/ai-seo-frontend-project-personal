"use client";

import * as React from "react";
import type { Paddle } from "@paddle/paddle-js";

import { initPaddle, isPaddleConfigured } from "@/lib/paddle";

interface PaddleContextType {
  paddle: Paddle | null;
  paddleReady: boolean;
  /** False when no client token is set, so the UI can say checkout is off instead of "loading". */
  paddleConfigured: boolean;
}

export const PaddleContext = React.createContext<PaddleContextType>({
  paddle: null,
  paddleReady: false,
  paddleConfigured: isPaddleConfigured,
});

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = React.useState<Paddle | null>(null);
  const [paddleReady, setPaddleReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    initPaddle()
      .then((instance) => {
        if (mounted && instance) {
          setPaddle(instance);
          setPaddleReady(true);
        }
      })
      .catch((error) => console.error("Failed to initialize Paddle:", error));

    return () => {
      mounted = false;
    };
  }, []);

  const value = React.useMemo(
    () => ({ paddle, paddleReady, paddleConfigured: isPaddleConfigured }),
    [paddle, paddleReady],
  );

  return <PaddleContext.Provider value={value}>{children}</PaddleContext.Provider>;
}
