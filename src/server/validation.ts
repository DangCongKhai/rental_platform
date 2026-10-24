import { z } from "zod";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const ACTOR_FIELDS = ["user_id", "owner_id", "is_admin"] as const;
const INVALID_FORM = "Dữ liệu không hợp lệ.";
const ACTOR_FIELD_MESSAGE = "Trường này không được gửi từ biểu mẫu.";

const DEFAULT_MESSAGE_PREFIXES = [
  "Invalid input:",
  "Invalid email",
  "Invalid string",
  "Invalid number",
  "Invalid date",
  "Invalid url",
  "Invalid uuid",
  "Too small:",
  "Too big:",
  "Unrecognized key",
];

type FieldIssue = {
  code: string;
  message: string;
  path: PropertyKey[];
  origin?: unknown;
  minimum?: unknown;
};

function isDefaultMessage(message: string) {
  return DEFAULT_MESSAGE_PREFIXES.some((prefix) => message.startsWith(prefix));
}

function fieldMessage(issue: FieldIssue) {
  if (!isDefaultMessage(issue.message)) return issue.message;

  if (issue.code === "invalid_type") return "Trường này là bắt buộc.";

  if (
    issue.code === "too_small" &&
    issue.origin === "string" &&
    issue.minimum === 1
  ) {
    return "Trường này là bắt buộc.";
  }

  return "Trường này không hợp lệ.";
}

function formObject(formData: FormData) {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  return raw;
}

export function parseForm<Schema extends z.ZodType>(
  schema: Schema,
  formData: FormData,
): ActionResult<z.output<Schema>> {
  const fieldErrors: Record<string, string> = {};
  for (const field of ACTOR_FIELDS) {
    if (formData.has(field)) fieldErrors[field] = ACTOR_FIELD_MESSAGE;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: INVALID_FORM, fieldErrors };
  }

  const parsed = schema.safeParse(formObject(formData));
  if (parsed.success) return { ok: true, data: parsed.data };

  for (const issue of parsed.error.issues as FieldIssue[]) {
    const key = issue.path[0];
    const field =
      typeof key === "string" || typeof key === "number" ? String(key) : "form";
    if (!fieldErrors[field]) fieldErrors[field] = fieldMessage(issue);
  }

  return { ok: false, error: INVALID_FORM, fieldErrors };
}
