import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const baseUrl =
  process.env.TASK_MODAL_VERIFY_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.join(appRoot, "test-results/task-modal-links");
const configuredBrowser =
  process.env.TASK_MODAL_VERIFY_BROWSER ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "10000000-0000-4000-8000-000000000001";
const GOAL_ID = "20000000-0000-4000-8000-000000000001";
const NOTE_ID = "30000000-0000-4000-8000-000000000001";
const IDEA_ID = "40000000-0000-4000-8000-000000000001";
const PAPER_ID = "50000000-0000-4000-8000-000000000001";
const KNOWLEDGE_ID = "60000000-0000-4000-8000-000000000001";
const RELATION_ID = "70000000-0000-4000-8000-000000000001";
const FIXED_TIME = "2026-09-03T12:00:00.000Z";

const TASK_TITLE = "Prepare the complete research briefing";
const REAL_TAGS = [
  "planning",
  "creative",
  "deep-work",
  "client-prep",
  "research",
  "follow-through",
];
const entityNames = {
  goal: "Complete the autumn research milestone",
  note: "Research interview notes",
  idea: "Turn the findings into a visual story",
  paper: "Deliberate Practice and Expert Performance",
  knowledge: "Research synthesis playbook",
};
const rawReferenceIds = [NOTE_ID, IDEA_ID, PAPER_ID, KNOWLEDGE_ID];

const viewportCatalog = [
  { name: "mobile", width: 390, height: 844, expectedColumns: 1 },
  { name: "tablet", width: 768, height: 1024, expectedColumns: 1 },
  { name: "desktop", width: 1180, height: 820, expectedColumns: 2 },
];
const requestedViewport = process.env.TASK_MODAL_VERIFY_VIEWPORT;
const viewports = requestedViewport
  ? viewportCatalog.filter(({ name }) => name === requestedViewport)
  : viewportCatalog;
assert(
  viewports.length > 0,
  `Unknown TASK_MODAL_VERIFY_VIEWPORT: ${requestedViewport}`,
);
const receiptName = requestedViewport
  ? `receipt-${requestedViewport}.json`
  : "receipt.json";

function taskSeed() {
  return {
    id: TASK_ID,
    user_id: USER_ID,
    project_id: null,
    title: TASK_TITLE,
    description: [
      "Create a concise briefing with evidence, decisions, and next actions.",
      `Related notes: ${NOTE_ID}`,
      `Related ideas: ${IDEA_ID}`,
      `Related knowledge: ${PAPER_ID}, ${KNOWLEDGE_ID}`,
    ].join("\n\n"),
    status: "in-progress",
    priority: "high",
    due_date: "2026-09-12",
    completed_at: null,
    estimated_blocks: 6,
    tags: [
      ...REAL_TAGS,
      `note:${NOTE_ID}`,
      `idea:${IDEA_ID}`,
      `knowledge:${PAPER_ID}`,
      `knowledge:${KNOWLEDGE_ID}`,
    ],
    source: "verification fixture",
    source_url: null,
    reminder_date: "2026-09-10T14:00:00.000Z",
    category: "deep-work",
    ai_generated: true,
    ai_metadata: null,
    sort_order: 1,
    scheduled_date: null,
    calendar_event_id: null,
    calendar_provider: null,
    created_at: FIXED_TIME,
    updated_at: FIXED_TIME,
    project: null,
  };
}

function seedTables() {
  return new Map([
    ["tasks", [taskSeed()]],
    ["projects", []],
    [
      "goals",
      [
        {
          id: GOAL_ID,
          user_id: USER_ID,
          name: entityNames.goal,
          description: null,
          status: "active",
          target_date: "2026-10-01",
          category: "learning",
          created_at: FIXED_TIME,
          updated_at: FIXED_TIME,
        },
      ],
    ],
    [
      "notes",
      [
        {
          id: NOTE_ID,
          user_id: USER_ID,
          project_id: null,
          title: entityNames.note,
          content: "Interview evidence and follow-up questions.",
          category: "research",
          tags: [],
          is_favorite: false,
          status: "active",
          note_type: "note",
          created_at: FIXED_TIME,
          updated_at: FIXED_TIME,
          project: null,
        },
      ],
    ],
    [
      "ideas",
      [
        {
          id: IDEA_ID,
          user_id: USER_ID,
          content: "Use a visual narrative to make the findings memorable.",
          source_type: "text",
          capture_kind: "idea",
          voice_transcript: null,
          linked_project_ids: [],
          linked_task_ids: [],
          linked_goal_ids: [],
          linked_idea_ids: [],
          status: "captured",
          category: "creative",
          title: entityNames.idea,
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
    [
      "knowledge_items",
      [
        {
          id: PAPER_ID,
          user_id: USER_ID,
          title: entityNames.paper,
          status: "active",
          content_type: "paper",
          date_added: FIXED_TIME,
        },
        {
          id: KNOWLEDGE_ID,
          user_id: USER_ID,
          title: entityNames.knowledge,
          status: "active",
          content_type: "article",
          date_added: FIXED_TIME,
        },
      ],
    ],
    [
      "brain_relations",
      [
        {
          id: RELATION_ID,
          user_id: USER_ID,
          source_id: GOAL_ID,
          source_type: "goal",
          target_id: TASK_ID,
          target_type: "task",
          relation_type: "goal_task",
          status: "confirmed",
          weight: null,
          is_manual: true,
          is_ai_suggested: false,
          reason: null,
          metadata: null,
          created_at: FIXED_TIME,
          updated_at: FIXED_TIME,
        },
      ],
    ],
    ["daily_plans", []],
    ["habit_links", []],
    ["task_subtasks", []],
  ]);
}

function postgrestTableName(url) {
  const marker = "/rest/v1/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return "";
  return decodeURIComponent(
    url.pathname.slice(markerIndex + marker.length).split("/")[0] ?? "",
  );
}

function matchesPostgrestFilters(row, url) {
  for (const [key, value] of url.searchParams.entries()) {
    if (value.startsWith("eq.") && String(row[key]) !== value.slice(3)) {
      return false;
    }
  }
  return true;
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

/** Install an isolated PostgREST double. No browser request can reach live data. */
async function installMocks(page) {
  const tables = seedTables();
  const touchedTables = new Set();
  const methods = new Map();
  let writeRequests = 0;

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const tableName = postgrestTableName(url);
    if (tableName) touchedTables.add(tableName);
    methods.set(method, (methods.get(method) ?? 0) + 1);

    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods":
            "GET, HEAD, POST, PATCH, DELETE, OPTIONS",
          "access-control-allow-headers":
            "authorization, apikey, content-type, prefer, x-client-info",
        },
        body: "",
      });
      return;
    }

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

    // Writes are mocked too, but this verifier deliberately never triggers one.
    writeRequests += 1;
    await fulfillJson(route, responseBodyFor(request, []), []);
  });

  return {
    get touchedTables() {
      return [...touchedTables].sort();
    },
    get requestMethods() {
      return Object.fromEntries(
        [...methods].sort(([a], [b]) => a.localeCompare(b)),
      );
    },
    get writeRequests() {
      return writeRequests;
    },
  };
}

async function waitForPageReady(page) {
  await page.getByRole("heading", { name: "Tasks", exact: true }).waitFor();
  await page.waitForFunction(() => {
    const compiling = [...document.querySelectorAll("nextjs-portal")].some(
      (portal) => portal.shadowRoot?.textContent?.includes("Compiling"),
    );
    return !compiling;
  });
}

async function waitForStyledDialog(page) {
  const waitForReadyState = () =>
    page.waitForFunction(() => {
      const dialog = document.querySelector('[data-slot="dialog-content"]');
      const viewport = dialog?.querySelector(
        '[data-slot="scroll-area-viewport"]',
      );
      if (
        !(dialog instanceof HTMLElement) ||
        !(viewport instanceof HTMLElement)
      ) {
        return false;
      }
      const style = getComputedStyle(dialog);
      const compiling = [...document.querySelectorAll("nextjs-portal")].some(
        (portal) => portal.shadowRoot?.textContent?.includes("Compiling"),
      );
      return (
        style.position === "fixed" && style.display === "flex" && !compiling
      );
    });

  await waitForReadyState();
  await page.waitForTimeout(250);
  await waitForReadyState();
}

async function assertPrecedes(first, second, label) {
  const [firstHandle, secondHandle] = await Promise.all([
    first.elementHandle(),
    second.elementHandle(),
  ]);
  assert(firstHandle && secondHandle, `${label} elements are missing`);
  const precedes = await firstHandle.evaluate(
    (element, other) =>
      Boolean(
        element.compareDocumentPosition(other) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    secondHandle,
  );
  assert(precedes, label);
}

async function verifyHeaderAndCard(page, viewportName) {
  const header = page.locator('[data-slot="os-page-header"]');
  const switcher = header.getByRole("tablist", { name: "Tasks view" });
  const insights = header.getByRole("button", {
    name: "Insights",
    exact: true,
  });
  await Promise.all([
    switcher.waitFor({ state: "visible" }),
    insights.waitFor({ state: "visible" }),
  ]);

  const tabNames = await switcher
    .getByRole("tab")
    .evaluateAll((tabs) => tabs.map((tab) => tab.getAttribute("aria-label")));
  assert.deepEqual(tabNames, ["List", "Grid", "Table", "Board"]);
  await assertPrecedes(
    switcher,
    insights,
    `${viewportName} view switcher does not precede Insights`,
  );

  const searchInput = page.getByPlaceholder("Search title, project, tags…");
  await searchInput.waitFor({ state: "visible" });
  const filterBar = searchInput.locator("xpath=../..");
  assert.equal(
    await filterBar.locator('[role="tablist"]').count(),
    0,
    `${viewportName} filter bar still contains a view switcher`,
  );

  const title = page.getByRole("heading", { name: TASK_TITLE, exact: true });
  await title.waitFor({ state: "visible" });
  const card = title.locator("xpath=ancestor::*[@role='button'][1]");
  const cardText = await card.innerText();
  for (const tag of REAL_TAGS) {
    assert(
      cardText.includes(`#${tag}`),
      `${viewportName} task card omitted real tag ${tag}`,
    );
  }
  for (const id of rawReferenceIds) {
    assert(
      !cardText.includes(id),
      `${viewportName} task card exposed relationship UUID ${id}`,
    );
  }

  return { header, switcher, insights, filterBar, card, cardText, tabNames };
}

async function inspectModalLayout(dialog, expectedColumns, viewportName) {
  const header = dialog.locator('[data-slot="dialog-header"]');
  const footer = dialog.locator('[data-slot="dialog-footer"]');
  const scrollViewport = dialog.locator('[data-slot="scroll-area-viewport"]');
  const bodyGrid = scrollViewport.locator("div.grid.min-w-0").first();
  const columns = bodyGrid.locator(":scope > div");

  const [
    dialogBox,
    headerBox,
    footerBox,
    viewportBox,
    firstColumnBox,
    secondColumnBox,
  ] = await Promise.all([
    dialog.boundingBox(),
    header.boundingBox(),
    footer.boundingBox(),
    scrollViewport.boundingBox(),
    columns.nth(0).boundingBox(),
    columns.nth(1).boundingBox(),
  ]);
  assert(
    dialogBox &&
      headerBox &&
      footerBox &&
      viewportBox &&
      firstColumnBox &&
      secondColumnBox,
    `${viewportName} modal layout boxes are incomplete`,
  );

  const styles = await dialog.evaluate((element) => {
    const headerElement = element.querySelector('[data-slot="dialog-header"]');
    const footerElement = element.querySelector('[data-slot="dialog-footer"]');
    const viewportElement = element.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    const bodyElement = viewportElement?.querySelector("div.grid.min-w-0");
    assertDomElement(headerElement, "header");
    assertDomElement(footerElement, "footer");
    assertDomElement(viewportElement, "scroll viewport");
    assertDomElement(bodyElement, "body grid");
    const dialogStyle = getComputedStyle(element);
    const viewportStyle = getComputedStyle(viewportElement);
    const gridStyle = getComputedStyle(bodyElement);
    return {
      dialogPosition: dialogStyle.position,
      dialogOverflow: dialogStyle.overflow,
      headerFlexShrink: getComputedStyle(headerElement).flexShrink,
      footerFlexShrink: getComputedStyle(footerElement).flexShrink,
      viewportOverflowY: viewportStyle.overflowY,
      scrollTop: viewportElement.scrollTop,
      scrollHeight: viewportElement.scrollHeight,
      clientHeight: viewportElement.clientHeight,
      gridTemplateColumns: gridStyle.gridTemplateColumns,
    };

    function assertDomElement(value, label) {
      if (!(value instanceof HTMLElement)) throw new Error(`Missing ${label}`);
    }
  });

  assert.equal(styles.dialogPosition, "fixed");
  assert.equal(styles.dialogOverflow, "hidden");
  assert.equal(styles.headerFlexShrink, "0");
  assert.equal(styles.footerFlexShrink, "0");
  assert(
    styles.viewportOverflowY === "auto" ||
      styles.viewportOverflowY === "scroll",
    `${viewportName} modal body is not an internal scroll viewport: ${styles.viewportOverflowY}`,
  );
  assert(
    headerBox.y >= dialogBox.y - 1 &&
      headerBox.y + headerBox.height <= viewportBox.y + 1,
    `${viewportName} modal header is not fixed above the body viewport`,
  );
  assert(
    footerBox.y >= viewportBox.y + viewportBox.height - 1 &&
      footerBox.y + footerBox.height <= dialogBox.y + dialogBox.height + 1,
    `${viewportName} modal footer is not fixed below the body viewport: ${JSON.stringify({ dialogBox, viewportBox, footerBox })}`,
  );

  const isTwoColumn =
    Math.abs(firstColumnBox.y - secondColumnBox.y) <= 2 &&
    secondColumnBox.x > firstColumnBox.x + 2;
  assert.equal(
    isTwoColumn ? 2 : 1,
    expectedColumns,
    `${viewportName} modal body has the wrong responsive column layout`,
  );

  return {
    header,
    footer,
    scrollViewport,
    bodyGrid,
    dialogBox,
    headerBox,
    footerBox,
    viewportBox,
    styles,
    columnCount: isTwoColumn ? 2 : 1,
  };
}

async function verifyNamedConnections(page, dialog, viewportName) {
  const expected = [
    ["paper", entityNames.paper],
    ["idea", entityNames.idea],
    ["knowledge", entityNames.knowledge],
    ["note", entityNames.note],
  ];

  for (const [kind, title] of expected) {
    const group = dialog.locator(`[data-task-connection="${kind}"]`);
    await group.waitFor({ state: "attached" });
    await group
      .getByText(title, { exact: true })
      .waitFor({ state: "attached" });
  }

  // Goal relations are intentionally optional in dev-bypass mode. Confirm the
  // human-readable goal fixture through the read-only picker when it is not a
  // rendered linked row.
  const goalGroup = dialog.locator('[data-task-connection="goal"]');
  let goalResolution = "linked-row";
  if (
    (await goalGroup.getByText(entityNames.goal, { exact: true }).count()) === 0
  ) {
    goalResolution = "picker-option";
    const picker = goalGroup.getByRole("combobox");
    await picker.evaluate((element) => element.click());
    await page
      .getByRole("option", { name: entityNames.goal, exact: true })
      .waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
  }

  const dialogText = await dialog.innerText();
  for (const id of rawReferenceIds) {
    assert(
      !dialogText.includes(id),
      `${viewportName} modal exposed relationship UUID ${id}`,
    );
  }
  assert(
    !dialogText.includes("Related notes:") &&
      !dialogText.includes("Related ideas:") &&
      !dialogText.includes("Related knowledge:"),
    `${viewportName} modal exposed legacy description metadata`,
  );

  return { expected, goalResolution, dialogText };
}

async function verifyViewport(context, viewport) {
  const page = await context.newPage();
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.addInitScript(() => {
    window.localStorage.setItem("tasks:viewMode", "list");
    window.localStorage.setItem(
      "mylifeos-app-store",
      JSON.stringify({ state: { language: "en", theme: "light" }, version: 0 }),
    );
  });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const mockState = await installMocks(page);

  try {
    await page.goto(`${baseUrl}/en/tasks`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForPageReady(page);

    const pageCheck = await verifyHeaderAndCard(page, viewport.name);
    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-tasks-page.png`),
      fullPage: true,
    });

    await pageCheck.card.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: TASK_TITLE }).waitFor();
    await waitForStyledDialog(page);
    const connections = await verifyNamedConnections(
      page,
      dialog,
      viewport.name,
    );
    const layout = await inspectModalLayout(
      dialog,
      viewport.expectedColumns,
      viewport.name,
    );

    await dialog.screenshot({
      path: path.join(outputDir, `${viewport.name}-task-modal-top.png`),
    });

    const initialHeaderY = layout.headerBox.y;
    const initialFooterY = layout.footerBox.y;
    const paperGroup = dialog.locator('[data-task-connection="paper"]');
    await paperGroup.scrollIntoViewIfNeeded();
    await dialog.screenshot({
      path: path.join(outputDir, `${viewport.name}-task-modal-links.png`),
    });

    const noteGroup = dialog.locator('[data-task-connection="note"]');
    await noteGroup.scrollIntoViewIfNeeded();
    const [scrolledHeaderBox, scrolledFooterBox, scrollState] =
      await Promise.all([
        layout.header.boundingBox(),
        layout.footer.boundingBox(),
        layout.scrollViewport.evaluate((element) => ({
          scrollTop: element.scrollTop,
          maxScrollTop: element.scrollHeight - element.clientHeight,
        })),
      ]);
    assert(
      scrolledHeaderBox && scrolledFooterBox,
      `${viewport.name} fixed modal controls disappeared while scrolling`,
    );
    assert(
      Math.abs(scrolledHeaderBox.y - initialHeaderY) <= 1,
      `${viewport.name} modal header moved with internal content`,
    );
    assert(
      Math.abs(scrolledFooterBox.y - initialFooterY) <= 1,
      `${viewport.name} modal footer moved with internal content`,
    );
    await dialog.screenshot({
      path: path.join(outputDir, `${viewport.name}-task-modal-notes.png`),
    });

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    assert(
      overflow.document <= 1 && overflow.body <= 1,
      `${viewport.name} task page has horizontal overflow: ${JSON.stringify(overflow)}`,
    );
    assert.equal(
      mockState.writeRequests,
      0,
      `${viewport.name} read-only verifier unexpectedly issued a write`,
    );
    assert.equal(
      pageErrors.length,
      0,
      `${viewport.name} page errors: ${pageErrors.join(" | ")}`,
    );

    return {
      viewport: `${viewport.width}x${viewport.height}`,
      expectedColumns: viewport.expectedColumns,
      actualColumns: layout.columnCount,
      header: {
        viewTabs: pageCheck.tabNames,
        precedesInsights: true,
        filterBarContainsViewTabs: false,
      },
      taskCard: {
        visibleTags: REAL_TAGS,
        rawReferenceIdsVisible: false,
      },
      modal: {
        fixedHeader: true,
        fixedFooter: true,
        internalScroll: true,
        scrollState,
        gridTemplateColumns: layout.styles.gridTemplateColumns,
        linkedNames: connections.expected.map(([, title]) => title),
        goalResolution: connections.goalResolution,
        rawReferenceIdsVisible: false,
        legacyDescriptionMetadataVisible: false,
      },
      overflow,
      mockedTables: mockState.touchedTables,
      requestMethods: mockState.requestMethods,
      mockWriteRequests: mockState.writeRequests,
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
if (existsSync(configuredBrowser))
  launchOptions.executablePath = configuredBrowser;

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
    route: "/en/tasks",
    fixture: {
      task: TASK_TITLE,
      realTags: REAL_TAGS,
      linkedNames: entityNames,
    },
    viewportChecks: viewports.map(({ width, height, expectedColumns }) => ({
      viewport: `${width}x${height}`,
      expectedColumns,
    })),
    assertions: {
      viewTabsInHeaderBeforeInsights: true,
      noViewTabsInFilterBar: true,
      allRealTagsVisibleOnListCard: true,
      rawMetadataHidden: true,
      modalResponsiveColumns: true,
      fixedHeaderAndFooter: true,
      internalModalScroll: true,
      humanReadableLinkedPaperIdeaKnowledgeNote: true,
      readOnlyInteractions: true,
    },
    screenshots: viewports.flatMap(({ name }) => [
      `${name}-tasks-page.png`,
      `${name}-task-modal-top.png`,
      `${name}-task-modal-links.png`,
      `${name}-task-modal-notes.png`,
    ]),
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
    route: "/en/tasks",
    completedViewports: results.map((result) => result.viewport),
    error:
      error instanceof Error ? (error.stack ?? error.message) : String(error),
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
