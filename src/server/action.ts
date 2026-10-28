import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "./validation";

export class ActionError extends Error {
  readonly code: "SUSPENDED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";

  constructor(code: ActionError["code"], message: string, readonly fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ActionError) {
      return {
        ok: false,
        error: error.message,
        ...(error.fieldErrors && { fieldErrors: error.fieldErrors }) };
    }
    throw error;
  }
}
