import { describe, expect, it } from "vitest";

import { mapConditionCode } from "@/lib/weather/openweather-forecast";
import {
  mapConditionCodeToAnimation,
  resolveWeatherAnimationKey,
} from "@/lib/weather/lottie-animation";

describe("weather lottie animation consistency", () => {
  it("maps broken clouds (803) to partly-cloudy-day with sun animation", () => {
    const code = mapConditionCode(803, "03d");
    expect(code).toBe("partly-cloudy-day");
    expect(mapConditionCodeToAnimation(code)).toBe("partly-cloudy-day");
    expect(
      resolveWeatherAnimationKey({ weatherId: 803, icon: "03d" }),
    ).toBe("partly-cloudy-day");
    expect(
      resolveWeatherAnimationKey({ conditionCode: code }),
    ).toBe("partly-cloudy-day");
  });

  it("maps overcast (804) to cloudy animation without sun", () => {
    const code = mapConditionCode(804, "03d");
    expect(code).toBe("cloudy");
    expect(mapConditionCodeToAnimation(code)).toBe("cloudy");
    expect(
      resolveWeatherAnimationKey({ weatherId: 804, icon: "03d" }),
    ).toBe("cloudy");
  });

  it("pill and widget paths agree for scattered clouds (802)", () => {
    const code = mapConditionCode(802, "03d");
    const fromId = resolveWeatherAnimationKey({ weatherId: 802, icon: "03d" });
    const fromCode = resolveWeatherAnimationKey({ conditionCode: code });
    expect(fromId).toBe(fromCode);
    expect(fromId).toBe("partly-cloudy-day");
  });
});
