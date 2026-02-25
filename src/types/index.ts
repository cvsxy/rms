export type { SessionPayload } from "@/lib/auth";

export interface ApiError {
  error: string;
  details?: string;
}

export interface ApiSuccess<T = unknown> {
  data: T;
}
