import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl =
  process.env.RELATIONSHIP_VERIFY_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.join(appRoot, "test-results/relationship-modal");
const configuredBrowser =
  process.env.RELATIONSHIP_VERIFY_BROWSER ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const RELATIONSHIP_ID = "10000000-0000-4000-8000-000000000001";
const FIXED_TIME = "2026-09-03T12:00:00.000Z";

const linkedOptions = {
  project: {
    id: "20000000-0000-4000-8000-000000000001",
    title: "Relationship Modal Project",
  },
  goal: {
    id: "30000000-0000-4000-8000-000000000001",
    title: "Deepen Important Relationships",
  },
  note: {
    id: "40000000-0000-4000-8000-000000000001",
    title: "Conversation Follow-up Notes",
  },
  idea: {
    id: "50000000-0000-4000-8000-000000000001",
    title: "Thoughtful Birthday Ritual",
  },
};

const viewportCatalog = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];
const requestedViewport = process.env.RELATIONSHIP_VERIFY_VIEWPORT;
const viewports = requestedViewport
  ? viewportCatalog.filter(({ name }) => name === requestedViewport)
  : viewportCatalog;
assert(
  viewports.length > 0,
  `Unknown RELATIONSHIP_VERIFY_VIEWPORT: ${requestedViewport}`,
);
const receiptName = requestedViewport
  ? `receipt-${requestedViewport}.json`
  : "receipt.json";

function relationshipSeed() {
  return {
    id: RELATIONSHIP_ID,
    user_id: USER_ID,
    person_name: "Ada Lovelace",
    photo_url: null,
    category: "mentor",
    relationship_strength: "strong",
    email: "ada@example.com",
    phone: "+1 317 555 0148",
    social_links: [
      { platform: "instagram", url: "https://www.instagram.com/ada" },
      { platform: "facebook", url: "https://www.facebook.com/ada" },
      { platform: "linkedin", url: "https://www.linkedin.com/in/ada" },
      { platform: "website", url: "https://www.example.com/ada" },
    ],
    last_contact_date: "2026-03-14",
    last_interaction_notes: "Discussed analytical engines and careful follow-up.",
    next_action: "Send the annotated program notes.",
    next_action_date: "2026-09-18",
    commitments_made: null,
    preferences_and_details: null,
    general_notes: null,
    tags: ["mentor"],
    linked_project_id: linkedOptions.project.id,
    linked_project_ids: [linkedOptions.project.id],
    linked_goal_ids: [linkedOptions.goal.id],
    linked_note_ids: [linkedOptions.note.id],
    linked_idea_ids: [linkedOptions.idea.id],
    is_favorite: false,
    created_at: FIXED_TIME,
    updated_at: FIXED_TIME,
  };
}

function seedTables() {
  return new Map([
    ["relationships", [relationshipSeed()]],
    [
      "projects",
      [
        {
          id: linkedOptions.project.id,
          user_id: USER_ID,
          name: linkedOptions.project.title,
          description: null,
          status: "active",
          priority: "medium",
          start_date: null,
          end_date: null,
          color: null,
          tags: [],
          thumbnail_url: null,
          thumbnail_style: null,
          created_at: FIXED_TIME,
          updated_at: FIXED_TIME,
        },
      ],
    ],
    [
      "goals",
      [
        {
          id: linkedOptions.goal.id,
          user_id: USER_ID,
          name: linkedOptions.goal.title,
          description: null,
          status: "active",
          target_date: null,
          category: "relationships",
          created_at: FIXED_TIME,
          updated_at: FIXED_TIME,
        },
      ],
    ],
    [
      "notes",
      [
        {
          id: linkedOptions.note.id,
          user_id: USER_ID,
          project_id: linkedOptions.project.id,
          title: linkedOptions.note.title,
          content: "Send a concise recap.",
          category: "relationships",
          tags: [],
          is_favorite: false,
          created_at: FIXED_TIME,
          updated_at: FIXED_TIME,
          project: {
            id: linkedOptions.project.id,
            name: linkedOptions.project.title,
          },
        },
      ],
    ],
    [
      "ideas",
      [
        {
          id: linkedOptions.idea.id,
          user_id: USER_ID,
          content: "Remember meaningful dates with a small thoughtful ritual.",
          source_type: "text",
          capture_kind: "idea",
          voice_transcript: null,
          linked_project_ids: [],
          linked_task_ids: [],
          linked_goal_ids: [],
          linked_idea_ids: [],
          status: "captured",
          category: "random",
          title: linkedOptions.idea.title,
          ai_tags: [],
          manual_tags: [],
          destinations: [],
          attachments: [],
          ai_suggestions: null,
          processing_step: null,
          linked_knowledge_item_ids: [],
          linked_node_ids: [],
          related_resource_refs: [],
          created_at: FIXED_TIME,
          updated_at: FIXED_TIME,
        },
      ],
    ],
    ["role_models", []],
    ["relationship_promises", []],
    ["relationship_interactions", []],
    ["relationship_images", []],
    ["relationship_message_drafts", []],
    ["relationship_ai_reports", []],
  ]);
}

function matchesPostgrestFilters(row, url) {
  for (const [key, value] of url.searchParams.entries()) {
    if (!value.startsWith("eq.")) continue;
    if (String(row[key]) !== value.slice(3)) return false;
  }
  return true;
}

function postgrestTableName(url) {
  const marker = "/rest/v1/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return "";
  return decodeURIComponent(
    url.pathname.slice(markerIndex + marker.length).split("/")[0] ?? "",
  );
}

function responseBodyFor(request, rows) {
  const accept = request.headers().accept ?? "";
  return accept.includes("application/vnd.pgrst.object+json")
    ? (rows[0] ?? null)
    : rows;
}

async function fulfillJson(route, body, rows = []) {
  const contentRange =
    rows.length > 0 ? `0-${rows.length - 1}/${rows.length}` : "*/0";
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers":
        "authorization, apikey, content-type, prefer, x-client-info",
      "access-control-expose-headers": "Content-Range, Preference-Applied",
      "content-range": contentRange,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Installs a deterministic, stateful PostgREST double. The verifier currently
 * performs read-only UI interactions, while the write paths make the fixture
 * safe to reuse if the form flow later grows a save assertion.
 */
async function installMocks(page) {
  const tables = seedTables();
  const touchedTables = new Set();
  let writeSequence = 0;

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, HEAD, POST, PATCH, DELETE, OPTIONS",
          "access-control-allow-headers":
            "authorization, apikey, content-type, prefer, x-client-info",
        },
        body: "",
      });
      return;
    }

    const url = new URL(request.url());
    const tableName = postgrestTableName(url);
    touchedTables.add(tableName);
    const current = tables.get(tableName) ?? [];

    if (method === "GET" || method === "HEAD") {
      const rows = current.filter((row) => matchesPostgrestFilters(row, url));
      await fulfillJson(
        route,
        method === "HEAD" ? null : responseBodyFor(request, rows),
        rows,
      );
      return;
    }

    if (method === "POST") {
      const posted = request.postDataJSON();
      const records = (Array.isArray(posted) ? posted : [posted]).map((record) => ({
        id:
          typeof record.id === "string"
            ? record.id
            : `90000000-0000-4000-8000-${String(++writeSequence).padStart(12, "0")}`,
        user_id: USER_ID,
        created_at: FIXED_TIME,
        updated_at: FIXED_TIME,
        ...record,
      }));

      const conflictKey = url.searchParams.get("on_conflict");
      if (conflictKey) {
        for (const record of records) {
          const existingIndex = current.findIndex(
            (candidate) => candidate[conflictKey] === record[conflictKey],
          );
          if (existingIndex >= 0) current[existingIndex] = { ...current[existingIndex], ...record };
          else current.push(record);
        }
      } else {
        current.push(...records);
      }
      tables.set(tableName, current);
      await fulfillJson(route, responseBodyFor(request, records), records);
      return;
    }

    if (method === "PATCH") {
      const patch = request.postDataJSON();
      const updated = [];
      const next = current.map((row) => {
        if (!matchesPostgrestFilters(row, url)) return row;
        const merged = { ...row, ...patch, updated_at: FIXED_TIME };
        updated.push(merged);
        return merged;
      });
      tables.set(tableName, next);
      await fulfillJson(route, responseBodyFor(request, updated), updated);
      return;
    }

    if (method === "DELETE") {
      const deleted = current.filter((row) => matchesPostgrestFilters(row, url));
      tables.set(
        tableName,
        current.filter((row) => !matchesPostgrestFilters(row, url)),
      );
      await fulfillJson(route, responseBodyFor(request, deleted), deleted);
      return;
    }

    await route.abort("blockedbyclient");
  });

  return {
    get touchedTables() {
      return [...touchedTables].filter(Boolean).sort();
    },
  };
}

function overlaps(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function assertNoHorizontalOverflow(page, dialog, label) {
  const globalOverflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.scrollWidth - window.innerWidth,
  }));
  assert(
    globalOverflow.document <= 1 && globalOverflow.body <= 1,
    `${label} page horizontal overflow: ${JSON.stringify(globalOverflow)}`,
  );

  const dialogOverflow = await dialog.evaluate((element) => ({
    content: element.scrollWidth - element.clientWidth,
    viewport: (() => {
      const viewport = element.querySelector('[data-slot="scroll-area-viewport"]');
      return viewport ? viewport.scrollWidth - viewport.clientWidth : null;
    })(),
  }));
  assert(
    dialogOverflow.content <= 1 &&
      (dialogOverflow.viewport === null || dialogOverflow.viewport <= 1),
    `${label} dialog horizontal overflow: ${JSON.stringify(dialogOverflow)}`,
  );

  return { globalOverflow, dialogOverflow };
}

async function assertChecked(checkbox, label) {
  await checkbox.click();
  const checked = await checkbox.evaluate(
    (element) =>
      element.getAttribute("aria-checked") === "true" ||
      (element instanceof HTMLInputElement && element.checked),
  );
  assert(checked, `${label} checkbox did not become checked`);
}

async function waitForStyledDialog(page) {
  const waitForReadyState = () =>
    page.waitForFunction(() => {
      const dialog = document.querySelector('[data-slot="dialog-content"]');
      if (!(dialog instanceof HTMLElement)) return false;

      const style = getComputedStyle(dialog);
      const styled =
        style.position === "fixed" &&
        style.borderTopLeftRadius !== "0px" &&
        style.maxWidth !== "none";

      const compiling = [...document.querySelectorAll("nextjs-portal")].some(
        (portal) => portal.shadowRoot?.textContent?.includes("Compiling"),
      );
      return styled && !compiling;
    });

  // A development compilation can briefly restore the old styled tree before
  // applying a hot update. Two consecutive checks keep screenshots out of that
  // transition without adding a production-only delay.
  await waitForReadyState();
  await page.waitForTimeout(300);
  await waitForReadyState();
}

async function scrollFooterIntoView(dialog) {
  const viewport = dialog.locator('[data-slot="scroll-area-viewport"]').first();
  const saveButton = dialog.getByRole("button", {
    name: "Save relationship",
    exact: true,
  });

  await viewport.evaluate((element) => {
    element.scrollTo({ top: element.scrollHeight, behavior: "instant" });
  });
  await saveButton.scrollIntoViewIfNeeded();

  const scrollState = await viewport.evaluate((element) => ({
    scrollTop: element.scrollTop,
    maxScrollTop: element.scrollHeight - element.clientHeight,
  }));
  assert(
    scrollState.maxScrollTop === 0 ||
      Math.abs(scrollState.maxScrollTop - scrollState.scrollTop) <= 2,
    `relationship footer could not be reached: ${JSON.stringify(scrollState)}`,
  );

  const [saveBox, viewportBox, dialogBox] = await Promise.all([
    saveButton.boundingBox(),
    viewport.boundingBox(),
    dialog.boundingBox(),
  ]);
  assert(saveBox && viewportBox && dialogBox, "relationship footer has no layout box");
  assert(
    saveBox.y >= viewportBox.y - 1 &&
      saveBox.y + saveBox.height <= viewportBox.y + viewportBox.height + 1,
    "Save relationship button is not visible inside the modal scroll viewport",
  );
  assert(
    saveBox.x >= dialogBox.x - 1 &&
      saveBox.x + saveBox.width <= dialogBox.x + dialogBox.width + 1,
    "Save relationship button extends outside the modal",
  );

  return scrollState;
}

async function verifyViewport(context, viewport) {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const mockState = await installMocks(page);

  try {
    await page.goto(`${baseUrl}/en/relationship?tab=relationship`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const addManually = page.getByRole("button", {
      name: "Add Manually",
      exact: true,
    });
    await addManually.waitFor({ state: "visible" });
    await addManually.click();

    const formDialog = page.getByRole("dialog");
    await formDialog.getByRole("heading", { name: "New relationship" }).waitFor();
    await waitForStyledDialog(page);

    const favoriteButton = formDialog.locator("#rel-favorite");
    const roleModelButton = formDialog.locator("#rel-add-role-model");
    await favoriteButton.getByText("Favourite", { exact: true }).waitFor();
    await roleModelButton.getByText("Add to Role Model", { exact: true }).waitFor();
    assert.equal(await favoriteButton.getAttribute("aria-pressed"), "false");
    assert.equal(await roleModelButton.getAttribute("aria-pressed"), "false");

    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-form-actions.png`),
    });

    await formDialog.locator("#rel-name").fill("Grace Hopper");
    await favoriteButton.click();
    await roleModelButton.click();
    assert.equal(await favoriteButton.getAttribute("aria-pressed"), "true");
    assert.equal(await roleModelButton.getAttribute("aria-pressed"), "true");

    const addSocial = formDialog.getByRole("button", {
      name: "Add social",
      exact: true,
    });
    await addSocial.scrollIntoViewIfNeeded();
    await addSocial.click();
    const socialPlatform = formDialog.getByRole("combobox", {
      name: "Socials 1",
      exact: true,
    });
    const socialUrl = formDialog.locator("#rel-social-url-0");
    await socialPlatform.waitFor({ state: "visible" });
    await socialUrl.waitFor({ state: "visible" });
    assert.match(
      (await socialPlatform.textContent()) ?? "",
      /linkedin/i,
      "new social row did not default to LinkedIn",
    );
    await socialUrl.fill("https://www.linkedin.com/in/grace-hopper");
    await waitForStyledDialog(page);

    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-form-socials.png`),
    });

    const optionChecks = [
      [linkedOptions.project.title, "project"],
      [linkedOptions.goal.title, "goal"],
      [linkedOptions.note.title, "note"],
      [linkedOptions.idea.title, "idea"],
    ];
    for (const [title, kind] of optionChecks) {
      const checkbox = formDialog.getByRole("checkbox", { name: title, exact: true });
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.waitFor({ state: "visible" });
      await assertChecked(checkbox, kind);
    }
    await waitForStyledDialog(page);

    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-form-linked-items.png`),
    });

    const formOverflow = await assertNoHorizontalOverflow(
      page,
      formDialog,
      `${viewport.name} relationship form`,
    );
    const footerScroll = await scrollFooterIntoView(formDialog);
    await waitForStyledDialog(page);
    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-form-footer.png`),
    });

    await formDialog.getByRole("button", { name: "Close", exact: true }).click();
    await formDialog.waitFor({ state: "hidden" });

    const relationshipCard = page.getByRole("button", {
      name: "Ada Lovelace",
      exact: true,
    });
    await relationshipCard.waitFor({ state: "visible" });
    const cardSurface = relationshipCard.locator(
      "xpath=ancestor::*[@data-slot='card'][1]",
    );
    const phoneLink = cardSurface.getByRole("link", {
      name: "Phone: +1 317 555 0148",
      exact: true,
    });
    const emailLink = cardSurface.getByRole("link", {
      name: "Email: ada@example.com",
      exact: true,
    });
    const websiteLink = cardSurface.getByRole("link", {
      name: "Website: Ada Lovelace",
      exact: true,
    });
    await Promise.all([
      phoneLink.waitFor({ state: "visible" }),
      emailLink.waitFor({ state: "visible" }),
      websiteLink.waitFor({ state: "visible" }),
    ]);
    assert.equal(await phoneLink.getAttribute("href"), "tel:+1 317 555 0148");
    assert.equal(await emailLink.getAttribute("href"), "mailto:ada@example.com");
    assert.equal(await websiteLink.getAttribute("target"), "_blank");
    const cardOverflow = await cardSurface.evaluate((element) => ({
      horizontal: element.scrollWidth - element.clientWidth,
      vertical: element.scrollHeight - element.clientHeight,
    }));
    assert(
      cardOverflow.horizontal <= 1,
      `${viewport.name} People card horizontal overflow: ${JSON.stringify(cardOverflow)}`,
    );
    await cardSurface.screenshot({
      path: path.join(outputDir, `${viewport.name}-people-card.png`),
    });

    const cardFavorite = cardSurface.getByRole("button", {
      name: "Add Ada Lovelace to favorites",
      exact: true,
    });
    await cardFavorite.click();
    await page.getByRole("button", {
      name: "Remove Ada Lovelace from favorites",
      exact: true,
    }).waitFor({ state: "visible" });
    assert.equal(
      await page.getByRole("dialog").count(),
      0,
      "card favorite action unexpectedly opened the detail dialog",
    );

    await relationshipCard.focus();
    await relationshipCard.press("Enter");

    const detailDialog = page.getByRole("dialog");
    await detailDialog
      .locator("h2.truncate", { hasText: "Ada Lovelace" })
      .waitFor({ state: "visible" });
    await waitForStyledDialog(page);
    const closeButton = detailDialog.getByRole("button", {
      name: "Close",
      exact: true,
    });
    const deleteButton = detailDialog.getByRole("button", {
      name: "Delete",
      exact: true,
    });
    const [closeBox, deleteBox] = await Promise.all([
      closeButton.boundingBox(),
      deleteButton.boundingBox(),
    ]);
    assert(closeBox && deleteBox, "detail Close/Delete controls have no layout box");
    assert(
      !overlaps(closeBox, deleteBox),
      `${viewport.name} detail Close/Delete controls overlap: ${JSON.stringify({
        closeBox,
        deleteBox,
      })}`,
    );

    const detailOverflow = await assertNoHorizontalOverflow(
      page,
      detailDialog,
      `${viewport.name} relationship detail`,
    );
    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-detail-header.png`),
    });

    assert.equal(
      pageErrors.length,
      0,
      `${viewport.name} page errors: ${pageErrors.join(" | ")}`,
    );

    return {
      viewport: `${viewport.width}x${viewport.height}`,
      controls: {
        favorite: true,
        addToRoleModel: true,
        socialRowAdded: true,
        cardPhoneLink: true,
        cardEmailLink: true,
        cardSocialLink: true,
        cardFavoriteIndependent: true,
      },
      cardOverflow,
      linkedCheckboxes: optionChecks.map(([title]) => title),
      footerScroll,
      formOverflow,
      detailOverflow,
      closeDeleteOverlap: false,
      mockedTables: mockState.touchedTables,
      consoleErrors,
      pageErrors,
    };
  } catch (error) {
    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-failure.png`),
      fullPage: true,
    });
    throw error;
  } finally {
    await page.close();
  }
}

await mkdir(outputDir, { recursive: true });

const launchOptions = { headless: true };
if (existsSync(configuredBrowser)) launchOptions.executablePath = configuredBrowser;

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: { width: viewports[0].width, height: viewports[0].height },
  locale: "en-US",
  colorScheme: "light",
  reducedMotion: "reduce",
});
await context.addCookies([
  {
    name: "mylifeos_dev_bypass",
    value: "1",
    url: new URL(baseUrl).origin,
  },
]);
const results = [];

try {
  for (const viewport of viewports) {
    results.push(await verifyViewport(context, viewport));
  }

  const receipt = {
    state: "mocked-browser-validation",
    passed: true,
    route: "/en/relationship?tab=relationship",
    viewportChecks: viewports.map(({ width, height }) => `${width}x${height}`),
    assertions: {
      favoriteControl: true,
      addToRoleModelControl: true,
      socialRowCanBeAdded: true,
      linkedProjectGoalNoteIdeaOptions: true,
      cardContactActions: true,
      cardFavoriteIndependent: true,
      cardKeyboardOpen: true,
      horizontalOverflow: false,
      footerReachable: true,
      detailCloseDeleteOverlap: false,
    },
    results,
  };
  await writeFile(
    path.join(outputDir, receiptName),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  const failureReceipt = {
    state: "mocked-browser-validation",
    passed: false,
    route: "/en/relationship?tab=relationship",
    completedViewports: results.map((result) => result.viewport),
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  };
  await writeFile(
    path.join(outputDir, receiptName),
    `${JSON.stringify(failureReceipt, null, 2)}\n`,
  );
  throw error;
} finally {
  await context.close();
  await browser.close();
}
