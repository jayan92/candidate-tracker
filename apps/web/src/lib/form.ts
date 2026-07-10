/**
 * A blank optional text input. `null` clears the column; `undefined` would mean
 * "leave it alone", so a cleared field must never send `undefined`.
 */
export const nullable = (value: string): string | null =>
  value.trim() === "" ? null : value.trim();
