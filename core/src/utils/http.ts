import { STATUS_TEXT, type StatusCode } from "@std/http";

export const createStandardResponse = (
  status: StatusCode,
  init?: ResponseInit,
) => {
  const statusText = STATUS_TEXT[status];
  return new Response(statusText, { status, statusText, ...init });
};
