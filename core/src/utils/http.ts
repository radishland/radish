import { type ErrorStatus, STATUS_TEXT, type StatusCode } from "@std/http";

export class AppError extends Error {
  public statusCode: ErrorStatus;

  constructor(
    statusCode: ErrorStatus,
    ...params: ConstructorParameters<typeof Error>
  ) {
    super(...params);
    this.statusCode = statusCode;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, AppError);
  }
}

export const createStandardResponse = (
  status: StatusCode,
  init?: ResponseInit,
) => {
  const statusText = STATUS_TEXT[status];
  return new Response(statusText, { status, statusText, ...init });
};
