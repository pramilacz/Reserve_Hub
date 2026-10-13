import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RESERVATION_CONFLICT"
  | "RESOURCE_INACTIVE"
  | "INVALID_STATE"
  | "DUPLICATE"
  | "INTERNAL_ERROR";

/** An expected, user-facing failure. Everything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError("VALIDATION_ERROR", message, 400, details),
  unauthenticated: () => new AppError("UNAUTHENTICATED", "Choose a user to continue.", 401),
  forbidden: (message = "You do not have permission to do that.") =>
    new AppError("FORBIDDEN", message, 403),
  notFound: (what: string) => new AppError("NOT_FOUND", `${what} was not found.`, 404),
};

export function zodDetails(err: ZodError) {
  return err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
}
