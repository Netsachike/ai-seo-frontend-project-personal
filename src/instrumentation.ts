/**
 * Starts the MSW Node server so Server Components can fetch mocked data for
 * first paint. The browser worker is started lazily by the API client.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
    const { server } = await import("@/lib/mocks/node");
    server.listen({ onUnhandledFrame: "bypass" });
  }
}
