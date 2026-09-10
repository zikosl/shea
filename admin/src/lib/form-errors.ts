export const EMAIL_ALREADY_IN_USE_MESSAGE =
  "An account already uses this email. Use another email.";

export type AccountSaveErrorCode = "EMAIL_ALREADY_IN_USE" | "SAVE_FAILED";

export type AccountSaveResult<T> =
  | { ok: true; item: T }
  | { ok: false; code: AccountSaveErrorCode };

export function isEmailAlreadyInUseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("EMAIL_ALREADY_IN_USE");
}

export function getAccountSaveErrorCode(error: unknown): AccountSaveErrorCode {
  return isEmailAlreadyInUseError(error) ? "EMAIL_ALREADY_IN_USE" : "SAVE_FAILED";
}
