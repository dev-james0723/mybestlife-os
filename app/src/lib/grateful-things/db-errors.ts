/** PostgREST / Postgres errors when a column is absent from the remote schema. */
export function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  column: string,
): boolean {
  if (!error) return false;
  if (error.code === "PGRST204" || error.code === "42703") return true;
  const message = error.message ?? "";
  return message.includes(column) && /column|schema cache/i.test(message);
}
