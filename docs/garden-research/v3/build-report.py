"""Render the design documents locally; no packages, remote assets or app changes."""
from pathlib import Path
import html
import re

ROOT = Path(__file__).resolve().parent

def inline(text):
    text = html.escape(text)
    # Workspace references remain clickable in Markdown; do not publish source files via the local report server.
    text = re.sub(r'\[([^\]]+)\]\((\.\./[^)]+)\)', lambda m: '<span title="本機程式／文件引用，請由 Markdown 原稿開啟">' + m[1] + ' <code>' + m[2] + '</code></span>', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="' + m[2].replace('repo-audit.md', 'repo-audit.html').replace('sources.md', 'sources.html').replace('proposal.zh-TW.md', 'index.html').replace('current-review.zh-TW.md', 'current-review.html').replace('implementation-update.zh-TW.md', 'implementation.html').replace('habit-calendar.md', 'habit-calendar.html') + '">' + m[1] + '</a>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', text)

def render(source):
    lines = source.splitlines()
    blocks, nav, para = [], [], []
    def flush():
        if para:
            blocks.append('<p>' + inline(' '.join(para)) + '</p>')
            para.clear()
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('# '):
            i += 1
            continue
        if line.startswith('## '):
            flush()
            anchor = 'section-' + str(len(nav) + 1)
            nav.append((anchor, line[3:]))
            blocks.append(f'<h2 id="{anchor}">{inline(line[3:])}</h2>')
        elif line.startswith('### '):
            flush()
            blocks.append('<h3>' + inline(line[4:]) + '</h3>')
        elif line.startswith('|'):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                values = [x.strip() for x in lines[i].strip('|').split('|')]
                if not all(re.fullmatch('[-: ]+', x) for x in values):
                    tag = 'th' if not rows else 'td'
                    rows.append('<tr>' + ''.join(f'<{tag}>{inline(x)}</{tag}>' for x in values) + '</tr>')
                i += 1
            blocks.append('<div class="table-wrap" tabindex="0" role="region" aria-label="可橫向捲動的對照表"><table>' + ''.join(rows) + '</table></div>')
            continue
        elif re.match(r'\d+\. ', line):
            flush()
            items = []
            while i < len(lines) and re.match(r'\d+\. ', lines[i]):
                items.append('<li>' + inline(re.sub(r'^\d+\. ', '', lines[i])) + '</li>')
                i += 1
            blocks.append('<ol>' + ''.join(items) + '</ol>')
            continue
        elif not line.strip():
            flush()
        else:
            para.append(line)
        i += 1
    flush()
    return '\n'.join(blocks), nav

CSS = '''
:root{--ink:#253c35;--muted:#5b7066;--paper:#eff2e8;--line:#ccd7c6;--accent:#caef85;--pond:#abcfc7}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.85 -apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC",sans-serif}a{color:#396245;text-underline-offset:4px;overflow-wrap:anywhere}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible,a:focus-visible,[tabindex]:focus-visible{outline:3px solid #3c725e;outline-offset:4px}header{padding:56px 6vw 40px;border-bottom:1px solid var(--line)}.overline{font-size:11px;letter-spacing:.15em;color:var(--muted)}h1{font:500 clamp(36px,5vw,68px)/1.25 "Songti TC",Georgia,serif;max-width:920px;margin:22px 0}header p{max-width:680px}.tag{display:inline-block;border:1px solid #b9c9a9;background:#e2edce;border-radius:25px;padding:5px 14px;font-size:12px}.tabs{display:flex;flex-wrap:wrap;gap:10px 24px;margin-top:28px;font-size:13px}.tabs a{padding:5px 0}.layout{max-width:1360px;margin:auto;display:grid;grid-template-columns:220px minmax(0,1fr);gap:48px;padding:44px 5vw 80px}nav{position:sticky;top:20px;max-height:90vh;overflow:auto;align-self:start;font-size:12px;line-height:1.6;display:grid;gap:13px;padding-right:10px}nav a{text-decoration:none;color:var(--muted)}article{min-width:0;max-width:980px}h2{font:600 28px/1.5 "Songti TC",Georgia,serif;margin:55px 0 20px;scroll-margin-top:24px;padding-top:12px;border-top:1px solid var(--line)}h3{font-size:19px;margin:30px 0 15px}p{margin:0 0 20px}li{margin:12px 0;padding-left:5px}strong{font-weight:650}code{font-size:.83em;background:#e0e8d9;border-radius:4px;padding:2px 4px;overflow-wrap:anywhere}.table-wrap{overflow:auto;max-width:100%;margin:25px 0}table{border-collapse:collapse;min-width:760px;width:100%;font-size:13px;line-height:1.8}th,td{padding:15px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{background:#dfe8d6;font-size:12px}tr:nth-child(odd) td{background:#f7f8f2}td:first-child{font-weight:600;min-width:105px}footer{border-top:1px solid var(--line);padding:24px 6vw;font-size:12px;color:var(--muted)}.diagram{max-width:1140px;margin:38px auto 0;padding:24px 32px;border:1px solid var(--line);border-radius:26px;background:#f8f9f3}.diagram h2{border:0;margin:0;padding:0}.diagram>p{font-size:14px;color:var(--muted);margin-top:12px}.loop{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;padding:0;list-style:none;font-size:13px}.loop li{border-left:2px solid #a0bc89;padding:8px 14px;margin:4px 0}.loop b{display:block;font-size:11px;color:var(--muted)}.demo{display:grid;grid-template-columns:minmax(230px,1fr) minmax(220px,1fr);gap:28px;margin-top:24px}.tools{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.tools button,.test-button{min-height:44px;padding:7px 12px;background:#f9faf5;border:1px solid #b8cbb6;border-radius:12px;font-size:13px}.tools button[aria-pressed=true]{background:var(--accent);border-color:#6c9652}.pond-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;padding:15px;background:#71938b;border:9px solid #cbd7bd;border-radius:26px;min-height:252px}.pond-grid button{min-width:0;min-height:58px;background:var(--pond);border:1px solid #d4e4dc;border-radius:14px;font-size:13px;line-height:1.35}.pond-grid button[data-kind=reed]{background:#8baa68}.pond-grid button[data-kind=leaf]{background:#c6d995}.pond-grid button[data-kind=stone]{background:#d4d6c9}.pond-grid button[data-kind=perch]{background:#d7bc92}.pond-grid button small{display:block;font-size:10px;opacity:.72}.rules{padding:12px 0}.rules p{margin:14px 0;padding-bottom:14px;border-bottom:1px solid var(--line);font-size:14px}.rules strong{display:block}.test-button{background:var(--accent);font-weight:600}.note{font-size:12px;color:var(--muted)}.status{min-height:55px;margin-top:12px;font-size:13px}details{margin:16px 0}summary{cursor:pointer;min-height:44px;padding:8px 0}summary::marker{color:#5f8751}
@media(max-width:800px){header{padding:32px 22px}.layout{grid-template-columns:1fr;gap:14px;padding:22px}nav{position:static;display:flex;gap:22px;max-height:none;padding-bottom:14px;border-bottom:1px solid var(--line)}nav a{min-width:140px}h2{font-size:24px}body{font-size:15px}.diagram{margin:22px;border-radius:20px;padding:20px}.loop{grid-template-columns:1fr}.loop li{padding:3px 10px}.demo{grid-template-columns:1fr;gap:12px}.pond-grid{padding:10px;gap:5px;min-height:240px}.pond-grid button{min-height:56px}.tools{gap:6px}.tools button{padding:6px 9px}}
@media(max-width:400px){.diagram{margin:16px;padding:16px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{header{padding:15px}h1{font-size:34px}.layout{display:block;padding:15px}nav,.tools,.test-button,.tabs{display:none}.diagram{margin:15px}table{min-width:0;font-size:9px}.table-wrap{overflow:visible}tr{break-inside:avoid}h2,h3{break-after:avoid}body{background:#fff;font-size:11px}a{color:inherit}}
'''

DEMO = '''<section class="diagram" aria-labelledby="design-demo-title"><span class="overline">DESIGN MODEL · 只作規則討論</span><h2 id="design-demo-title">換個位置，世界便有不同反應。</h2><p>這是 2D 配置規則示意。選一種物件，再點池塘位置；比較通道、相鄰岸草與遮蔭。沒有連接帳戶，不模擬建設卡數量、育成時間或正式區域解鎖。</p><ol class="loop"><li><b>01 生活</b>完成自己選的一步</li><li><b>02 回饋</b>取得一個建設機會</li><li><b>03 遊玩</b>配置、試驗、觀察</li><li><b>04 世界</b>留下永久物件與發現</li><li><b>05 下一步</b>選擇繼續生活或遊玩</li></ol><div class="demo"><div><div class="tools" aria-label="配置工具"><button data-tool="empty" aria-pressed="false">留水面</button><button data-tool="reed" aria-pressed="true">岸草</button><button data-tool="leaf" aria-pressed="false">浮葉</button><button data-tool="stone" aria-pressed="false">導流石</button><button data-tool="perch" aria-pressed="false">棲息點</button></div><div class="pond-grid" aria-label="池塘配置位置"></div><div class="tools"><button id="layout-a">試看：開放水道</button><button id="layout-b">試看：遮蔭灣</button><button id="reset-demo">重設示意</button></div></div><div class="rules"><p id="fish-rule"></p><p id="snail-rule"></p><p id="dragonfly-rule"></p><button class="test-button" id="observe-demo">模擬一次觀察</button><div class="status" role="status" aria-live="polite" id="demo-status">先選位置，再看看哪種行為具備條件。</div><p class="note">已發現的動物會留在示意的圖鑑紀錄；改差配置只影響目前條件，不會刪除成果。導流石此處僅代表阻擋格，正式方向旋轉／流向仍需遊戲原型驗證。</p></div></div></section>'''

JS = '''
const labels={empty:'水面',reed:'岸草',leaf:'浮葉',stone:'石頭',perch:'棲息點'};
let tool='reed', layout=['reed','','','','','stone','','','','','',''], known=new Set();
const adjacent=i=>[i-4,i+4,...(i%4?[i-1]:[]),...(i%4<3?[i+1]:[])].filter(x=>x>=0&&x<12);
function assessPond(cells,seen){
 const open=i=>cells[i]===''||cells[i]==='empty';
 let max=0, visited=new Set();
 for(let i=0;i<12;i++){if(!open(i)||visited.has(i))continue;let q=[i];visited.add(i);let count=0;while(q.length){let a=q.pop();count++;for(const n of adjacent(a))if(open(n)&&!visited.has(n)){visited.add(n);q.push(n)}}max=Math.max(max,count)}
 const reedPair=cells.some((c,i)=>c==='reed'&&adjacent(i).some(n=>cells[n]==='reed')&&adjacent(i).some(open));
 return {fish:max>=3,snail:reedPair,dragonfly:seen.has('fish')&&seen.has('snail')&&cells.includes('perch')&&cells.includes('leaf')&&cells.filter((_,i)=>open(i)).length>=2,max};
}
function refreshPond(){
 const grid=document.querySelector('.pond-grid');grid.replaceChildren();
 layout.forEach((kind,i)=>{let b=document.createElement('button');b.dataset.kind=kind||'empty';b.setAttribute('aria-label',`${Math.floor(i/4)+1}排${i%4+1}格，${labels[kind||'empty']}`);b.innerHTML=`${labels[kind||'empty']}<small>${Math.floor(i/4)+1} · ${i%4+1}</small>`;b.onclick=()=>{layout[i]=tool==='empty'?'':tool;refreshPond();document.querySelectorAll('.pond-grid button')[i].focus()};grid.append(b)});
 const a=assessPond(layout,known),rules=[['fish','晨光魚',`連接水面 ${a.max} 格，至少需要 3 格`],['snail','葉影螺','兩格相鄰岸草，旁邊留水面'],['dragonfly','藍翅蜻蜓','先觀察魚與螺，再提供棲息點、浮葉及兩格水面']];
 for(const [id,title,detail] of rules){document.getElementById(id+'-rule').textContent='';let strong=document.createElement('strong');strong.textContent=`${a[id]?'條件具備':'尚待配置'} · ${title}${known.has(id)?' · 已記錄':''}`;document.getElementById(id+'-rule').append(strong,detail)}
 document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;refreshPond()});
document.getElementById('observe-demo').onclick=()=>{let a=assessPond(layout,known),found=[];for(const [id,name] of [['fish','晨光魚巡游'],['snail','葉影螺停留'],['dragonfly','蜻蜓起飛']])if(a[id]&&!known.has(id)){known.add(id);found.push(name)};document.getElementById('demo-status').textContent=found.length?'示意紀錄已保留：'+found.join('、')+'。可以換個配置試試。':'這次沒有新發現；已有紀錄保留。可調整棲地再觀察。';refreshPond()};
document.getElementById('layout-a').onclick=()=>{layout=['reed','','','','','stone','','','','','',''];refreshPond()};
document.getElementById('layout-b').onclick=()=>{layout=['reed','reed','','perch','leaf','','stone','','','','',''];refreshPond()};
document.getElementById('reset-demo').onclick=()=>{known.clear();layout=['reed','','','','','stone','','','','','',''];document.getElementById('demo-status').textContent='示意已重設，沒有改動任何正式帳戶。';refreshPond()};
refreshPond();
'''

for src, dest, title in [('proposal.zh-TW.md','index.html','讓生活，留下風景。'),('repo-audit.md','repo-audit.html','能力與缺口，先看事實。'),('sources.md','sources.html','研究能告訴我們什麼？'),('current-review.zh-TW.md','current-review.html','下一步，活水魚塘。'),('implementation-update.zh-TW.md','implementation.html','花園，正在成形。'),('habit-calendar.md','habit-calendar.html','同一次行動，同一份成果。')]:
    body, toc = render((ROOT/src).read_text())
    nav=''.join(f'<a href="#{key}">{html.escape(label)}</a>' for key,label in toc)
    page='<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' · My Garden 系統設計</title><style>'+CSS+'</style></head><body><header><div class="overline">MY BEST LIFE OS / MY GARDEN / NEXT CHAPTER</div><h1>'+title+'</h1><p>一個可以探索、培育與建造的家園。生活給你機會，選擇與遊玩讓世界真正改變。</p><span class="tag">研究與設計 · 候選能力另列 · 8 Sep 2026</span><div class="tabs"><a href="implementation.html">最新實作進度</a><a href="current-review.html">最新決策與 repo</a><a href="index.html">完整方案</a><a href="repo-audit.html">能力與資料審計</a><a href="sources.html">案例與來源</a><a href="proposal.zh-TW.md">Markdown 原稿</a></div></header>'+(DEMO if dest=='index.html' else '')+'<main class="layout"><nav aria-label="文件目錄">'+nav+'</nav><article>'+body+'</article></main><footer>研究與設計提案 · 本頁沒有連接帳戶或更動正式遊戲 · 所有效益與效能數值都需實測驗證</footer>'+('<script>'+JS+'</script>' if dest=='index.html' else '')+'</body></html>'
    (ROOT/dest).write_text(page)
    print(f'{dest}: {len(toc)} sections, {len(page)} characters')

(ROOT/'pond-demo.js').write_text(JS)
