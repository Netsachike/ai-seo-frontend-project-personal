import { initializePaddle, type Paddle } from "@paddle/paddle-js";

/** True when a Paddle client token is set; without it checkout stays off. */
export const isPaddleConfigured = Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);

/**
 * Boots Paddle.js with the public client token. The environment is "sandbox"
 * while testing and "production" once live price IDs are in place.
 */
export async function initPaddle(): Promise<Paddle | undefined> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!token) {
    return undefined;
  }

  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox";

  const paddle = await initializePaddle({
    environment,
    token,
    eventCallback: (data) => {
      // Reload when the checkout overlay closes so a completed payment (new
      // plan or add-on) is reflected immediately.
      if (data?.name === "checkout.closed" && typeof window !== "undefined") {
        window.location.reload();
      }
    },
  });

  return paddle;
}
