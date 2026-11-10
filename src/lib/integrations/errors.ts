/** A failure in an integration route handler, carrying the HTTP status and a short machine code. */
export class IntegrationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = "IntegrationError";
  }
}
