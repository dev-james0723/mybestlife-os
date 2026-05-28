/**
 * Emits SQL to set cardVisual.imageUrl as inline SVG data URLs (no storage upload).
 * Run: node scripts/generate-idea-visual-backfill-sql.mjs > /tmp/idea-visual-backfill.sql
 */
import { writeFileSync } from "node:fs";

const ideas = [
  { id: "44eb1d75-df10-41f0-84c6-8cda0949d783", label: "I want to g" },
  { id: "4120135d-5b80-4c53-bf22-7b748aa8f01c", label: "如果" },
  { id: "5ee26d81-3d0a-4639-abca-5dc9949b76cb", label: "I want to d" },
  { id: "0acfe4db-e2df-4d48-91e6-eea0abe59de3", label: "Coffee shop" },
  { id: "ca81a8b7-05df-4163-8161-21c2c7b70910", label: "Concert poster" },
  { id: "e8896bd9-d9e3-4fc0-a91d-5bc866bf365a", label: "Onboarding" },
  { id: "550f0f00-7166-445f-84bc-e883f25d500f", label: "正常人" },
  { id: "d49605ca-a6bf-4918-8fa0-c9688b444939", label: "講就易" },
  { id: "cc4cd0e3-66c3-4ac1-81c7-a656bb488c9f", label: "Link idea" },
  { id: "8fc583fd-905b-44fc-ae41-fc3eb78018ea", label: "覺醒" },
  { id: "74d1c176-162b-4d46-9c4f-5dea70bff3a8", label: "年收百萬" },
  { id: "04119835-b111-43a1-94e9-9c677a11b5c8", label: "To-Do List" },
  { id: "24810219-adfb-432d-a45c-e983f907bf28", label: "討厭的人" },
  { id: "e3074ebf-b20a-4ae3-ba55-70a25a20daa2", label: "商標同名" },
  { id: "70a6b55e-2d71-46d9-be34-fa5ee3c6b411", label: "USPTO品牌" },
  { id: "02876098-c41a-454e-9421-fd817b263d4b", label: "USPTO品牌2" },
  { id: "2ccfca19-1c8f-451b-b0e2-60ee8349c629", label: "Question" },
  { id: "1c08026a-61a0-4f1f-9a36-ca53b2cf2e57", label: "Shut" },
  { id: "910e1ea8-507e-4bcd-8cf2-59e2ea5c0edc", label: "Hooded scarf" },
];

function defaultPalette(seed) {
  const palettes = [
    ["#7dd3fc", "#fdba74", "#6366f1"],
    ["#a5b4fc", "#fbcfe8", "#38bdf8"],
    ["#86efac", "#fde68a", "#60a5fa"],
    ["#c4b5fd", "#fda4af", "#7dd3fc"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

function buildSvg(title, palette) {
  const [top, mid, bottom] = palette;
  const label = title.slice(0, 24).replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${top}"/><stop offset="55%" stop-color="${mid}"/><stop offset="100%" stop-color="${bottom}"/></linearGradient></defs><rect width="480" height="640" fill="url(#bg)"/><path d="M 120 120 A 120 120 0 0 1 360 120" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/><text x="240" y="560" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="500" letter-spacing="0.2em" fill="rgba(255,255,255,0.72)">${label}</text></svg>`;
}

const valueRows = ideas.map(({ id, label }) => {
  const palette = defaultPalette(label);
  const b64 = Buffer.from(buildSvg(label, palette)).toString("base64");
  const dataUrl = `data:image/svg+xml;base64,${b64}`;
  return `('${id}'::uuid, '${dataUrl.replace(/'/g, "''")}')`;
});

const sql = `-- Backfill idea card thumbnails (inline SVG data URLs)
UPDATE ideas AS i SET
  ai_suggestions = COALESCE(i.ai_suggestions, '{}'::jsonb) || jsonb_build_object(
    'cardVisual', COALESCE(i.ai_suggestions->'cardVisual', '{}'::jsonb) || jsonb_build_object(
      'imageUrl', v.image_url,
      'model', 'placeholder-svg',
      'styleVersion', 'gradient-v1',
      'generatedAt', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'error', null
    )
  ),
  updated_at = now()
FROM (
  VALUES
    ${valueRows.join(",\n    ")}
) AS v(id, image_url)
WHERE i.id = v.id;
`;

writeFileSync(new URL("./idea-visual-backfill.sql", import.meta.url), sql);
console.log(sql);
