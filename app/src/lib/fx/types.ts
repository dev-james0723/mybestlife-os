/** Frankfurter `latest` JSON (see https://www.frankfurter.app/docs ). */
export type FrankfurterLatestResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

export type FxRatesPayload = FrankfurterLatestResponse & {
  /** When our server fetched upstream (ISO timestamp). */
  fetchedAt: string;
};
