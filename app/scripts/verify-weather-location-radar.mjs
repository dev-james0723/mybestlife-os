import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl =
  process.env.WEATHER_VERIFY_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve(
  process.env.WEATHER_VERIFY_OUTPUT_DIR ??
    path.join(appRoot, "..", "artifacts/weather-fix-2026-09-08"),
);
const browserExecutable = [
  process.env.WEATHER_VERIFY_BROWSER,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].find((candidate) => candidate && existsSync(candidate));

assert(browserExecutable, "A Chromium browser executable is required");
await mkdir(outputDir, { recursive: true });

const latitude = 39.7684;
const longitude = -86.1581;
const radarRequests = [];
const radarResponses = [];
const cartoRequests = [];
const pageErrors = [];

const browser = await chromium.launch({
  executablePath: browserExecutable,
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  locale: "en-US",
  timezoneId: "America/Indiana/Indianapolis",
  geolocation: { latitude, longitude, accuracy: 15 },
  permissions: ["geolocation"],
  reducedMotion: "reduce",
});

await context.addCookies([
  { name: "mylifeos_dev_bypass", value: "1", url: baseUrl },
]);

const page = await context.newPage();
page.setDefaultTimeout(60_000);
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("request", (request) => {
  const url = request.url();
  if (/rainviewer\.com/i.test(url)) radarRequests.push(url);
  if (/cartocdn\.com/i.test(url)) cartoRequests.push(url);
});
page.on("response", (response) => {
  if (/rainviewer\.com/i.test(response.url())) {
    radarResponses.push({
      url: response.url(),
      status: response.status(),
      contentType: response.headers()["content-type"] ?? "",
    });
  }
});

await page.route("**/auth/v1/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: null }),
  }),
);
await page.route("**/rest/v1/**", (route) => {
  const wantsObject = (route.request().headers().accept ?? "").includes(
    "application/vnd.pgrst.object+json",
  );
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "content-range": "*/0" },
    body: wantsObject ? "null" : "[]",
  });
});

const forecastEntries = Array.from({ length: 16 }, (_, index) => ({
  dt: 1_788_840_000 + index * 10_800,
  main: {
    temp: 18 + (index % 3),
    temp_min: 17,
    temp_max: 21,
    humidity: 72,
    pressure: 1015,
  },
  weather: [{ id: 803, main: "Clouds", description: "broken clouds", icon: "04d" }],
  wind: { speed: 2.5, deg: 240 },
  visibility: 10_000,
  pop: 0.15,
  dt_txt: new Date((1_788_840_000 + index * 10_800) * 1000).toISOString(),
}));

await page.route("https://api.openweathermap.org/**", (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith("/geo/1.0/reverse")) {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          name: "Indianapolis",
          lat: latitude,
          lon: longitude,
          country: "US",
          state: "Indiana",
        },
      ]),
    });
  }
  if (url.pathname.endsWith("/data/2.5/forecast")) {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ list: forecastEntries }),
    });
  }
  if (url.pathname.endsWith("/data/2.5/weather")) {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        weather: [
          { id: 803, main: "Clouds", description: "broken clouds", icon: "04d" },
        ],
        main: {
          temp: 18,
          feels_like: 18,
          temp_min: 17,
          temp_max: 21,
          pressure: 1015,
          humidity: 72,
        },
        wind: { speed: 2.5, deg: 240 },
        visibility: 10_000,
        clouds: { all: 68 },
        sys: { country: "US", sunrise: 1_788_814_800, sunset: 1_788_861_600 },
        name: "Indianapolis",
        dt: 1_788_842_400,
        timezone: -14_400,
      }),
    });
  }
  return route.abort("blockedbyclient");
});

await page.route("**/api/weather/supplements**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      uvIndex: 2,
      airQualityIndex: 34,
      aqiCategory: "good",
    }),
  }),
);
await page.route(/https:\/\/.*(?:wikipedia|wikimedia|unsplash).*\/.*/, (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
);

try {
  await page.goto(`${baseUrl}/en/weather`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  const placeHeading = page.getByRole("heading", {
    level: 1,
    name: "Indianapolis, Indiana",
  });
  await placeHeading.waitFor({ timeout: 120_000 });
  await page.getByText("Using GPS location", { exact: true }).waitFor();

  const locationButtons = page.getByRole("button", {
    name: "Use my location",
    exact: true,
  });
  assert.equal(await locationButtons.count(), 2, "Both GPS controls must be present");

  await locationButtons.first().click();
  await placeHeading.waitFor();
  await locationButtons.nth(1).click();
  await placeHeading.waitFor();

  assert.equal(
    await page.getByText("Current location", { exact: true }).count(),
    0,
    "A generic location label must never be rendered",
  );

  const radarSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Live Radar" }) });
  await radarSection.scrollIntoViewIfNeeded();
  await page.locator(".weather-radar-map .leaflet-tile-loaded").first().waitFor({
    timeout: 120_000,
  });
  await page.waitForTimeout(1_500);
  await page
    .getByText("Current location found", { exact: true })
    .first()
    .waitFor({ state: "hidden", timeout: 10_000 });

  assert.equal(cartoRequests.length, 0, "CARTO must not receive radar map requests");
  assert(
    radarRequests.some((url) =>
      url.includes("maps.rainviewer.com/styles/m2_dark/256/"),
    ),
    "The official RainViewer basemap must be requested",
  );
  assert(
    radarResponses.some(
      ({ url, status, contentType }) =>
        url.includes("maps.rainviewer.com/styles/m2_dark/256/") &&
        status >= 200 &&
        status < 300 &&
        contentType.includes("image/png"),
    ),
    "At least one RainViewer basemap tile must return a successful PNG",
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  assert.equal(overflow, false, "The 390px mobile viewport must not overflow");

  await radarSection.screenshot({
    path: path.join(outputDir, "mobile-live-radar.png"),
    animations: "disabled",
  });
  await page.screenshot({
    path: path.join(outputDir, "mobile-weather-page.png"),
    fullPage: true,
    animations: "disabled",
  });

  const result = {
    execution: "local browser fixture; no account or production writes",
    placeName: await placeHeading.innerText(),
    precision: await page.getByText("Using GPS location", { exact: true }).innerText(),
    locationControlsExercised: 2,
    cartoRequestCount: cartoRequests.length,
    rainViewerRequestCount: radarRequests.length,
    successfulRainViewerPngCount: radarResponses.filter(
      ({ status, contentType }) =>
        status >= 200 && status < 300 && contentType.includes("image/png"),
    ).length,
    mobileOverflow: overflow,
    pageErrors,
  };
  assert.deepEqual(pageErrors, []);
  await writeFile(
    path.join(outputDir, "browser-result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
