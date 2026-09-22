export abstract class AppError extends Error {
  abstract readonly kind: "not_found" | "rate_limit" | "network";

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  readonly kind = "not_found" as const;

  constructor(message = "The requested resource was not found.") {
    super(message);
  }
}

export class RateLimitError extends AppError {
  readonly kind = "rate_limit" as const;

  constructor(message = "PokéAPI is busy right now, try again in a moment.") {
    super(message);
  }
}

export class NetworkError extends AppError {
  readonly kind = "network" as const;

  constructor(message = "There was a connection problem.") {
    super(message);
  }
}
