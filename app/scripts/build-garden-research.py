"""Build the local Garden research brief without remote assets or dependencies."""
from pathlib import Path
import html
import re

root = Path(__file__).resolve().parents[2]
folder = root / "docs/garden-research/v2"
source = (folder / "report-source.md").read_text()

def inline(value):
    value = html.escape(value)
    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', value)
    value = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", value)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", value)

lines = source.splitlines()
blocks, toc, paragraph = [], [], []
def flush():
    if paragraph:
        blocks.append("<p>" + inline(" ".join(paragraph)) + "</p>")
        paragraph.clear()

i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith("# "):
        i += 1
        continue
    if line.startswith("## "):
        flush()
        label = line[3:]
        anchor = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
        toc.append((anchor, label))
        blocks.append(f'<h2 id="{anchor}">{inline(label)}</h2>')
    elif line.startswith("| "):
        flush()
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            values = [x.strip() for x in lines[i].strip("|").split("|")]
            if not all(re.fullmatch(r"[-: ]+", x) for x in values):
                tag = "th" if not rows else "td"
                rows.append("<tr>" + "".join(f"<{tag}>{inline(x)}</{tag}>" for x in values) + "</tr>")
            i += 1
        blocks.append('<div class="table-scroll"><table>' + "".join(rows) + "</table></div>")
        continue
    elif re.match(r"\d+\. ", line):
        flush()
        items = []
        while i < len(lines) and re.match(r"\d+\. ", lines[i]):
            items.append("<li>" + inline(re.sub(r"^\d+\. ", "", lines[i])) + "</li>")
            i += 1
        blocks.append("<ol>" + "".join(items) + "</ol>")
        continue
    elif not line.strip():
        flush()
    else:
        paragraph.append(line)
    i += 1
flush()
nav = "".join(f'<a href="#{anchor}"><span>{n:02}</span>{html.escape(label)}</a>' for n, (anchor, label) in enumerate(toc, 1))
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A garden worth entering — My Best Life OS research</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#edf0e8;color:#243b30;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.8}a{color:#47703d;text-underline-offset:4px}header{max-width:1180px;margin:auto;padding:72px 40px 58px;border-bottom:1px solid #cbd5c4}.eyebrow{font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:650}h1{font:500 clamp(44px,7vw,82px)/1.06 Georgia,serif;letter-spacing:-.06em;max-width:800px;margin:24px 0}header p{max-width:630px;color:#637365;font-size:17px}.badge{display:inline-block;padding:5px 12px;background:#d9e8c7;border:1px solid #c3d5ad;border-radius:30px;font-size:11px;margin-top:15px}.layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:48px;max-width:1180px;padding:45px 40px 90px;margin:auto}nav{position:sticky;top:28px;align-self:start;display:grid;gap:18px;font-size:11px;line-height:1.5}nav a{text-decoration:none;display:flex;gap:12px;color:#687968}nav span{font-size:9px;opacity:.7}article{min-width:0}h2{font:500 29px/1.25 Georgia,serif;letter-spacing:-.025em;scroll-margin-top:30px;margin:50px 0 18px}article h2:first-of-type{margin-top:25px}p{margin:0 0 20px}article>p:first-child{font-size:11px;color:#7b8578;letter-spacing:.02em}strong{font-weight:650}ol{padding-left:22px}li{padding-left:9px;margin:16px 0}table{border-collapse:collapse;min-width:740px;width:100%;font-size:12px;line-height:1.7;text-align:left}td,th{padding:17px 15px;border-bottom:1px solid #d3dccb;vertical-align:top}th{font-size:10px;letter-spacing:.04em;background:#dfe7d6;font-weight:650}td:first-child{width:18%;font-weight:600}tr:nth-child(odd) td{background:#f3f6ee}.table-scroll{overflow:auto;margin:28px -12px}footer{padding:28px 40px;text-align:center;border-top:1px solid #cbd5c4;font-size:10px;letter-spacing:.05em;color:#6e7b68}code{font-size:12px;background:#e0e6d9;padding:2px 5px;border-radius:4px}@media(max-width:780px){header{padding:40px 24px}.layout{grid-template-columns:1fr;padding:24px;gap:14px}nav{position:static;display:flex;overflow:auto;gap:20px;padding-bottom:16px;border-bottom:1px solid #cbd5c4}nav a{min-width:115px}h2{font-size:26px}.table-scroll{margin-inline:0}body{font-size:14px}}@media print{body{background:#fff}nav{display:none}.layout{display:block;padding:10px}header{padding:20px 10px}h1{font-size:42px}table{min-width:0;font-size:9px}.table-scroll{overflow:visible}tr{break-inside:avoid}a{color:inherit}h2{break-after:avoid}}
</style><header><div class="eyebrow">My Best Life OS / Garden research / 02</div><h1>A garden<br>worth entering.</h1><p>From a garden to look at, to a little world to play in. Research, design choices, and the evidence we still need.</p><span class="badge">8 September 2026 · Primary-source brief</span></header><main class="layout"><nav aria-label="Report contents">NAV</nav><article>CONTENT</article></main><footer>Research informs the design. Retention improvement must be measured after release.</footer></html>'''.replace("NAV", nav).replace("CONTENT", "\n".join(blocks))
(folder / "garden-adventure-research.html").write_text(page)
assert len(toc) == 5
assert "<table>" in page and "<ol>" in page and "3.3%" in page
print(f"Built {folder / 'garden-adventure-research.html'}; {len(toc)} sections, {page.count('<a ')} links.")
