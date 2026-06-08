#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ICON_ROOT = path.join(ROOT, "public/images/liquid-icons/pack-c");
const PACK_ROOT = path.join(ICON_ROOT, "packs");
const REVIEW_ROOT = path.join(ICON_ROOT, "review");
const MANIFEST_PATH = path.join(ICON_ROOT, "manifest.json");

const ICON_SIZE = 512;
const VIEWBOX = 128;
const SAMPLE_ASSETS = [
  "category-command-center",
  "category-self",
  "category-people",
  "category-career",
  "category-goals-execution",
  "category-resources",
  "category-knowledge",
  "category-learning",
];

const DNA = [
  {
    id: "glacier-blue",
    name: "Glacier Blue",
    sourceTrends: ["Cool Blue"],
    concept: "A subzero interface language made of carved ice facets and crystalline ridges.",
    spirit: "Clear, calm, expensive, and cold enough to feel engineered.",
    shapeLanguage: "Angular shards, asymmetric facets, clipped corners, and narrow crystalline cuts.",
    materialTexture: "Frosted glass, blue ice, hairline cracks, and polished frozen edges.",
    iconConstruction: "Faceted relief glyphs with sharp joins, internal crack marks, and no rounded outline skeleton.",
    dayStrategy: "Medium arctic blue body, deep cyan cuts, and navy edge shadows so the icons stay readable on pale UI.",
    darkStrategy: "Bright icy cores, white-blue rim light, and cyan internal glow tuned for dark chrome panels.",
    shapeRules:
      "Use polygonal replacements for circles and rectangles; prefer triangular facets and diagonal cuts.",
    avoid: "Avoid soft bubbles, warm gold, decorative lace loops, or generic outline strokes.",
    colors: {
      day: ["#2F7891", "#7ECBE0", "#183A49", "#D9F7FF", "#4BA4BC"],
      dark: ["#BFF7FF", "#5FD7F3", "#EAFDFF", "#1E6E89", "#9BEAFE"],
    },
    renderer: "glacier",
  },
  {
    id: "opal-celestial",
    name: "Opal Celestial",
    sourceTrends: ["Extra Celestial"],
    concept: "Tiny pearlescent astronomical instruments, like moon charms for the operating system.",
    spirit: "Dreamy, quiet, cosmic, and gently ceremonial.",
    shapeLanguage: "Orbital arcs, crescents, star pinpoints, concentric halos, and floating symmetry.",
    materialTexture: "Opal dust, pearl enamel, moonlit lavender, and soft spectral edges.",
    iconConstruction: "Sigil-like pictograms built from orbits, beads, small filled stars, and luminous line fragments.",
    dayStrategy: "Dusty indigo-lavender strokes with opal highlights and restrained blue shadows on white UI.",
    darkStrategy: "Moon-white cores with lavender aura and star flashes that read on dark UI without becoming neon.",
    shapeRules:
      "Add at least one orbit, crescent, or star family marker; keep forms airy and celestial.",
    avoid: "Avoid square utility geometry, paper perforations, heavy stripes, and carved field marks.",
    colors: {
      day: ["#5963A0", "#8896D5", "#3E426B", "#D3CCFF", "#6F9FCC"],
      dark: ["#F3F1FF", "#C9C7FF", "#F5D8FF", "#9AB4FF", "#DDE7FF"],
    },
    renderer: "opal",
  },
  {
    id: "jelly-gummy",
    name: "Jelly Gummy",
    sourceTrends: ["Gimme Gummy"],
    concept: "Squishy translucent app charms with candy-gel volume and soft specular highlights.",
    spirit: "Playful, tactile, upbeat, and sweet without becoming childish.",
    shapeLanguage: "Inflated blobs, rounded tubes, pill corners, bubbles, and soft compression.",
    materialTexture: "Gummy candy, translucent gel, syrupy highlights, and tiny air bubbles.",
    iconConstruction: "Filled rounded mini-objects with thick gel bodies and white candy glints.",
    dayStrategy: "Saturated but shaded tangerine, pink, aqua, and berry tones with darker syrup edges.",
    darkStrategy: "Bright jelly cores, luminous candy rims, and stronger white glints for dark UI.",
    shapeRules:
      "All strokes become inflated tubes; sharp corners must be rounded or softened.",
    avoid: "Avoid thin outline logic, metallic brass, porcelain delicacy, or glitch fragmentation.",
    colors: {
      day: ["#D66B48", "#F59A56", "#CF4E8D", "#35A2A6", "#FFF2B8"],
      dark: ["#FFE975", "#FF8CCB", "#7AF7EF", "#FFB45B", "#FFFBE7"],
    },
    renderer: "jelly",
  },
  {
    id: "neo-deco-brass",
    name: "Neo Deco Brass",
    sourceTrends: ["Neo Deco"],
    concept: "A black-lacquer and brass system of stepped architectural marks.",
    spirit: "Glamorous, controlled, metropolitan, and hotel-lobby expensive.",
    shapeLanguage: "Stepped geometry, fan rays, symmetry, hard angles, inset bars, and squared caps.",
    materialTexture: "Brushed brass, black lacquer, smoked chrome, and engraved bevels.",
    iconConstruction: "Art-deco pictograms with stacked brass strokes and lacquer shadow planes.",
    dayStrategy: "Deep umber shadows and antique brass highlights so the gold does not disappear on white.",
    darkStrategy: "Champagne-brass linework, glossy black inner planes, and warm edge glow.",
    shapeRules:
      "Use squared caps, stepped detail, and symmetrical fan accents; circles become octagonal medallion fragments, not badges.",
    avoid: "Avoid organic moss, lace dots, gummy softness, or casual hand-drawn strokes.",
    colors: {
      day: ["#8A5C18", "#D6A748", "#372414", "#F6D889", "#16120E"],
      dark: ["#FFD575", "#B9852E", "#FFF0B7", "#5B3B15", "#0A0806"],
    },
    renderer: "deco",
  },
  {
    id: "velvet-opera",
    name: "Velvet Opera",
    sourceTrends: ["Opera Aesthetic", "Vamp Romantic"],
    concept: "Dramatic burgundy stage objects trimmed like miniature opera costumes.",
    spirit: "Romantic, theatrical, plush, and a little nocturnal.",
    shapeLanguage: "Draped ribbons, oval curves, tassel-like terminals, and ornate gold trim.",
    materialTexture: "Crushed velvet, rose shadow, antique gold embroidery, and soft stage light.",
    iconConstruction: "Filled velvet silhouettes with embroidered edge lines and subtle curtain folds.",
    dayStrategy: "Wine and oxblood forms with dark rose shadows plus gold line accents for pale UI.",
    darkStrategy: "Ruby velvet glow, blush highlights, and brighter gold trim for dark panels.",
    shapeRules:
      "Give each glyph a plush filled body, a trim line, and at least one draped or ornamental curve.",
    avoid: "Avoid icy facets, flat line-only marks, utility stencils, or candy colors.",
    colors: {
      day: ["#803047", "#B64A66", "#4B1428", "#D9A85C", "#F2C7D0"],
      dark: ["#FF94AE", "#B33A61", "#F5C36E", "#FFD8E0", "#6C1838"],
    },
    renderer: "opera",
  },
  {
    id: "lace-porcelain",
    name: "Lace Porcelain",
    sourceTrends: ["Laced Up"],
    concept: "Porcelain lace charms with tiny crochet loops and ceramic relief.",
    spirit: "Refined, delicate, bridal, and handmade with restraint.",
    shapeLanguage: "Scallops, loops, pearls, braided edges, and airy negative space.",
    materialTexture: "Glazed porcelain, ivory lace, faint blue shadows, and raised ceramic dots.",
    iconConstruction: "Cutwork glyphs assembled from double strokes, bead dots, and scalloped seams.",
    dayStrategy: "Warm gray porcelain edges with slightly darker taupe relief so details survive on white.",
    darkStrategy: "Pearl-white raised lace with soft lavender-blue rim glow on dark UI.",
    shapeRules:
      "Use dotted seams and looped contours; preserve open space and avoid heavy filled slabs.",
    avoid: "Avoid chrome fracture, brass geometry, field stencils, or saturated candy fills.",
    colors: {
      day: ["#706A60", "#A99F91", "#5F574E", "#DED6CA", "#8297AA"],
      dark: ["#FFF9EE", "#EADFD2", "#D8E7FF", "#AEB8D0", "#FFFFFF"],
    },
    renderer: "lace",
  },
  {
    id: "postal-poet",
    name: "Postal Poet",
    sourceTrends: ["Pen Pals", "Poetcore"],
    concept: "Literary stationery icons made from ink, folded paper, and stamp perforations.",
    spirit: "Tender, analog, thoughtful, and quietly archival.",
    shapeLanguage: "Torn paper tabs, folded corners, fountain-pen strokes, labels, and perforated edges.",
    materialTexture: "Cream paper, sepia ink, postage gum, graphite smudges, and pressed fibers.",
    iconConstruction: "Cut-paper miniatures with inked pictogram strokes and tiny perforation dots.",
    dayStrategy: "Sepia ink over cream paper fragments with enough brown contrast for pale sidebars.",
    darkStrategy: "Warm paper glow and pale blue ink highlights, still readable on dark UI.",
    shapeRules:
      "Every icon should look assembled from paper or stamped ink; use fold and perforation cues.",
    avoid: "Avoid glass shine, orbit halos, gummy blobs, and woven textile geometry.",
    colors: {
      day: ["#7A5F44", "#C9AD84", "#F1E3C7", "#3B2D22", "#A97752"],
      dark: ["#FFE6B9", "#D6B78B", "#FDF5DF", "#BFD1F7", "#7F5D3B"],
    },
    renderer: "postal",
  },
  {
    id: "mystic-outlands",
    name: "Mystic Outlands",
    sourceTrends: ["Mystic Outlands", "Wilderkind"],
    concept: "Small carved talismans from misty forest ruins, marked with moss and runes.",
    spirit: "Ancient, grounded, enchanted, and exploratory.",
    shapeLanguage: "Organic carved marks, rough stone edges, spiral knots, twigs, and asymmetry.",
    materialTexture: "Mossy stone, dark bark, lichen dust, mineral scratches, and faint firefly glow.",
    iconConstruction: "Carved relief pictograms with rough dashes, spiral accents, and natural speckling.",
    dayStrategy: "Deep fern and bark strokes with sage highlights, strong enough for light UI.",
    darkStrategy: "Pale moss glow, emerald edge light, and soft amber specks for dark UI.",
    shapeRules:
      "Break perfect geometry with rough carved segments, spiral marks, and natural speckles.",
    avoid: "Avoid perfect chrome, polished brass symmetry, porcelain lace, or paper perforations.",
    colors: {
      day: ["#36583A", "#6E8B55", "#1F3024", "#B9CFA1", "#8B754E"],
      dark: ["#BFF4A6", "#7ECC6A", "#E0FFD0", "#C9A66A", "#28442D"],
    },
    renderer: "mystic",
  },
  {
    id: "funhaus-stripe",
    name: "FunHaus Stripe",
    sourceTrends: ["FunHaus"],
    concept: "Premium carnival signage compressed into playful, stripe-built navigation objects.",
    spirit: "Campy, bold, cheerful, and slightly surreal.",
    shapeLanguage: "Chunky arches, diagonal stripes, flags, tilted blocks, and bouncing geometry.",
    materialTexture: "Gloss paint, enamel stripes, circus canvas, and polished candy signage.",
    iconConstruction: "Blocky filled pictograms with striped inlays and deliberately tilted proportions.",
    dayStrategy: "Deep tomato and blue enamel with cream highlights for crisp reading on white.",
    darkStrategy: "Hot coral, mint, banana, and ice-blue striping with brighter edge lights.",
    shapeRules:
      "Use chunky filled pieces, diagonal stripes, and jaunty rotation; avoid sober symmetry.",
    avoid: "Avoid delicate outlines, muted stationery, moss carving, or monochrome utility icons.",
    colors: {
      day: ["#B73A3A", "#F0C54D", "#1F6F8F", "#F8E6B8", "#2C2420"],
      dark: ["#FF746C", "#FFE66A", "#7DEBD8", "#8ECAFF", "#FFF2C7"],
    },
    renderer: "funhaus",
  },
  {
    id: "field-khaki",
    name: "Field Khaki",
    sourceTrends: ["Khaki Coded"],
    concept: "Field-kit navigation glyphs with canvas, map contours, and stenciled utility.",
    spirit: "Prepared, practical, expeditionary, and quietly rugged.",
    shapeLanguage: "Stencils, tabs, straps, map-line contours, clipped labels, and utilitarian silhouettes.",
    materialTexture: "Waxed canvas, khaki webbing, brass rivets, topo-line ink, and worn edges.",
    iconConstruction: "Stenciled filled objects with contour-line overlays and small rivet details.",
    dayStrategy: "Olive-brown and charcoal canvas strokes with tan fills for pale work surfaces.",
    darkStrategy: "Sand and sage highlights, muted amber rivets, and reduced black mass on dark UI.",
    shapeRules:
      "Use stencil gaps, clipped corners, contour lines, and rivets; make it feel like field equipment.",
    avoid: "Avoid glamorous chrome, gummy transparency, porcelain lace, or cosmic star halos.",
    colors: {
      day: ["#6F6545", "#A18D5F", "#2E3326", "#D8C28B", "#4C5737"],
      dark: ["#EADAA6", "#B9C98B", "#F5C76F", "#8FA06D", "#FFF0C4"],
    },
    renderer: "field",
  },
  {
    id: "afrohemian-weave",
    name: "Afrohemian Weave",
    sourceTrends: ["Afrohemian Decor"],
    concept: "Woven textile icons made from beads, terracotta warmth, and indigo geometry.",
    spirit: "Earthy, expressive, crafted, and rhythmically warm.",
    shapeLanguage: "Bead rows, woven strips, chevrons, sunbursts, basket arcs, and geometric blocks.",
    materialTexture: "Woven fiber, carved beads, matte clay, indigo dye, and sunbaked ochre.",
    iconConstruction: "Pattern-built pictograms with tactile beads, zigzags, and textile strip fills.",
    dayStrategy: "Deep terracotta, indigo, and umber outlines with ochre fills for pale UI contrast.",
    darkStrategy: "Warm woven highlights, coral clay, bright indigo, and bead glow on dark panels.",
    shapeRules:
      "Build with repeated beads, chevrons, and woven bands; no thin generic stroke skeleton.",
    avoid: "Avoid frosted glass, paper folds, chrome glitches, or opera velvet trim.",
    colors: {
      day: ["#A65A2D", "#263F68", "#C99845", "#3F2A1D", "#D8A66F"],
      dark: ["#F1A66A", "#88A8FF", "#FFD06D", "#FFCF9C", "#7F4C2B"],
    },
    renderer: "weave",
  },
  {
    id: "glitch-glam",
    name: "Glitch Glam",
    sourceTrends: ["Glitchy Glam", "Glamoratti"],
    concept: "Editorial chrome symbols fractured by magenta-cyan digital light leaks.",
    spirit: "High-fashion, electric, synthetic, and intentionally unstable.",
    shapeLanguage: "Fractured chrome shards, offset doubles, rectangular scan breaks, and asymmetry.",
    materialTexture: "Mirror chrome, iridescent foil, RGB split, wet gloss, and pixel-sliced highlights.",
    iconConstruction: "Chrome pictograms with displaced color channels and small glitch bars cutting the silhouette.",
    dayStrategy: "Dark violet chrome cores with vivid magenta/cyan offsets to read on white UI.",
    darkStrategy: "Bright silver-pink chrome, cyan edge split, and neon-magenta cuts for dark UI.",
    shapeRules:
      "Use asymmetric offsets, fractured bars, and chrome gradients; never allow a quiet single-line icon.",
    avoid: "Avoid natural textures, soft paper, lace loops, or stable symmetric art-deco rhythm.",
    colors: {
      day: ["#7D2DE2", "#15B5FF", "#F248B8", "#231833", "#D5C7FF"],
      dark: ["#FF8BFF", "#8CEBFF", "#F6F4FF", "#B369FF", "#241034"],
    },
    renderer: "glitch",
  },
];

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function attrs(values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => `${key}="${esc(value)}"`)
    .join(" ");
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

function jitter(value, amount, random) {
  return Number((value + (random() - 0.5) * amount).toFixed(2));
}

function pointsToString(points) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function shapeTag(el, extra = {}) {
  const common = attrs({ ...extra, ...el.attrs });
  if (el.type === "line") {
    return `<line ${attrs({ x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 })} ${common}/>`;
  }
  if (el.type === "polyline") {
    return `<polyline points="${pointsToString(el.points)}" ${common}/>`;
  }
  if (el.type === "polygon") {
    return `<polygon points="${pointsToString(el.points)}" ${common}/>`;
  }
  if (el.type === "rect") {
    return `<rect ${attrs({ x: el.x, y: el.y, width: el.w, height: el.h, rx: el.rx })} ${common}/>`;
  }
  if (el.type === "circle") {
    return `<circle ${attrs({ cx: el.cx, cy: el.cy, r: el.r })} ${common}/>`;
  }
  if (el.type === "ellipse") {
    return `<ellipse ${attrs({ cx: el.cx, cy: el.cy, rx: el.rx, ry: el.ry })} ${common}/>`;
  }
  if (el.type === "path") {
    return `<path d="${el.d}" ${common}/>`;
  }
  return "";
}

const line = (x1, y1, x2, y2) => ({ type: "line", x1, y1, x2, y2 });
const polyline = (points) => ({ type: "polyline", points });
const polygon = (points) => ({ type: "polygon", points });
const rect = (x, y, w, h, rx = 4) => ({ type: "rect", x, y, w, h, rx });
const circle = (cx, cy, r) => ({ type: "circle", cx, cy, r });
const pathEl = (d) => ({ type: "path", d });

const BASE_KIND_BY_ASSET = {
  "category-command-center": "command",
  dashboard: "dashboard",
  brain: "brain",
  "life-agent": "spark-person",
  "daily-planner": "calendar-clock",
  tasks: "checkbox",
  "weekly-review": "calendar-check",
  calendar: "calendar",
  weather: "weather",
  signals: "target",
  analytics: "bars",
  finance: "wallet",
  "category-self": "self",
  "about-me": "profile",
  "grateful-things": "heart",
  "quote-library": "quotes",
  "bucket-list": "bucket",
  health: "pulse",
  habits: "habit-list",
  journal: "notebook",
  "category-people": "group",
  relationship: "relationship",
  "role-model": "star-person",
  "category-career": "briefcase",
  career: "briefcase",
  "career-compass": "compass",
  "career-profile": "id-card",
  "career-vault": "folder-lock",
  "career-coach": "coach",
  "career-pipeline": "pipeline",
  "career-timeline": "timeline",
  "career-network": "network",
  "career-journal": "notebook",
  "career-analytics": "chart-arrow",
  "category-goals-execution": "rocket",
  goals: "target-check",
  projects: "folder",
  "category-resources": "archive",
  assets: "cube",
  documents: "document",
  "software-vault": "software",
  "category-knowledge": "library",
  "knowledge-base": "books",
  "ai-knowledge": "brain-spark",
  "mind-council": "council",
  ideas: "bulb",
  "category-learning": "open-book",
  "japanese-study": "study",
  garden: "sprout",
  "settings-reserved": "gear",
};

const PRIMARY_METAPHORS_BY_PACK = {
  "glacier-blue": {
    "category-command-center": "ice-bolt",
    "category-self": "ice-mask",
    "category-people": "ice-figures",
    "category-career": "ice-instrument-case",
    "category-goals-execution": "ice-rocket",
    "category-resources": "ice-archive-chest",
    "category-knowledge": "ice-knowledge-shard",
    "knowledge-base": "ice-knowledge-shard",
    "category-learning": "ice-rune-tablet",
    goals: "ice-target-shard",
    projects: "ice-blueprint",
    assets: "ice-cube",
    documents: "ice-tablet",
    "about-me": "ice-mask",
    health: "ice-pulse",
    habits: "ice-rune-tablet",
    journal: "ice-tablet",
    garden: "frost-sprout",
  },
  "opal-celestial": {
    "category-command-center": "comet-sigil",
    "category-self": "moon-mirror",
    "category-people": "constellation-cluster",
    "category-career": "astrolabe-badge",
    "category-goals-execution": "starship-charm",
    "category-resources": "moon-vault",
    "category-knowledge": "star-map",
    "knowledge-base": "star-map",
    "category-learning": "crescent-scroll",
    goals: "target-orbit",
    projects: "orbit-folder",
    assets: "opal-orb",
    documents: "crescent-scroll",
    "about-me": "moon-mirror",
    health: "pulse-constellation",
    habits: "orbit-checks",
    journal: "moon-scroll",
    garden: "moon-sprout",
  },
  "jelly-gummy": {
    "category-command-center": "jelly-bolt",
    "category-self": "jelly-droplet-face",
    "category-people": "gummy-blob-group",
    "category-career": "candy-briefcase",
    "category-goals-execution": "jelly-rocket",
    "category-resources": "gummy-storage-box",
    "category-knowledge": "data-candy-cube",
    "knowledge-base": "data-candy-cube",
    "category-learning": "gel-book",
    goals: "gummy-target",
    projects: "gummy-folder",
    assets: "data-candy-cube",
    documents: "gel-card",
    "about-me": "jelly-droplet-face",
    health: "jelly-pulse",
    habits: "gummy-checks",
    journal: "gel-book",
    garden: "gummy-sprout",
  },
  "neo-deco-brass": {
    "category-command-center": "deco-lightning-monogram",
    "category-self": "brass-vanity-mirror",
    "category-people": "guild-medallion-figures",
    "category-career": "brass-portfolio-clasp",
    "category-goals-execution": "deco-rocket-finial",
    "category-resources": "lacquer-archive-drawer",
    "category-knowledge": "brass-library-emblem",
    "knowledge-base": "brass-library-emblem",
    "category-learning": "stepped-folio",
    goals: "brass-target-seal",
    projects: "deco-folder",
    assets: "brass-cube",
    documents: "stepped-folio",
    "about-me": "brass-vanity-mirror",
    health: "deco-pulse",
    habits: "deco-check-panel",
    journal: "lacquer-ledger",
    garden: "brass-sprout",
  },
  "velvet-opera": {
    "category-command-center": "ruby-stage-brooch",
    "category-self": "velvet-mask",
    "category-people": "chorus-silhouettes",
    "category-career": "contract-folio",
    "category-goals-execution": "opera-rocket-prop",
    "category-resources": "velvet-trunk",
    "category-knowledge": "opera-program-archive",
    "knowledge-base": "opera-program-archive",
    "category-learning": "music-stand-book",
    goals: "stage-target",
    projects: "curtain-folder",
    assets: "velvet-trunk",
    documents: "contract-folio",
    "about-me": "velvet-mask",
    health: "aria-pulse",
    habits: "program-checklist",
    journal: "opera-program-archive",
    garden: "velvet-rose-sprout",
  },
  "lace-porcelain": {
    "category-command-center": "ceramic-starburst",
    "category-self": "porcelain-cameo-mirror",
    "category-people": "lace-doll-group",
    "category-career": "porcelain-clasp-case",
    "category-goals-execution": "lacework-rocket",
    "category-resources": "ceramic-keepsake-box",
    "category-knowledge": "lace-library-medallion",
    "knowledge-base": "lace-library-medallion",
    "category-learning": "porcelain-lesson-fan",
    goals: "porcelain-target",
    projects: "lace-folder",
    assets: "ceramic-keepsake-box",
    documents: "porcelain-card",
    "about-me": "porcelain-cameo-mirror",
    health: "porcelain-pulse",
    habits: "lace-checks",
    journal: "porcelain-card",
    garden: "porcelain-sprout",
  },
  "postal-poet": {
    "category-command-center": "stamped-urgent-mark",
    "category-self": "handwritten-profile-card",
    "category-people": "address-book-cluster",
    "category-career": "sealed-work-dossier",
    "category-goals-execution": "paper-rocket-letter",
    "category-resources": "archive-drawer-card",
    "category-knowledge": "stamped-archive-card",
    "knowledge-base": "stamped-archive-card",
    "category-learning": "folded-study-letter",
    goals: "stamp-target",
    projects: "paper-folder",
    assets: "archive-drawer-card",
    documents: "folded-study-letter",
    "about-me": "handwritten-profile-card",
    health: "ink-pulse",
    habits: "paper-checklist",
    journal: "handwritten-journal",
    garden: "pressed-flower-note",
  },
  "mystic-outlands": {
    "category-command-center": "storm-rune-wand",
    "category-self": "identity-totem",
    "category-people": "moss-clan-stones",
    "category-career": "pathfinder-talisman",
    "category-goals-execution": "enchanted-arrow-rune",
    "category-resources": "moss-supply-chest",
    "category-knowledge": "spell-shard",
    "knowledge-base": "spell-shard",
    "category-learning": "rune-tablet",
    goals: "rune-target",
    projects: "bark-folder",
    assets: "moss-supply-chest",
    documents: "rune-tablet",
    "about-me": "identity-totem",
    health: "moss-pulse",
    habits: "rune-checks",
    journal: "bark-journal",
    garden: "mystic-sprout",
  },
  "funhaus-stripe": {
    "category-command-center": "striped-lightning-sign",
    "category-self": "funhouse-mirror-mask",
    "category-people": "performer-token-stack",
    "category-career": "ticket-booth-case",
    "category-goals-execution": "striped-rocket-sign",
    "category-resources": "prize-crate",
    "category-knowledge": "carnival-map-placard",
    "knowledge-base": "carnival-map-placard",
    "category-learning": "striped-lesson-banner",
    goals: "carnival-target",
    projects: "show-folder",
    assets: "prize-crate",
    documents: "ticket-card",
    "about-me": "funhouse-mirror-mask",
    health: "marquee-pulse",
    habits: "ticket-checks",
    journal: "show-program",
    garden: "stripe-sprout",
  },
  "field-khaki": {
    "category-command-center": "tactical-signal-bolt",
    "category-self": "dog-tag-mirror",
    "category-people": "field-team-markers",
    "category-career": "compass-and-case",
    "category-goals-execution": "launch-flag-marker",
    "category-resources": "canvas-supply-pouch",
    "category-knowledge": "topo-map-shard",
    "knowledge-base": "topo-map-shard",
    "category-learning": "field-notebook-tab",
    goals: "survey-target",
    projects: "field-folder",
    assets: "canvas-supply-pouch",
    documents: "folded-map",
    "about-me": "dog-tag-mirror",
    health: "field-pulse",
    habits: "field-checklist",
    journal: "field-notebook-tab",
    garden: "field-sprout",
  },
  "afrohemian-weave": {
    "category-command-center": "bead-lightning-charm",
    "category-self": "woven-identity-mask",
    "category-people": "bead-circle-gathering",
    "category-career": "textile-satchel",
    "category-goals-execution": "woven-arrow-rocket",
    "category-resources": "basket-archive",
    "category-knowledge": "bead-knowledge-tablet",
    "knowledge-base": "bead-knowledge-tablet",
    "category-learning": "woven-study-fan",
    goals: "bead-target",
    projects: "woven-folder",
    assets: "basket-archive",
    documents: "bead-knowledge-tablet",
    "about-me": "woven-identity-mask",
    health: "woven-pulse",
    habits: "bead-checks",
    journal: "woven-journal",
    garden: "woven-sprout",
  },
  "glitch-glam": {
    "category-command-center": "fractured-chrome-signal",
    "category-self": "holographic-mirror-avatar",
    "category-people": "rgb-avatar-cluster",
    "category-career": "chrome-credential-case",
    "category-goals-execution": "neon-launch-vector",
    "category-resources": "holographic-vault-prism",
    "category-knowledge": "holographic-data-cube",
    "knowledge-base": "holographic-data-cube",
    "category-learning": "glitch-learning-tablet",
    goals: "neon-target",
    projects: "glitch-folder",
    assets: "holographic-vault-prism",
    documents: "glitch-learning-tablet",
    "about-me": "holographic-mirror-avatar",
    health: "neon-pulse",
    habits: "glitch-checks",
    journal: "glitch-learning-tablet",
    garden: "neon-sprout",
  },
};

function kindForAsset(assetId, packId) {
  return PRIMARY_METAPHORS_BY_PACK[packId]?.[assetId] ?? BASE_KIND_BY_ASSET[assetId] ?? "spark";
}

function metaphorLabelForAsset(assetId, packId) {
  return kindForAsset(assetId, packId).replaceAll("-", " ");
}

function semanticElements(kind) {
  switch (kind) {
    case "ice-bolt":
    case "jelly-bolt":
    case "deco-lightning-monogram":
    case "ruby-stage-brooch":
    case "stamped-urgent-mark":
    case "striped-lightning-sign":
    case "tactical-signal-bolt":
    case "bead-lightning-charm":
    case "fractured-chrome-signal":
      return semanticElements("command");
    case "comet-sigil":
      return [
        pathEl("M35 83C50 55 70 38 102 25C88 53 70 77 44 99Z"),
        pathEl("M22 34C38 42 47 52 52 68"),
        pathEl("M16 55C34 57 45 64 56 78"),
        circle(81, 47, 8),
      ];
    case "storm-rune-wand":
      return [
        polygon([[74, 18], [37, 70], [58, 67], [48, 108], [94, 52], [69, 57]]),
        line(27, 27, 46, 47),
        line(87, 80, 105, 99),
      ];
    case "ice-mask":
    case "velvet-mask":
    case "funhouse-mirror-mask":
    case "woven-identity-mask":
      return [
        pathEl("M34 39C46 27 82 27 94 39C96 65 87 91 64 101C41 91 32 65 34 39Z"),
        pathEl("M44 59C51 53 58 54 62 61C55 64 49 64 44 59Z"),
        pathEl("M84 59C77 53 70 54 66 61C73 64 79 64 84 59Z"),
        pathEl("M52 82C60 87 68 87 76 82"),
      ];
    case "moon-mirror":
    case "brass-vanity-mirror":
    case "porcelain-cameo-mirror":
    case "dog-tag-mirror":
    case "holographic-mirror-avatar":
      return [
        circle(64, 50, 26),
        pathEl("M52 102H76L71 74H57Z"),
        pathEl("M54 50C57 42 71 42 74 50"),
        circle(56, 54, 3),
        circle(72, 54, 3),
      ];
    case "jelly-droplet-face":
      return [
        pathEl("M64 23C82 47 94 61 94 78C94 96 80 108 64 108C48 108 34 96 34 78C34 61 46 47 64 23Z"),
        circle(54, 73, 3.5),
        circle(74, 73, 3.5),
        pathEl("M52 86C60 93 69 93 77 86"),
      ];
    case "handwritten-profile-card":
      return [rect(31, 31, 66, 76, 5), circle(55, 57, 12), pathEl("M37 88C42 72 68 72 73 88"), line(77, 50, 89, 50), line(77, 64, 91, 64), line(38, 100, 87, 95)];
    case "identity-totem":
      return [
        pathEl("M45 25H83L92 43V91L78 108H50L36 91V43Z"),
        circle(54, 55, 5),
        circle(74, 55, 5),
        pathEl("M52 78C59 84 69 84 76 78"),
        line(64, 31, 64, 102),
      ];
    case "ice-figures":
    case "constellation-cluster":
    case "gummy-blob-group":
    case "guild-medallion-figures":
    case "chorus-silhouettes":
    case "lace-doll-group":
    case "address-book-cluster":
    case "moss-clan-stones":
    case "field-team-markers":
    case "rgb-avatar-cluster":
      return semanticElements("group");
    case "performer-token-stack":
      return [circle(49, 49, 13), circle(79, 49, 13), circle(64, 74, 14), rect(34, 84, 60, 18, 7)];
    case "bead-circle-gathering":
      return [
        circle(64, 34, 7),
        circle(84, 45, 7),
        circle(92, 66, 7),
        circle(82, 88, 7),
        circle(64, 96, 7),
        circle(46, 88, 7),
        circle(36, 66, 7),
        circle(44, 45, 7),
        circle(64, 65, 10),
      ];
    case "ice-instrument-case":
    case "candy-briefcase":
    case "brass-portfolio-clasp":
    case "porcelain-clasp-case":
    case "chrome-credential-case":
      return semanticElements("briefcase");
    case "astrolabe-badge":
      return [circle(64, 64, 35), circle(64, 64, 20), line(29, 64, 99, 64), line(64, 29, 64, 99), pathEl("M41 41C58 54 70 72 87 87"), pathEl("M87 41C70 54 58 72 41 87")];
    case "contract-folio":
    case "sealed-work-dossier":
    case "stepped-folio":
      return [rect(36, 27, 56, 77, 6), pathEl("M45 43H82"), pathEl("M45 59H77"), pathEl("M45 75H72"), polygon([[64, 76], [72, 91], [64, 87], [56, 91]])];
    case "pathfinder-talisman":
    case "compass-and-case":
      return [circle(64, 58, 30), polygon([[80, 35], [68, 65], [49, 84], [60, 52]]), rect(43, 88, 42, 14, 5)];
    case "ticket-booth-case":
      return [pathEl("M34 96V47C42 32 86 32 94 47V96Z"), rect(44, 62, 40, 24, 4), pathEl("M42 47H86"), line(52, 36, 52, 96), line(76, 36, 76, 96)];
    case "textile-satchel":
      return [pathEl("M33 49H95V96H33Z"), pathEl("M48 49C48 30 80 30 80 49"), pathEl("M33 68H95"), pathEl("M48 80L64 92L80 80")];
    case "ice-rocket":
    case "jelly-rocket":
    case "deco-rocket-finial":
    case "opera-rocket-prop":
    case "lacework-rocket":
    case "striped-rocket-sign":
    case "neon-launch-vector":
      return semanticElements("rocket");
    case "paper-rocket-letter":
      return [polygon([[24, 40], [108, 24], [76, 104], [61, 69]]), polygon([[61, 69], [24, 40], [53, 78]]), line(61, 69, 108, 24)];
    case "starship-charm":
      return [pathEl("M64 23C81 35 89 53 83 76L64 105L45 76C39 53 47 35 64 23Z"), circle(64, 53, 10), pathEl("M44 76L28 89L48 91"), pathEl("M84 76L100 89L80 91"), circle(35, 30, 3), circle(95, 36, 2.5)];
    case "enchanted-arrow-rune":
    case "woven-arrow-rocket":
    case "launch-flag-marker":
      return [polygon([[64, 20], [93, 88], [68, 78], [64, 108], [60, 78], [35, 88]]), line(43, 96, 85, 96)];
    case "ice-archive-chest":
    case "gummy-storage-box":
    case "moon-vault":
    case "velvet-trunk":
    case "ceramic-keepsake-box":
    case "moss-supply-chest":
    case "prize-crate":
    case "canvas-supply-pouch":
    case "basket-archive":
    case "holographic-vault-prism":
      return semanticElements("archive");
    case "lacquer-archive-drawer":
    case "archive-drawer-card":
      return [rect(32, 35, 64, 64, 5), line(32, 55, 96, 55), line(32, 76, 96, 76), rect(54, 44, 20, 5, 2), rect(54, 65, 20, 5, 2), rect(54, 86, 20, 5, 2)];
    case "ice-knowledge-shard":
    case "spell-shard":
    case "topo-map-shard":
      return [polygon([[64, 18], [96, 48], [82, 104], [43, 111], [29, 59]]), line(64, 18, 61, 106), line(38, 61, 95, 48), line(43, 111, 74, 64)];
    case "star-map":
      return [rect(34, 30, 60, 70, 5), line(43, 82, 86, 43), circle(48, 42, 3), circle(68, 56, 3), circle(84, 42, 3), circle(76, 78, 3), line(48, 42, 68, 56), line(68, 56, 84, 42), line(68, 56, 76, 78)];
    case "data-candy-cube":
    case "holographic-data-cube":
    case "brass-cube":
    case "ice-cube":
      return semanticElements("cube");
    case "brass-library-emblem":
    case "lace-library-medallion":
      return [circle(64, 64, 34), rect(45, 52, 8, 29, 1), rect(60, 44, 8, 37, 1), rect(75, 52, 8, 29, 1), line(39, 85, 89, 85)];
    case "opera-program-archive":
    case "show-program":
    case "handwritten-journal":
    case "bark-journal":
    case "woven-journal":
    case "lacquer-ledger":
      return semanticElements("notebook");
    case "stamped-archive-card":
      return [rect(31, 35, 66, 58, 4), circle(78, 54, 10), line(41, 54, 65, 54), line(41, 69, 86, 69), line(41, 82, 76, 82)];
    case "ice-rune-tablet":
    case "rune-tablet":
    case "field-notebook-tab":
    case "glitch-learning-tablet":
    case "bead-knowledge-tablet":
      return [rect(37, 24, 54, 82, 7), line(50, 44, 78, 44), line(50, 61, 74, 61), line(50, 78, 82, 78), polygon([[64, 88], [70, 98], [58, 98]])];
    case "crescent-scroll":
    case "moon-scroll":
    case "folded-study-letter":
    case "gel-card":
    case "ticket-card":
    case "folded-map":
    case "porcelain-card":
      return [pathEl("M36 34H86C96 34 96 49 86 49H42V96H92"), pathEl("M42 49C32 49 32 34 42 34"), line(51, 64, 81, 64), line(51, 78, 77, 78)];
    case "gel-book":
    case "music-stand-book":
      return semanticElements("open-book");
    case "porcelain-lesson-fan":
    case "woven-study-fan":
    case "striped-lesson-banner":
      return [
        polygon([[64, 94], [31, 45], [43, 38], [64, 94]]),
        polygon([[64, 94], [49, 32], [62, 29], [64, 94]]),
        polygon([[64, 94], [79, 32], [92, 38], [64, 94]]),
        line(31, 45, 92, 38),
      ];
    case "ice-blueprint":
    case "orbit-folder":
    case "gummy-folder":
    case "deco-folder":
    case "curtain-folder":
    case "lace-folder":
    case "paper-folder":
    case "bark-folder":
    case "show-folder":
    case "field-folder":
    case "woven-folder":
    case "glitch-folder":
      return semanticElements("folder");
    case "frost-sprout":
    case "moon-sprout":
    case "gummy-sprout":
    case "brass-sprout":
    case "velvet-rose-sprout":
    case "porcelain-sprout":
    case "pressed-flower-note":
    case "mystic-sprout":
    case "stripe-sprout":
    case "field-sprout":
    case "woven-sprout":
    case "neon-sprout":
      return semanticElements("sprout");
    case "ice-target-shard":
    case "target-orbit":
    case "gummy-target":
    case "brass-target-seal":
    case "stage-target":
    case "porcelain-target":
    case "stamp-target":
    case "rune-target":
    case "carnival-target":
    case "survey-target":
    case "bead-target":
    case "neon-target":
      return semanticElements("target-check");
    case "ice-pulse":
    case "pulse-constellation":
    case "jelly-pulse":
    case "deco-pulse":
    case "aria-pulse":
    case "porcelain-pulse":
    case "ink-pulse":
    case "moss-pulse":
    case "marquee-pulse":
    case "field-pulse":
    case "woven-pulse":
    case "neon-pulse":
      return semanticElements("pulse");
    case "orbit-checks":
    case "gummy-checks":
    case "deco-check-panel":
    case "program-checklist":
    case "lace-checks":
    case "paper-checklist":
    case "rune-checks":
    case "ticket-checks":
    case "field-checklist":
    case "bead-checks":
    case "glitch-checks":
      return semanticElements("habit-list");
    case "opal-orb":
      return [circle(64, 64, 31), circle(64, 64, 18), pathEl("M39 71C57 52 73 47 92 45")];
    case "command":
      return [polygon([[72, 18], [37, 66], [60, 62], [49, 110], [92, 51], [67, 56]])];
    case "dashboard":
      return [rect(31, 30, 25, 25, 6), rect(72, 30, 25, 25, 6), rect(31, 73, 25, 25, 6), rect(72, 73, 25, 25, 6)];
    case "brain":
      return [
        pathEl("M61 30C47 19 29 31 36 48C22 55 27 78 44 79C40 96 58 105 66 91C75 105 96 95 91 78C108 73 105 50 91 48C96 31 76 19 67 32"),
        pathEl("M63 34C55 44 57 55 66 62C56 67 55 78 62 89"),
        pathEl("M46 47C54 48 58 52 60 59M83 47C75 49 71 54 69 61M44 78C52 75 58 77 63 84M88 78C80 75 73 77 68 84"),
      ];
    case "spark-person":
      return [circle(54, 50, 13), pathEl("M32 100C36 78 72 78 77 100"), polygon([[91, 24], [97, 43], [116, 50], [97, 57], [91, 76], [84, 57], [65, 50], [84, 43]])];
    case "calendar-clock":
      return [rect(32, 31, 64, 68, 8), line(32, 51, 96, 51), line(46, 24, 46, 39), line(82, 24, 82, 39), circle(66, 74, 17), line(66, 65, 66, 75), line(66, 75, 76, 80)];
    case "checkbox":
      return [rect(33, 33, 63, 63, 8), polyline([[47, 66], [60, 79], [83, 53]])];
    case "calendar-check":
      return [rect(32, 31, 64, 68, 8), line(32, 51, 96, 51), line(46, 24, 46, 39), line(82, 24, 82, 39), polyline([[48, 75], [60, 86], [83, 62]])];
    case "calendar":
      return [rect(32, 31, 64, 68, 8), line(32, 51, 96, 51), line(46, 24, 46, 39), line(82, 24, 82, 39), line(47, 66, 82, 66), line(47, 81, 82, 81), line(58, 58, 58, 91), line(72, 58, 72, 91)];
    case "weather":
      return [circle(83, 44, 14), pathEl("M38 84H89C101 84 105 66 93 61C88 44 62 45 57 61C42 57 30 69 38 84"), line(99, 29, 109, 19), line(104, 45, 119, 45)];
    case "target":
      return [circle(64, 64, 34), circle(64, 64, 20), circle(64, 64, 6), line(86, 42, 107, 21), polyline([[96, 21], [107, 21], [107, 32]])];
    case "bars":
      return [rect(31, 72, 12, 28, 3), rect(52, 58, 12, 42, 3), rect(73, 42, 12, 58, 3), rect(94, 28, 12, 72, 3), polyline([[33, 49], [55, 39], [76, 32], [98, 20]])];
    case "wallet":
      return [rect(31, 43, 66, 47, 8), pathEl("M39 43C39 33 52 29 66 36L91 43"), rect(72, 57, 31, 20, 6), circle(85, 67, 3.5)];
    case "self":
      return [pathEl("M39 70C43 90 86 90 90 70"), circle(50, 55, 4), circle(80, 55, 4), pathEl("M50 35C58 27 71 27 80 35")];
    case "profile":
      return [circle(64, 46, 17), pathEl("M33 101C39 75 90 75 96 101")];
    case "heart":
      return [pathEl("M64 101C37 80 27 66 31 49C35 31 56 30 64 45C72 30 93 31 97 49C101 66 91 80 64 101Z")];
    case "quotes":
      return [pathEl("M42 42C33 48 31 62 37 72C43 82 58 77 56 65C54 56 45 56 41 59C41 52 46 48 53 45"), pathEl("M80 42C71 48 69 62 75 72C81 82 96 77 94 65C92 56 83 56 79 59C79 52 84 48 91 45")];
    case "bucket":
      return [pathEl("M39 48H90L84 96H45Z"), pathEl("M45 48C45 32 84 32 84 48"), polyline([[49, 70], [59, 80], [78, 59]])];
    case "pulse":
      return [polyline([[24, 68], [43, 68], [52, 49], [64, 89], [75, 38], [85, 68], [105, 68]])];
    case "habit-list":
      return [circle(38, 43, 6), circle(38, 64, 6), circle(38, 85, 6), line(52, 43, 95, 43), line(52, 64, 90, 64), line(52, 85, 98, 85), pathEl("M88 48C104 57 100 82 82 86")];
    case "notebook":
      return [rect(37, 27, 56, 76, 7), line(50, 28, 50, 103), line(61, 46, 82, 46), line(61, 61, 82, 61), line(61, 76, 77, 76)];
    case "group":
      return [circle(64, 43, 12), circle(38, 54, 10), circle(90, 54, 10), pathEl("M42 96C45 73 83 73 86 96"), pathEl("M19 96C22 78 52 78 55 96"), pathEl("M73 96C76 78 106 78 109 96")];
    case "relationship":
      return [pathEl("M54 82C36 67 31 56 34 45C37 33 51 33 57 43C63 33 77 33 80 45C83 56 72 70 54 82Z"), pathEl("M82 85C76 75 76 59 88 54C101 48 111 60 105 73C101 81 92 84 82 85Z"), line(60, 83, 78, 83)];
    case "star-person":
      return [polygon([[64, 23], [73, 49], [101, 49], [78, 65], [87, 93], [64, 76], [41, 93], [50, 65], [27, 49], [55, 49]]), circle(64, 71, 6)];
    case "briefcase":
      return [rect(31, 44, 66, 47, 7), pathEl("M51 44V34H77V44"), line(31, 62, 97, 62), line(64, 58, 64, 68)];
    case "compass":
      return [circle(64, 64, 35), polygon([[79, 35], [68, 71], [49, 92], [60, 56]])];
    case "id-card":
      return [rect(27, 37, 74, 55, 7), circle(50, 62, 10), pathEl("M36 82C39 70 61 70 64 82"), line(70, 56, 91, 56), line(70, 70, 91, 70)];
    case "folder-lock":
      return [pathEl("M29 45H56L64 55H99V94H29Z"), rect(58, 68, 22, 19, 4), pathEl("M63 68V61C63 52 75 52 75 61V68")];
    case "coach":
      return [circle(54, 51, 12), pathEl("M32 95C37 75 72 75 78 95"), pathEl("M80 34H108V57H91L80 68Z"), polygon([[99, 38], [102, 45], [110, 46], [104, 51], [106, 59], [99, 55], [92, 59], [94, 51], [88, 46], [96, 45]])];
    case "pipeline":
      return [circle(34, 38, 8), circle(64, 64, 8), circle(94, 90, 8), line(40, 43, 58, 59), line(70, 69, 88, 85), rect(49, 31, 30, 14, 4), rect(49, 83, 30, 14, 4)];
    case "timeline":
      return [line(35, 33, 35, 98), circle(35, 40, 6), circle(35, 65, 6), circle(35, 90, 6), rect(51, 32, 44, 17, 4), rect(51, 57, 38, 17, 4), rect(51, 82, 48, 17, 4)];
    case "network":
      return [circle(64, 35, 8), circle(36, 72, 8), circle(92, 72, 8), circle(64, 96, 8), line(59, 41, 42, 66), line(69, 41, 86, 66), line(43, 76, 58, 91), line(85, 76, 70, 91), line(44, 72, 84, 72)];
    case "chart-arrow":
      return [rect(31, 75, 12, 25, 3), rect(53, 61, 12, 39, 3), rect(75, 46, 12, 54, 3), polyline([[34, 50], [55, 42], [74, 30], [96, 22]]), polyline([[86, 20], [96, 22], [94, 33]])];
    case "rocket":
      return [pathEl("M66 23C84 31 92 48 85 68L67 101L48 68C41 48 49 31 66 23Z"), circle(66, 52, 9), pathEl("M48 69L31 84L49 85"), pathEl("M84 69L101 84L83 85"), pathEl("M58 98L66 115L74 98")];
    case "target-check":
      return [circle(64, 64, 34), circle(64, 64, 20), polyline([[50, 67], [61, 78], [82, 54]])];
    case "folder":
      return [pathEl("M29 43H55L64 54H99V94H29Z"), line(35, 68, 88, 68)];
    case "archive":
      return [rect(33, 49, 62, 45, 7), pathEl("M28 38H100L94 50H34Z"), line(54, 66, 74, 66)];
    case "cube":
      return [polygon([[64, 25], [98, 44], [98, 83], [64, 104], [30, 83], [30, 44]]), polyline([[30, 44], [64, 64], [98, 44]]), line(64, 64, 64, 104)];
    case "document":
      return [pathEl("M40 26H76L94 44V102H40Z"), pathEl("M76 26V45H94"), line(51, 62, 82, 62), line(51, 77, 82, 77), line(51, 91, 72, 91)];
    case "software":
      return [rect(32, 33, 26, 26, 6), rect(70, 33, 26, 26, 6), rect(32, 71, 26, 26, 6), rect(70, 71, 26, 26, 6), line(45, 59, 45, 71), line(83, 59, 83, 71), line(58, 46, 70, 46), line(58, 84, 70, 84)];
    case "library":
      return [rect(27, 44, 12, 55, 2), rect(45, 35, 12, 64, 2), rect(63, 49, 12, 50, 2), rect(81, 31, 12, 68, 2), line(23, 102, 100, 102)];
    case "books":
      return [pathEl("M31 35C45 31 55 35 64 43V99C53 91 43 89 31 93Z"), pathEl("M64 43C73 35 83 31 97 35V93C85 89 75 91 64 99Z"), line(64, 43, 64, 99)];
    case "brain-spark":
      return [...semanticElements("brain"), polygon([[100, 24], [105, 37], [118, 42], [105, 47], [100, 60], [95, 47], [82, 42], [95, 37]])];
    case "council":
      return [circle(64, 42, 10), circle(42, 60, 9), circle(86, 60, 9), pathEl("M36 98C42 77 86 77 92 98"), pathEl("M20 98C23 82 53 82 56 98"), pathEl("M72 98C75 82 105 82 108 98"), line(52, 55, 76, 55)];
    case "bulb":
      return [pathEl("M64 27C48 27 38 39 38 54C38 65 45 73 53 79V91H75V79C83 73 90 65 90 54C90 39 80 27 64 27Z"), line(54, 101, 74, 101), line(56, 91, 72, 91)];
    case "open-book":
      return [pathEl("M29 36C45 32 56 37 64 46V101C54 91 43 88 29 92Z"), pathEl("M64 46C72 37 83 32 99 36V92C85 88 74 91 64 101Z")];
    case "study":
      return [pathEl("M31 45H78V80H56L43 94V80H31Z"), pathEl("M62 34H100V64H84"), line(43, 58, 64, 58), line(75, 47, 90, 47)];
    case "sprout":
      return [pathEl("M64 102V66"), pathEl("M64 75C43 76 35 57 38 42C58 42 66 55 64 75Z"), pathEl("M66 65C66 45 80 34 99 31C102 50 88 67 66 65Z")];
    case "gear":
      return [circle(64, 64, 18), circle(64, 64, 7), line(64, 27, 64, 43), line(64, 85, 64, 101), line(27, 64, 43, 64), line(85, 64, 101, 64), line(38, 38, 50, 50), line(78, 78, 90, 90), line(38, 90, 50, 78), line(78, 50, 90, 38)];
    default:
      return [polygon([[64, 24], [73, 53], [103, 64], [73, 75], [64, 104], [55, 75], [25, 64], [55, 53]])];
  }
}

function renderRawElements(elements, style, random, options = {}) {
  const transform = options.transform ?? "";
  const pieces = elements.map((el, index) => {
    const local = { ...style };
    if (options.jitter && (el.type === "line" || el.type === "polyline" || el.type === "polygon")) {
      if (el.type === "line") {
        el = {
          ...el,
          x1: jitter(el.x1, options.jitter, random),
          y1: jitter(el.y1, options.jitter, random),
          x2: jitter(el.x2, options.jitter, random),
          y2: jitter(el.y2, options.jitter, random),
        };
      } else {
        el = { ...el, points: el.points.map(([x, y]) => [jitter(x, options.jitter, random), jitter(y, options.jitter, random)]) };
      }
    }
    const opacity = options.opacityStep ? Math.max(0.25, 1 - index * options.opacityStep) : undefined;
    return shapeTag(el, { ...local, opacity: opacity ?? local.opacity });
  });
  return `<g ${transform ? `transform="${transform}"` : ""}>${pieces.join("")}</g>`;
}

function iconDefs(pack, mode) {
  const c = pack.colors[mode];
  return `
    <defs>
      <linearGradient id="main" x1="20" y1="20" x2="108" y2="112" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${c[3]}"/>
        <stop offset="0.48" stop-color="${c[1]}"/>
        <stop offset="1" stop-color="${c[0]}"/>
      </linearGradient>
      <linearGradient id="edge" x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${c[3]}"/>
        <stop offset="0.55" stop-color="${c[2]}"/>
        <stop offset="1" stop-color="${c[4]}"/>
      </linearGradient>
      <radialGradient id="shine" cx="35%" cy="24%" r="75%">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="${mode === "dark" ? 0.92 : 0.75}"/>
        <stop offset="0.34" stop-color="${c[3]}" stop-opacity="0.42"/>
        <stop offset="1" stop-color="${c[0]}" stop-opacity="0"/>
      </radialGradient>
      <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="${mode === "dark" ? 1.2 : 1.5}" stdDeviation="${mode === "dark" ? 1.4 : 1.1}" flood-color="${c[2]}" flood-opacity="${mode === "dark" ? 0.48 : 0.22}"/>
      </filter>
      <filter id="materialNoise" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="${pack.id.length * 17}" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.12"/>
        </feComponentTransfer>
      </filter>
      <pattern id="diagonalStripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
        <rect width="12" height="12" fill="${c[0]}"/>
        <rect width="5" height="12" fill="${c[1]}"/>
        <rect x="8" width="2" height="12" fill="${c[3]}" opacity="0.75"/>
      </pattern>
      <pattern id="weavePattern" width="14" height="14" patternUnits="userSpaceOnUse">
        <path d="M0 4H14M0 11H14M4 0V14M11 0V14" stroke="${c[3]}" stroke-width="2" opacity="0.5"/>
        <path d="M0 0L14 14M14 0L0 14" stroke="${c[1]}" stroke-width="1.3" opacity="0.45"/>
      </pattern>
    </defs>
  `;
}

function renderFacets(pack, mode, random) {
  const c = pack.colors[mode];
  const shards = [];
  for (let i = 0; i < 8; i += 1) {
    const cx = 34 + random() * 60;
    const cy = 28 + random() * 72;
    const s = 6 + random() * 14;
    shards.push(`<polygon points="${pointsToString([[cx, cy - s], [cx + s * 0.8, cy + s * 0.45], [cx - s * 0.75, cy + s * 0.7]])}" fill="${i % 2 ? c[1] : c[3]}" opacity="${mode === "dark" ? 0.2 : 0.16}"/>`);
  }
  return `<g>${shards.join("")}</g>`;
}

function renderStars(pack, mode, random) {
  const c = pack.colors[mode];
  const stars = [];
  for (let i = 0; i < 5; i += 1) {
    const cx = 26 + random() * 76;
    const cy = 20 + random() * 88;
    const r = 2.2 + random() * 2.5;
    stars.push(`<path d="M${cx} ${cy - r}L${cx + r * 0.36} ${cy - r * 0.36}L${cx + r} ${cy}L${cx + r * 0.36} ${cy + r * 0.36}L${cx} ${cy + r}L${cx - r * 0.36} ${cy + r * 0.36}L${cx - r} ${cy}L${cx - r * 0.36} ${cy - r * 0.36}Z" fill="${c[3]}" opacity="${mode === "dark" ? 0.85 : 0.62}"/>`);
  }
  return stars.join("");
}

function dotRow(x1, y1, x2, y2, count, color, r, opacity = 1) {
  const dots = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    dots.push(`<circle cx="${x1 + (x2 - x1) * t}" cy="${y1 + (y2 - y1) * t}" r="${r}" fill="${color}" opacity="${opacity}"/>`);
  }
  return dots.join("");
}

function renderByPack(pack, mode, target) {
  const kind = kindForAsset(target.assetId, pack.id);
  const elements = semanticElements(kind);
  const seed = hashString(`${pack.id}:${mode}:${target.assetId}`);
  const random = seededRandom(seed);
  const c = pack.colors[mode];
  const rotate = (random() - 0.5) * 7;

  if (pack.renderer === "glacier") {
    return [
      renderFacets(pack, mode, random),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#edge)",
        "stroke-width": 11,
        "stroke-linecap": "butt",
        "stroke-linejoin": "miter",
        filter: "url(#softShadow)",
      }, random, { transform: `rotate(${rotate} 64 64)`, jitter: 2.4 }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[3],
        "stroke-width": 3.2,
        "stroke-linecap": "butt",
        "stroke-linejoin": "miter",
        opacity: 0.86,
      }, random, { transform: `rotate(${rotate} 64 64) scale(.91) translate(6 6)`, jitter: 1.4 }),
      `<g opacity="${mode === "dark" ? 0.55 : 0.36}" stroke="${c[3]}" stroke-width="1.6" stroke-linecap="round">${line(37, 36, 52, 55).type ? shapeTag(line(37, 36, 52, 55)) : ""}${shapeTag(line(86, 42, 72, 61))}${shapeTag(line(53, 87, 73, 79))}</g>`,
    ].join("");
  }

  if (pack.renderer === "opal") {
    return [
      `<ellipse cx="64" cy="64" rx="48" ry="22" fill="none" stroke="${c[1]}" stroke-width="2.6" opacity="${mode === "dark" ? 0.5 : 0.35}" transform="rotate(${18 + rotate} 64 64)"/>`,
      `<ellipse cx="64" cy="64" rx="42" ry="18" fill="none" stroke="${c[4]}" stroke-width="1.8" stroke-dasharray="7 7" opacity="${mode === "dark" ? 0.72 : 0.45}" transform="rotate(${-28 + rotate} 64 64)"/>`,
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#main)",
        "stroke-width": 7.4,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        filter: "url(#softShadow)",
      }, random, { transform: `scale(.86) translate(10.5 10.5)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[3],
        "stroke-width": 2.3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.82 : 0.55,
      }, random, { transform: `scale(.86) translate(10.5 10.5)` }),
      renderStars(pack, mode, random),
    ].join("");
  }

  if (pack.renderer === "jelly") {
    return [
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": 18,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.42 : 0.28,
      }, random, { transform: `rotate(${rotate} 64 64) scale(.93) translate(5 5)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#main)",
        "stroke-width": 14,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        filter: "url(#softShadow)",
      }, random, { transform: `rotate(${rotate} 64 64) scale(.93) translate(5 5)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "#FFFFFF",
        "stroke-width": 3.4,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.85 : 0.68,
      }, random, { transform: `translate(-4 -5) rotate(${rotate} 64 64) scale(.78) translate(18 18)` }),
      `<circle cx="${42 + random() * 42}" cy="${30 + random() * 55}" r="${3 + random() * 3}" fill="#FFFFFF" opacity="${mode === "dark" ? 0.76 : 0.55}"/>`,
      `<circle cx="${50 + random() * 45}" cy="${58 + random() * 45}" r="${2 + random() * 2.5}" fill="${c[3]}" opacity="0.42"/>`,
    ].join("");
  }

  if (pack.renderer === "deco") {
    return [
      `<g opacity="${mode === "dark" ? 0.55 : 0.34}" stroke="${c[1]}" stroke-width="2.4" stroke-linecap="square">${shapeTag(line(64, 18, 64, 34))}${shapeTag(line(47, 23, 54, 37))}${shapeTag(line(81, 23, 74, 37))}${shapeTag(line(36, 106, 92, 106))}</g>`,
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": 13,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        opacity: mode === "dark" ? 0.55 : 0.4,
      }, random, { transform: "scale(.9) translate(7 7)" }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#main)",
        "stroke-width": 8.6,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        filter: "url(#softShadow)",
      }, random, { transform: "scale(.9) translate(7 7)" }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[3],
        "stroke-width": 1.7,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        opacity: 0.85,
      }, random, { transform: "scale(.74) translate(22 22)" }),
    ].join("");
  }

  if (pack.renderer === "opera") {
    return [
      `<path d="M27 33C42 22 89 22 101 37C92 33 82 35 77 42C69 34 56 34 49 42C44 35 35 33 27 33Z" fill="${c[2]}" opacity="${mode === "dark" ? 0.32 : 0.2}"/>`,
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": 17,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.55 : 0.45,
      }, random, { transform: `rotate(${rotate * 0.5} 64 64) scale(.9) translate(7 7)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#main)",
        "stroke-width": 12,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        filter: "url(#softShadow)",
      }, random, { transform: `rotate(${rotate * 0.5} 64 64) scale(.9) translate(7 7)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[3],
        "stroke-width": 2.7,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: 0.9,
      }, random, { transform: `rotate(${rotate * 0.5} 64 64) scale(.95) translate(3 3)` }),
      `<g stroke="${c[3]}" stroke-width="1.5" fill="none" opacity="${mode === "dark" ? 0.75 : 0.58}"><path d="M34 96C48 103 80 103 94 96"/><path d="M42 24C50 31 78 31 86 24"/></g>`,
    ].join("");
  }

  if (pack.renderer === "lace") {
    return [
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": mode === "day" ? 9.8 : 8.6,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.52 : 0.48,
        filter: "url(#softShadow)",
      }, random, { transform: "scale(.91) translate(6.3 6.3)" }),
      renderRawElements(elements, {
        fill: "none",
        stroke: mode === "day" ? c[1] : c[3],
        "stroke-width": mode === "day" ? 4.9 : 4.4,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }, random, { transform: "scale(.91) translate(6.3 6.3)" }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[0],
        "stroke-width": 1.35,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-dasharray": "1 7",
        opacity: mode === "dark" ? 0.92 : 0.72,
      }, random, { transform: "scale(.91) translate(6.3 6.3)" }),
      dotRow(32, 30, 96, 30, 9, c[3], 2.1, mode === "dark" ? 0.78 : 0.5),
      dotRow(34, 99, 94, 99, 8, c[1], 1.7, mode === "dark" ? 0.55 : 0.38),
    ].join("");
  }

  if (pack.renderer === "postal") {
    return [
      `<path d="M28 34L94 28L102 94L36 102Z" fill="${c[2]}" opacity="${mode === "dark" ? 0.26 : 0.55}" filter="url(#softShadow)"/>`,
      `<path d="M74 29L98 48L82 49Z" fill="${c[3]}" opacity="${mode === "dark" ? 0.22 : 0.4}"/>`,
      dotRow(30, 39, 99, 32, 11, c[1], 1.7, 0.65),
      dotRow(35, 102, 101, 94, 11, c[1], 1.7, 0.48),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[0],
        "stroke-width": 6.4,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: 0.95,
      }, random, { transform: `rotate(${rotate * 0.8} 64 64) scale(.82) translate(14 14)`, jitter: 1.1 }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[3],
        "stroke-width": 1.6,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-dasharray": "4 5",
        opacity: mode === "dark" ? 0.65 : 0.5,
      }, random, { transform: `rotate(${rotate * 0.8} 64 64) scale(.82) translate(14 14)` }),
    ].join("");
  }

  if (pack.renderer === "mystic") {
    return [
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": 13,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.5 : 0.42,
      }, random, { transform: `rotate(${rotate} 64 64) scale(.91) translate(6 6)`, jitter: 2.8 }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#main)",
        "stroke-width": 8.7,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-dasharray": "19 3 6 4",
        filter: "url(#softShadow)",
      }, random, { transform: `rotate(${rotate} 64 64) scale(.91) translate(6 6)`, jitter: 2.2 }),
      `<path d="M34 31C48 22 55 37 42 46C31 54 27 69 40 79" fill="none" stroke="${c[4]}" stroke-width="2.2" opacity="${mode === "dark" ? 0.72 : 0.46}"/>`,
      `<path d="M91 92C78 102 67 92 76 82C84 73 100 75 101 62" fill="none" stroke="${c[3]}" stroke-width="2.2" opacity="${mode === "dark" ? 0.6 : 0.38}"/>`,
      Array.from({ length: 12 }, () => `<circle cx="${28 + random() * 72}" cy="${27 + random() * 78}" r="${0.9 + random() * 1.5}" fill="${random() > 0.5 ? c[3] : c[4]}" opacity="${mode === "dark" ? 0.72 : 0.5}"/>`).join(""),
    ].join("");
  }

  if (pack.renderer === "funhaus") {
    return [
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": 18,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.38 : 0.25,
      }, random, { transform: `rotate(${rotate} 64 64) scale(.88) translate(9 9)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#diagonalStripes)",
        "stroke-width": 14,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        filter: "url(#softShadow)",
      }, random, { transform: `rotate(${rotate} 64 64) scale(.88) translate(9 9)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[3],
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: 0.85,
      }, random, { transform: `rotate(${rotate} 64 64) scale(.72) translate(25 25)` }),
      `<path d="M28 31C44 21 85 22 100 34" fill="none" stroke="${c[1]}" stroke-width="5" stroke-linecap="round" opacity="${mode === "dark" ? 0.8 : 0.55}"/>`,
    ].join("");
  }

  if (pack.renderer === "field") {
    return [
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": 13,
        "stroke-linecap": "butt",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.4 : 0.34,
      }, random, { transform: `rotate(${rotate * 0.4} 64 64) scale(.88) translate(9 9)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#main)",
        "stroke-width": 9,
        "stroke-linecap": "butt",
        "stroke-linejoin": "round",
        "stroke-dasharray": "28 5",
        filter: "url(#softShadow)",
      }, random, { transform: `rotate(${rotate * 0.4} 64 64) scale(.88) translate(9 9)` }),
      `<g fill="none" stroke="${c[3]}" stroke-width="1.3" opacity="${mode === "dark" ? 0.55 : 0.36}"><path d="M28 42C44 34 52 52 68 43C84 34 89 47 105 40"/><path d="M25 72C42 62 52 79 68 70C83 61 91 74 105 67"/><path d="M31 98C48 89 62 105 83 91"/></g>`,
      `<g fill="${c[3]}" opacity="${mode === "dark" ? 0.68 : 0.52}"><circle cx="34" cy="35" r="2"/><circle cx="98" cy="93" r="2"/><circle cx="101" cy="37" r="1.7"/></g>`,
    ].join("");
  }

  if (pack.renderer === "weave") {
    return [
      renderRawElements(elements, {
        fill: "none",
        stroke: c[3],
        "stroke-width": 16,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: mode === "dark" ? 0.42 : 0.35,
      }, random, { transform: `scale(.87) translate(9.5 9.5)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#weavePattern)",
        "stroke-width": 13,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        filter: "url(#softShadow)",
      }, random, { transform: `scale(.87) translate(9.5 9.5)` }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[1],
        "stroke-width": 2.2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-dasharray": "2 7",
        opacity: mode === "dark" ? 0.85 : 0.62,
      }, random, { transform: `scale(.87) translate(9.5 9.5)` }),
      dotRow(35, 28, 94, 36, 8, c[2], 2.4, 0.82),
      dotRow(32, 102, 98, 93, 9, c[0], 2.1, 0.75),
    ].join("");
  }

  if (pack.renderer === "glitch") {
    return [
      renderRawElements(elements, {
        fill: "none",
        stroke: c[1],
        "stroke-width": 9.5,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        opacity: mode === "dark" ? 0.72 : 0.58,
      }, random, { transform: "translate(-4 2) scale(.9) translate(7 7)" }),
      renderRawElements(elements, {
        fill: "none",
        stroke: c[2],
        "stroke-width": 9.5,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        opacity: mode === "dark" ? 0.7 : 0.58,
      }, random, { transform: "translate(4 -2) scale(.9) translate(7 7)" }),
      renderRawElements(elements, {
        fill: "none",
        stroke: "url(#main)",
        "stroke-width": 7,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        filter: "url(#softShadow)",
      }, random, { transform: `rotate(${rotate * 0.55} 64 64) scale(.9) translate(7 7)`, jitter: 1.4 }),
      Array.from({ length: 4 }, (_, i) => {
        const y = 34 + i * 17 + random() * 6;
        const x = 27 + random() * 26;
        const w = 24 + random() * 33;
        return `<rect x="${x}" y="${y}" width="${w}" height="${2.6 + random() * 3}" rx="1" fill="${i % 2 ? c[1] : c[2]}" opacity="${mode === "dark" ? 0.86 : 0.72}"/>`;
      }).join(""),
      `<path d="M26 102L101 24" stroke="${c[3]}" stroke-width="1.6" opacity="${mode === "dark" ? 0.55 : 0.38}"/>`,
    ].join("");
  }

  throw new Error(`Unknown renderer for ${pack.id}`);
}

function iconSvg(pack, mode, target) {
  const body = renderByPack(pack, mode, target);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" role="img" aria-label="${esc(pack.name)} ${esc(target.label)} icon">
    <title>${esc(pack.name)} ${esc(target.label)} ${mode}</title>
    ${iconDefs(pack, mode)}
    <g>
      ${body}
    </g>
  </svg>`;
}

async function renderIcon(pack, mode, target, outPath) {
  const svg = iconSvg(pack, mode, target);
  await sharp(Buffer.from(svg))
    .resize(ICON_SIZE, ICON_SIZE, { fit: "contain" })
    .png()
    .toFile(outPath);
}

function bgSvg(width, height, color) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`);
}

function textSvg(width, height, text, x, y, size, fill, weight = 600) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${x}" y="${y}" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text></svg>`);
}

async function iconThumb(filePath, size) {
  return sharp(filePath)
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
}

async function makeFullContactSheet(pack, mode, targets) {
  const cols = 10;
  const cell = 92;
  const labelHeight = 36;
  const pad = 24;
  const rows = Math.ceil(targets.length / cols);
  const width = cols * cell + pad * 2;
  const height = rows * cell + labelHeight + pad * 2;
  const background = mode === "dark" ? "#0B1016" : "#F5F7FA";
  const text = mode === "dark" ? "#EFF6FF" : "#111827";
  const composites = [
    { input: textSvg(width, height, `${pack.name} / ${mode.toUpperCase()}`, pad, 30, 18, text, 700), top: 0, left: 0 },
  ];
  for (const [index, target] of targets.entries()) {
    const x = pad + (index % cols) * cell + 14;
    const y = pad + labelHeight + Math.floor(index / cols) * cell + 6;
    composites.push({
      input: await iconThumb(path.join(PACK_ROOT, pack.id, mode, `${target.assetId}.png`), 64),
      top: y,
      left: x,
    });
  }
  await sharp(bgSvg(width, height, background))
    .composite(composites)
    .png()
    .toFile(path.join(REVIEW_ROOT, `${pack.id}-${mode}-contact.png`));
}

async function makeDnaPreview(pack) {
  const width = 1220;
  const height = 330;
  const card = "#111418";
  const composites = [
    { input: textSvg(width, height, pack.name, 28, 36, 24, "#F8FAFC", 780), top: 0, left: 0 },
    { input: textSvg(width, height, pack.concept, 28, 64, 15, "#AEB7C4", 500), top: 0, left: 0 },
    { input: textSvg(width, height, "DAY", 30, 120, 13, "#64748B", 700), top: 0, left: 0 },
    { input: textSvg(width, height, "DARK", 30, 220, 13, "#94A3B8", 700), top: 0, left: 0 },
  ];
  const stripSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" rx="20" fill="${card}"/>
    <rect x="22" y="88" width="${width - 44}" height="74" rx="14" fill="#F6F8FB" stroke="#E5EAF1"/>
    <rect x="22" y="188" width="${width - 44}" height="74" rx="14" fill="#0B111A" stroke="#273244"/>
  </svg>`;
  composites.unshift({ input: Buffer.from(stripSvg), top: 0, left: 0 });
  for (let row = 0; row < 2; row += 1) {
    const mode = row === 0 ? "day" : "dark";
      const y = row === 0 ? 96 : 196;
    for (const [index, assetId] of SAMPLE_ASSETS.entries()) {
      const x = 120 + index * 128;
      composites.push({
        input: await iconThumb(path.join(PACK_ROOT, pack.id, mode, `${assetId}.png`), 58),
        top: y,
        left: x,
      });
    }
  }
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(REVIEW_ROOT, `${pack.id}-dna-preview.png`));
}

async function makeOverview() {
  const tileW = 620;
  const tileH = 230;
  const cols = 2;
  const rows = Math.ceil(DNA.length / cols);
  const pad = 26;
  const width = cols * tileW + pad * (cols + 1);
  const height = rows * tileH + pad * (rows + 1) + 70;
  const composites = [
    { input: textSvg(width, height, "Pinterest 2026 Icon Pack Redesign", pad, 42, 26, "#F8FAFC", 780), top: 0, left: 0 },
    { input: textSvg(width, height, "Same navigation targets, different visual worlds: silhouette, material, texture, and lighting are pack-specific.", pad, 68, 15, "#AEB7C4", 500), top: 0, left: 0 },
  ];

  for (const [index, pack] of DNA.entries()) {
    const x = pad + (index % cols) * (tileW + pad);
    const y = pad + 70 + Math.floor(index / cols) * (tileH + pad);
    const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">
      <rect x="0" y="0" width="${tileW}" height="${tileH}" rx="16" fill="#12161B" stroke="#2A323D"/>
      <text x="20" y="31" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="18" font-weight="750" fill="#F8FAFC">${esc(pack.name)}</text>
      <text x="20" y="55" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12" font-weight="500" fill="#AEB7C4">${esc(pack.sourceTrends.join(" + "))}</text>
      <rect x="18" y="74" width="${tileW - 36}" height="56" rx="11" fill="#F6F8FB" stroke="#E5EAF1"/>
      <rect x="18" y="148" width="${tileW - 36}" height="56" rx="11" fill="#0B111A" stroke="#273244"/>
      <text x="32" y="107" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" font-weight="700" fill="#64748B">DAY</text>
      <text x="32" y="181" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" font-weight="700" fill="#94A3B8">DARK</text>
    </svg>`;
    composites.push({ input: Buffer.from(tileSvg), top: y, left: x });
    for (let row = 0; row < 2; row += 1) {
      const mode = row === 0 ? "day" : "dark";
      const iconY = y + (row === 0 ? 80 : 154);
      for (const [sampleIndex, assetId] of SAMPLE_ASSETS.entries()) {
        composites.push({
          input: await iconThumb(path.join(PACK_ROOT, pack.id, mode, `${assetId}.png`), 42),
          top: iconY,
          left: x + 92 + sampleIndex * 62,
        });
      }
    }
  }

  await sharp(bgSvg(width, height, "#0B0F14"))
    .composite(composites)
    .png()
    .toFile(path.join(REVIEW_ROOT, "pinterest-2026-packs-overview.png"));
}

async function readTargets() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.targets) || manifest.targets.length !== 50) {
    throw new Error(`Expected 50 manifest targets, found ${manifest.targets?.length ?? "none"}`);
  }
  return manifest.targets.map((target) => ({
    assetId: target.assetId,
    label: target.label ?? target.assetId,
    targetType: target.targetType,
    targetId: target.targetId,
  }));
}

async function writeReceipts(pack, targets) {
  const receipt = {
    executionState: "real_generation_completed",
    generationMethod:
      "Procedural SVG-to-PNG render with pack-specific silhouette, material, texture, lighting, and construction rules; transparent PNG output.",
    id: pack.id,
    name: pack.name,
    sourceTrends: pack.sourceTrends,
    concept: pack.concept,
    visualDNA: {
      spirit: pack.spirit,
      shapeLanguage: pack.shapeLanguage,
      materialTexture: pack.materialTexture,
      iconConstruction: pack.iconConstruction,
      dayModePaletteAndContrast: pack.dayStrategy,
      darkModePaletteAndContrast: pack.darkStrategy,
      distinctIconShapeRules: pack.shapeRules,
      semanticMetaphorRules:
        "Primary app destinations use pack-native objects, not shared base glyph silhouettes. Remaining subnavigation keeps page meaning while inheriting the pack material system.",
      mustAvoid: pack.avoid,
    },
    semanticMetaphorMap: Object.fromEntries(
      targets.map((target) => [
        target.assetId,
        {
          label: target.label,
          metaphor: metaphorLabelForAsset(target.assetId, pack.id),
        },
      ]),
    ),
    targetCount: targets.length,
    modes: ["day", "dark"],
    assets: {
      day: `/images/liquid-icons/pack-c/packs/${pack.id}/day`,
      dark: `/images/liquid-icons/pack-c/packs/${pack.id}/dark`,
    },
    contactSheets: [
      `/images/liquid-icons/pack-c/review/${pack.id}-day-contact.png`,
      `/images/liquid-icons/pack-c/review/${pack.id}-dark-contact.png`,
      `/images/liquid-icons/pack-c/review/${pack.id}-dna-preview.png`,
    ],
  };
  await fs.writeFile(
    path.join(PACK_ROOT, pack.id, `${pack.id.toUpperCase().replaceAll("-", "_")}_RECEIPT.json`),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  return receipt;
}

async function writeMasterReceipt(receipts) {
  const receipt = {
    executionState: "real_generation_completed",
    sourceDocument: "/Users/ouxianxing/Desktop/IDPC/SRT/Pinterest Predicts 2026 Trend Report.pdf",
    generationMethod:
      "Semantic-metaphor procedural SVG-to-PNG pack generation. Unlike the previous Lucide-like recolor set, each pack has separate object metaphors, silhouette grammar, material stack, texture rules, and day/dark lighting strategy.",
    semanticContract:
      "Every target keeps its existing navigation meaning; primary destinations are re-metaphored per pack while preserving transparent backgrounds and label-free icons.",
    targets: 50,
    modes: ["day", "dark"],
    totalPngFiles: receipts.length * 2 * 50,
    packs: receipts,
    overview: "/images/liquid-icons/pack-c/review/pinterest-2026-packs-overview.png",
    validationContract: [
      "50 PNGs per pack/mode.",
      "Transparent PNG output with alpha channel.",
      "No outer badge, circle frame, or full-canvas tile.",
      "Day and Dark share identity but use separate contrast and glow.",
      "Contact sheets use the same sample icons across modes.",
    ],
  };
  await fs.writeFile(
    path.join(PACK_ROOT, "PINTEREST_2026_PACKS_RECEIPT.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
}

async function main() {
  const targets = await readTargets();
  await fs.mkdir(REVIEW_ROOT, { recursive: true });
  const receipts = [];

  for (const pack of DNA) {
    for (const mode of ["day", "dark"]) {
      const dir = path.join(PACK_ROOT, pack.id, mode);
      await fs.mkdir(dir, { recursive: true });
      await Promise.all(
        targets.map((target) => renderIcon(pack, mode, target, path.join(dir, `${target.assetId}.png`))),
      );
      await makeFullContactSheet(pack, mode, targets);
    }
    await makeDnaPreview(pack);
    receipts.push(await writeReceipts(pack, targets));
    console.log(`regenerated ${pack.id}`);
  }

  await makeOverview();
  await writeMasterReceipt(receipts);
  console.log(`completed ${DNA.length} packs x 2 modes x ${targets.length} icons`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
