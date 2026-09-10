
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
