import { describe, expect, it } from "vitest";

import { MockFlightWatchProvider } from "./flight-watch";

describe("MockFlightWatchProvider", () => {
  it("never reports built-in estimates as live fares", async () => {
    const provider = new MockFlightWatchProvider();

    const quote = await provider.quote({
      origin_airport: "JFK",
      destination_airport: "KEF",
      depart_date: "2027-01-15",
      return_date: "2027-01-23",
      currency: "USD",
    });

    expect(quote.provider).toBe("mock");
    expect(quote.mode).toBe("exploratory");
    expect(quote.notes).toMatch(/estimate/i);
    expect(quote.raw.requested_exact_date).toBe(true);
  });
});
