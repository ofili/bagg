/** Minor units per major unit (kobo per naira, cents per dollar). */
export const MINOR = 100;

/** Keeps digits and one decimal point. Commas are dropped, so "250,000" works. */
export function cleanAmount(raw: string, previous: string): string {
  const value = raw.replace(/,/g, '');
  return /^\d*\.?\d*$/.test(value) ? value : previous;
}

/** "250.50" becomes 25050. Anything that is not a number counts as 0. */
export function toMinor(text: string): number {
  return Math.round((parseFloat(text) || 0) * MINOR);
}
