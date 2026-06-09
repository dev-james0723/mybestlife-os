#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const ICON_ROOT = path.join(APP_ROOT, "public/images/liquid-icons/pack-c");
const OUTPUT_PATH = path.join(
  APP_ROOT,
  "src/lib/liquid-icons/styled-icon-pack-components.tsx",
);
const METADATA_OUTPUT_PATH = path.join(
  APP_ROOT,
  "src/lib/liquid-icons/styled-icon-pack-metadata.ts",
);

const PACKS = [
  {
    id: "interface-blocks",
    packageName: "bootstrap",
    name: "Interface Blocks",
    description: "Compact app glyphs with practical dashboard energy.",
  },
  {
    id: "boxline-essentials",
    packageName: "boxicons-regular",
    name: "Boxline Essentials",
    description: "Rounded line symbols with friendly product-tool clarity.",
  },
  {
    id: "ledger-tokens",
    packageName: "crypto",
    name: "Ledger Tokens",
    description: "Abstract token marks for a sharper finance-native nav mood.",
  },
  {
    id: "nordic-symbols",
    packageName: "entypo",
    name: "Nordic Symbols",
    description: "Sturdy pictograms with compact geometric weight.",
  },
  {
    id: "orbit-outline",
    packageName: "evaicons-outline",
    name: "Orbit Outline",
    description: "Soft outline marks with calm mobile-app rhythm.",
  },
  {
    id: "leanline-mini",
    packageName: "evil",
    name: "Leanline Mini",
    description: "Minimal airy strokes for a quiet lightweight sidebar.",
  },
  {
    id: "featherdraft",
    packageName: "feather",
    name: "Featherdraft",
    description: "Fine open strokes with editorial tool precision.",
  },
  {
    id: "fluent-clarity",
    packageName: "fluentui-system-regular",
    name: "Fluent Clarity",
    description: "Systematic UI symbols with measured enterprise polish.",
  },
  {
    id: "awesome-solid",
    packageName: "fa-solid",
    name: "Awesome Solid",
    description: "Dense solid glyphs with classic web-app familiarity.",
  },
  {
    id: "foundation-stamps",
    packageName: "foundation",
    name: "Foundation Stamps",
    description: "Utility-first symbols with simple stamped silhouettes.",
  },
  {
    id: "hero-outline",
    packageName: "heroicons-outline",
    name: "Hero Outline",
    description: "Clean outline navigation marks with crisp SaaS discipline.",
  },
  {
    id: "mooncut-glyphs",
    packageName: "icomoon",
    name: "Mooncut Glyphs",
    description: "Icon-font style marks with compact classic geometry.",
  },
  {
    id: "ionic-outline",
    packageName: "ionicons-outline",
    name: "Ionic Outline",
    description: "Mobile-native outline symbols with rounded readability.",
  },
  {
    id: "material-core",
    packageName: "material",
    name: "Material Core",
    description: "Filled product symbols with clear spatial hierarchy.",
  },
  {
    id: "repo-octave",
    packageName: "octicons",
    name: "Repo Octave",
    description: "Developer-workflow marks with concise repository logic.",
  },
  {
    id: "open-signals",
    packageName: "open-iconic",
    name: "Open Signals",
    description: "Small direct glyphs with old-school interface economy.",
  },
  {
    id: "remix-linework",
    packageName: "remix-line",
    name: "Remix Linework",
    description: "Modern line icons with broad app-navigation coverage.",
  },
  {
    id: "brand-signals",
    packageName: "simple-icons",
    name: "Brand Signals",
    description: "Brand-shaped marks mapped to app meaning where possible.",
  },
  {
    id: "type-symbols",
    packageName: "typicons",
    name: "Type Symbols",
    description: "Typographic pictograms with compact UI personality.",
  },
  {
    id: "zonda-minimal",
    packageName: "zondicons",
    name: "Zonda Minimal",
    description: "Simple filled symbols with quiet modular structure.",
  },
];

const CANDIDATES_BY_ASSET = {
  "category-command-center": ["CommandPalette", "CommandLine", "KeyboardCommandKey", "KeyCommand", "Command", "Dashboard", "LayoutGrid", "Grid", "App", "MenuApp", "Home"],
  dashboard: ["Dashboard", "Speedometer2", "Tachometer", "TachometerAlt", "Home", "HomeAlt", "App", "GridView", "Grid", "Dash", "Googleanalytics"],
  brain: ["BrainCircuit", "Brain", "Jetbrains", "Psychology", "Lightbulb", "LightBulb", "Bulb", "Book", "BookOpen", "Intellijidea"],
  "life-agent": ["SupportAgent", "Powervirtualagents", "UserVoice", "Headset", "Assistant", "PersonCircle", "UserCircle", "User", "Person", "Robotframework", "Probot"],
  "daily-planner": ["CalendarToday", "CalendarTodo", "CalendarCheck", "CalendarEdit", "CalendarMonth", "Calendar", "Googlecalendar"],
  tasks: ["Tasklist", "ListTask", "ClipboardTaskListLtr", "ClipboardDocumentList", "Tasks", "Task", "TaskAlt", "ClipboardCheck", "CheckSquare", "Checklist", "Clipboard"],
  "weekly-review": ["CodeReview", "Codereview", "RateReview", "Reviews", "Preview", "CalendarWeek", "CalendarCheck", "CheckCircle", "History", "RefreshCw", "Star"],
  calendar: ["CalendarDays", "CalendarMonth", "CalendarToday", "Calendar", "Googlecalendar"],
  weather: ["TimeAndWeather", "WeatherSunny", "CloudSun", "Sun", "Cloud", "WeatherCloudy", "Openweathermap", "Star"],
  signals: ["DesktopSignal", "SignalWifi", "Signal", "Signal1", "SignalTower", "Appsignal", "Broadcast", "Circle"],
  analytics: ["Googleanalytics", "ChartBar", "BarChart", "BarChart2", "PieChart", "Chart", "Chartdotjs", "Apacheecharts", "Dashboard"],
  finance: ["Bitcoin", "Btc", "CurrencyDollar", "DollarSign", "AttachMoney", "Wallet", "Bank", "CreditCard", "Dai"],
  "category-self": ["Aboutdotme", "PersonCircle", "CircleUser", "UserCircle", "User", "Person", "Face", "Superuser"],
  "about-me": ["Aboutdotme", "PersonVcard", "IdCard", "FilePerson", "User", "Person", "CircleUser"],
  "grateful-things": ["HeartFill", "Heart", "HandHeart", "HandHoldingHeart", "Favorite", "Iheartradio", "Star"],
  "quote-library": ["Wikiquote", "FormatQuote", "TextQuote", "QuoteLeft", "Quote", "ChatQuote", "QuotesLeft", "DoubleQuoteSansLeft"],
  "bucket-list": ["Bucket", "ListCheck", "Target", "Flag", "Bitbucket"],
  health: ["Worldhealthorganization", "HeartPulse", "Activity", "HealthAndSafety", "Health", "Heart", "MedicalServices"],
  habits: ["Repeat", "RepeatOne", "RefreshCw", "History", "Sync", "Loop", "Checklist", "Task", "Star"],
  journal: ["Livejournal", "Journal", "BookJournalWhills", "Notebook", "BookOpen", "Book", "DocumentText"],
  "category-people": ["People", "Users", "UserGroup", "PeopleOutline", "Team", "Personio"],
  relationship: ["Heart", "UserHeart", "People", "Users", "Handshake", "Iheartradio"],
  "role-model": ["Award", "Trophy", "Medal", "Star", "PersonStar", "RankingStar", "Kickstarter"],
  "category-career": ["Briefcase", "BusinessCenter", "Work", "Suitcase", "Linkedin"],
  career: ["Briefcase", "BusinessCenter", "Work", "Suitcase", "Linkedin"],
  "career-compass": ["CompassNorthwest", "Compass", "Explore", "Navigation"],
  "career-profile": ["IdCard", "UserTie", "PersonVcard", "User", "Person", "Linkedin"],
  "career-vault": ["Vault", "Archive", "Lock", "Safe", "Box", "Nexo"],
  "career-coach": ["ChalkboardUser", "PersonChalkboard", "SupportAgent", "Headset", "UserVoice", "Powervirtualagents"],
  "career-pipeline": ["Azurepipelines", "Pipeline", "GitBranch", "Flowchart", "Timeline", "ChartGantt"],
  "career-timeline": ["Timeline", "History", "Clock", "Calendar"],
  "career-network": ["NetworkWired", "GitNetwork", "Network", "Share2", "People", "Linkedin"],
  "career-journal": ["Livejournal", "Journal", "Book", "Clipboard", "DocumentText"],
  "career-analytics": ["ChartBar", "BarChart", "ChartLine", "LineChart", "Googleanalytics"],
  "category-goals-execution": ["RocketLaunch", "RocketTakeoff", "Rocket", "Target", "Goal", "Flag", "Apacherocketmq"],
  goals: ["Goal", "Target", "Flag", "Bullseye", "CheckCircle"],
  projects: ["Project", "DiagramProject", "Codeproject", "FolderKanban", "Folder", "Archive"],
  "category-resources": ["Archive", "Folder", "Box", "Themodelsresource", "Collection"],
  assets: ["WebAsset", "Box", "Archive", "Cube", "Brandfolder", "Cassette"],
  documents: ["DocumentText", "Document", "FileText", "FileEarmarkText", "ClipboardDocument", "Googledocs"],
  "software-vault": ["Vault", "Code", "Terminal", "LaptopCode", "Jirasoftware", "Github"],
  "category-knowledge": ["Knowledgebase", "BookOpen", "Book", "LibraryBooks", "Bookstack", "Gitbook"],
  "knowledge-base": ["Knowledgebase", "BookOpen", "Book", "Bookstack", "Gitbook", "Dat"],
  "ai-knowledge": ["Jetbrains", "BrainCircuit", "Robotframework", "Cpu", "Psychology", "Data", "Databricks"],
  "mind-council": ["People", "Users", "UserGroup", "BrainCircuit", "Personio"],
  ideas: ["Intellijidea", "DesignIdeas", "Lightbulb", "LightBulb", "Bulb", "Star"],
  "category-learning": ["LearningApp", "School", "AcademicCap", "BookOpen", "Book", "Duolingo"],
  "japanese-study": ["Googletranslate", "Language", "Translate", "School", "Book", "Duolingo"],
  garden: ["Leaf", "Plant", "Sprout", "EnergySavingsLeaf", "Leaflet"],
  "settings-reserved": ["Settings", "Settings2", "Gear", "Cog", "DisplaySettings"],
};

const CRYPTO_BY_ASSET = {
  "category-command-center": "Dash",
  dashboard: "Ada",
  brain: "Data",
  "life-agent": "Chat",
  "daily-planner": "Atom",
  tasks: "Dot",
  "weekly-review": "Start",
  calendar: "Btc",
  weather: "Gold",
  signals: "Generic",
  analytics: "Grt",
  finance: "Dai",
  "category-self": "Generic",
  "about-me": "Abt",
  "grateful-things": "Hot",
  "quote-library": "Poe",
  "bucket-list": "Btc",
  health: "Dent",
  habits: "Loopring",
  journal: "Ink",
  "category-people": "Link",
  relationship: "Vibe",
  "role-model": "Star",
  "category-career": "Bnb",
  career: "Rise",
  "career-compass": "Compass",
  "career-profile": "Idex",
  "career-vault": "Safe",
  "career-coach": "Chat",
  "career-pipeline": "Flow",
  "career-timeline": "Theta",
  "career-network": "Link",
  "career-journal": "Ink",
  "career-analytics": "Grt",
  "category-goals-execution": "Rocket",
  goals: "Start",
  projects: "Block",
  "category-resources": "Dock",
  assets: "Storj",
  documents: "Html",
  "software-vault": "Dat",
  "category-knowledge": "Data",
  "knowledge-base": "Dat",
  "ai-knowledge": "Atom",
  "mind-council": "Gno",
  ideas: "Poe",
  "category-learning": "Zen",
  "japanese-study": "Ion",
  garden: "Green",
  "settings-reserved": "Sys",
};

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pascal(value) {
  return value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function expandCandidates(candidate) {
  return [
    candidate,
    `${candidate}Outline`,
    `${candidate}Regular`,
    `${candidate}Line`,
    `${candidate}Alt`,
    `${candidate}2`,
    `${candidate}Fill`,
    `${candidate}Filled`,
    `${candidate}Solid`,
  ];
}

async function readExportNames(packageName) {
  const declarationPath = path.join(
    APP_ROOT,
    "node_modules/@styled-icons",
    packageName,
    "index.d.ts",
  );
  const declaration = await fs.readFile(declarationPath, "utf8");
  return [...declaration.matchAll(/export \{ ([A-Za-z0-9_]+) \}/g)]
    .map((match) => match[1])
    .filter((name) => !name.endsWith("Dimensions"));
}

function scoreCandidateIconName({ assetId, iconName, semanticCandidates }) {
  const normalizedIconName = normalize(iconName);
  const assetTokens = assetId.split(/[^a-z0-9]+/i).filter((token) => token.length > 2);
  let score = 0;

  for (const candidate of semanticCandidates) {
    const normalizedCandidate = normalize(candidate);
    if (normalizedCandidate.length < 3) continue;
    if (normalizedIconName === normalizedCandidate) {
      score += 1000;
    } else if (
      normalizedIconName.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedIconName)
    ) {
      score += 200 + Math.min(normalizedIconName.length, normalizedCandidate.length);
    }
  }

  for (const token of assetTokens) {
    if (normalizedIconName.includes(token)) score += 20 + token.length;
  }

  return score;
}

function chooseIconName({ packageName, assetId, exportNames, usedIcons }) {
  const byNormalizedName = new Map(exportNames.map((name) => [normalize(name), name]));
  const semanticCandidates = [
    packageName === "crypto" ? CRYPTO_BY_ASSET[assetId] : undefined,
    ...(CANDIDATES_BY_ASSET[assetId] ?? []),
  ].filter(Boolean);
  const sourceCandidates = [
    ...semanticCandidates,
    "Circle",
    "Star",
    "Home",
    "Generic",
    exportNames[0],
  ].filter(Boolean);

  for (const sourceCandidate of sourceCandidates) {
    for (const candidate of expandCandidates(sourceCandidate)) {
      const match = byNormalizedName.get(normalize(candidate));
      if (match && !usedIcons.has(match)) return match;
    }
  }

  const fuzzyMatch = exportNames
    .filter((name) => !usedIcons.has(name))
    .map((name) => ({
      name,
      score: scoreCandidateIconName({
        assetId,
        iconName: name,
        semanticCandidates,
      }),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (fuzzyMatch?.score > 0) return fuzzyMatch.name;

  const unusedIcon = exportNames.find((name) => !usedIcons.has(name));
  if (unusedIcon) return unusedIcon;

  for (const sourceCandidate of sourceCandidates) {
    for (const candidate of expandCandidates(sourceCandidate)) {
      const match = byNormalizedName.get(normalize(candidate));
      if (match) return match;
    }
  }

  return exportNames[0];
}

function buildNamedImport({ packageName, importEntries }) {
  return [...importEntries]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([exportName, alias]) =>
        `import { ${exportName} as ${alias} } from "@styled-icons/${packageName}/${exportName}";`,
    )
    .join("\n");
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(ICON_ROOT, "manifest.json"), "utf8"));
  const targets = manifest.targets;
  const imports = [];
  const packMappings = {};
  const summary = [];

  for (const pack of PACKS) {
    const exportNames = await readExportNames(pack.packageName);
    const importEntries = new Map();
    const mapping = {};
    const usedIcons = new Set();

    for (const target of targets) {
      const iconName = chooseIconName({
        packageName: pack.packageName,
        assetId: target.assetId,
        exportNames,
        usedIcons,
      });
      usedIcons.add(iconName);
      const alias = `${pascal(pack.id)}${iconName}`;
      importEntries.set(iconName, alias);
      mapping[target.assetId] = alias;
    }

    imports.push(buildNamedImport({ packageName: pack.packageName, importEntries }));
    packMappings[pack.id] = mapping;
    summary.push({
      id: pack.id,
      packageName: pack.packageName,
      uniqueIcons: importEntries.size,
    });
  }

  const typeUnion = PACKS.map((pack) => `  | ${JSON.stringify(pack.id)}`).join("\n");
  const metadata = PACKS.map((pack) => `  ${JSON.stringify(pack, null, 2).replace(/\n/g, "\n  ")},`).join("\n");
  const componentMapping = PACKS.map((pack) => {
    const entries = Object.entries(packMappings[pack.id])
      .map(([assetId, alias]) => `    ${JSON.stringify(assetId)}: ${alias},`)
      .join("\n");
    return `  ${JSON.stringify(pack.id)}: {\n${entries}\n  },`;
  }).join("\n");

  const metadataOutput = `export type StyledLibraryIconPackId =\n${typeUnion};\n\nexport type StyledLibraryIconPackMeta = {\n  id: StyledLibraryIconPackId;\n  packageName: string;\n  name: string;\n  description: string;\n};\n\nexport const STYLED_LIBRARY_ICON_PACKS: StyledLibraryIconPackMeta[] = [\n${metadata}\n];\n`;

  const output = `import type { StyledIcon } from "@styled-icons/styled-icon";\nimport type { StyledLibraryIconPackId } from "@/lib/liquid-icons/styled-icon-pack-metadata";\n${imports.join("\n")}\n\nexport const STYLED_LIBRARY_ICON_COMPONENTS: Record<StyledLibraryIconPackId, Record<string, StyledIcon>> = {\n${componentMapping}\n};\n\nexport function getStyledIconPackAssetComponent(\n  iconPack: StyledLibraryIconPackId,\n  assetId: string,\n): StyledIcon | undefined {\n  return STYLED_LIBRARY_ICON_COMPONENTS[iconPack]?.[assetId];\n}\n`;

  await fs.writeFile(METADATA_OUTPUT_PATH, metadataOutput);
  await fs.writeFile(OUTPUT_PATH, output);
  console.log(JSON.stringify({
    metadataOutputPath: METADATA_OUTPUT_PATH,
    outputPath: OUTPUT_PATH,
    packs: summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
