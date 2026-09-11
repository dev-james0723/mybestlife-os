const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
  });
  module._compile(result.outputText, filename);
};
const c = require('../src/lib/mind-council/room-contract.ts');
const { buildCouncilScenePrompt } = require('../src/lib/mind-council/room-scene-prompt.ts');
const advisors = ['Steve Jobs','Elon Musk','Warren Buffett','Beyoncé'].map((name, i) => ({ id: `a${i}`, name, subtitle: 'Test' }));
const user = { id:'u', turn_id:'turn', kind:'user', advisor_id:null, display_name:'You', content:'What do you think of each other?', step:0, created_at:'2026-09-11T00:00:00Z' };
const makeMessage = (value, step) => ({ ...user, id:`m${step.step}`, kind:'advisor', advisor_id:step.advisorId, display_name:step.advisorId, content:value, step:step.step });

test('requires two to four distinct advisors at the shared boundary', () => {
  assert.deepEqual(c.requireAdvisorIds(['a','b','c','d']), ['a','b','c','d']);
  for (const ids of [[],['a'],['a','b','c','d','e'],['a','a'],['a',42]]) assert.throws(() => c.requireAdvisorIds(ids));
});
test('bounded text and UUID validation rejects malformed input', () => {
  assert.equal(c.requireText('  question  ', 20), 'question');
  assert.throws(() => c.requireText(' '.repeat(10),20)); assert.throws(() => c.requireText('x'.repeat(21),20));
  assert.equal(c.requireUuid('0e3b201c-984a-478f-a5bf-45b606f678fc'), '0e3b201c-984a-478f-a5bf-45b606f678fc');
  assert.throws(() => c.requireUuid("' or true --"));
});
test('multiple @mentions route in order, not roster order', () => {
  assert.deepEqual(c.mentionedAdvisorIds('@Beyoncé @Elon Musk, discuss your work.', advisors), ['a3','a1']);
  assert.deepEqual(c.mentionedAdvisorIds('@Elon Musk @Elon Musk', advisors), ['a1']);
});
test('mentions support case, Unicode accents and Chinese punctuation', () => {
  assert.deepEqual(c.mentionedAdvisorIds('@beyoncé， @STEVE JOBS。',advisors), ['a3','a0']);
  assert.deepEqual(c.mentionedAdvisorIds('@Beyonce\u0301',advisors), ['a3']);
});
test('partial names and email addresses do not silently address advisors', () => {
  assert.deepEqual(c.mentionedAdvisorIds('user@Elon Musk and @Elon Musketeer',advisors), []);
  assert.deepEqual(c.mentionedAdvisorIds('@Elon',advisors), []);
});
test('longest matching full name wins over a shorter overlapping name', () => {
  assert.deepEqual(c.mentionedAdvisorIds('@Ann Lee hello',[{id:'short',name:'Ann'},{id:'long',name:'Ann Lee'}]),['long']);
});
test('Everyone removes mentions but retains the question and email', () => {
  assert.equal(c.removeMentions('@Elon Musk @Beyoncé What next? contact x@example.com', advisors), 'What next? contact x@example.com');
});
test('two rounds are bounded to eight contributions and one advisor never debates itself', () => {
  assert.equal(c.meetingOrder(['a','b','c','d'],true).length,8);
  assert.equal(c.meetingOrder(['a'],true).length,1);
  assert.deepEqual(c.meetingOrder(['a','b'],false).map((s)=>s.round),[1,1]);
  assert.throws(()=>c.meetingOrder(['a','a'],true));
});
for (const count of [2,3,4]) test(`${count} image-relative profile anchors remain inside the scene`, () => {
  const anchors=c.seatAnchors(count); assert.equal(anchors.length,count);
  assert.ok(anchors.every((a)=>a.x>0 && a.x<1 && a.y>0 && a.y<1));
  assert.ok(anchors.every((a,i)=>!i || a.x>anchors[i-1].x));
});
for (const template of c.SCENE_TEMPLATES) test(`${template} prompt includes only selected advisors and an occupied back-view chair`, () => {
  const prompt=buildCouncilScenePrompt(advisors,template);
  for (const a of advisors) assert.ok(prompt.includes(a.name));
  assert.match(prompt,/Exactly 4 selected advisors/); assert.match(prompt,/MUST NOT be empty/);
  assert.match(prompt,/viewed strictly from BEHIND/); assert.match(prompt,/No table or desk/);
  assert.match(prompt,/No visible face, no likeness reference/); assert.match(prompt,/No cartoon, no SVG/);
});
test('context is bounded without mutating the stored transcript', () => {
  const history=Array.from({length:100},(_,i)=>({...user,id:String(i),content:'x'.repeat(9000)}));
  const text=c.meetingContext(history,'Elon Musk',2);
  const pack=JSON.parse(text.split('TRANSCRIPT_JSON:\n')[1]);
  assert.equal(pack.length,48); assert.ok(pack.every((m)=>m.text.length===8000)); assert.equal(history.length,100);
});
test('each advisor sees previous replies, including the other advisor before its response round', async () => {
  const seen=[]; const emitted=[];
  const result=await c.executeMeeting({ids:['a','b'],exchange:true,history:[user],completed:[],signal:new AbortController().signal,
    status:()=>{},message:(m)=>emitted.push(m),
    generate:async(step,history)=>{seen.push({step,heard:history.map((m)=>m.content)}); return `${step.advisorId}${step.round}`;},
    persist:async(value,step)=>makeMessage(value,step),
  });
  assert.equal(result.length,5); assert.equal(emitted.length,4);
  assert.deepEqual(seen[1].heard,[user.content,'a1']); assert.deepEqual(seen[2].heard,[user.content,'a1','b1']);
  assert.deepEqual(seen[3].heard,[user.content,'a1','b1','a2']);
});
test('retry resumes unfinished steps rather than charging for completed contributions',async()=>{
  const called=[]; const existing=[user,makeMessage('a1',{advisorId:'a',step:1}),makeMessage('b1',{advisorId:'b',step:2})];
  await c.executeMeeting({ids:['a','b'],exchange:true,history:existing,completed:[1,2],signal:new AbortController().signal,status:()=>{},message:()=>{},
    generate:async(step)=>{called.push(step.step);return 'resume';},persist:async(v,s)=>makeMessage(v,s)});
  assert.deepEqual(called,[3,4]); assert.equal(existing.length,3);
});
test('storage must succeed before emitting a reply or asking the next advisor',async()=>{
  let called=0, emitted=0;
  await assert.rejects(c.executeMeeting({ids:['a','b'],exchange:true,history:[user],completed:[],signal:new AbortController().signal,status:()=>{},message:()=>emitted++,
    generate:async()=>{called++;return 'reply';},persist:async()=>{throw new Error('storage failed');}}));
  assert.equal(called,1);assert.equal(emitted,0);
});
test('an interrupted turn preserves its completed contribution and stops further calls',async()=>{
  const abort=new AbortController();let called=0;const emitted=[];
  await assert.rejects(c.executeMeeting({ids:['a','b'],exchange:true,history:[user],completed:[],signal:abort.signal,status:()=>{},
    message:(m)=>{emitted.push(m);abort.abort();},generate:async()=>{called++;return 'reply';},persist:async(v,s)=>makeMessage(v,s)}));
  assert.equal(called,1);assert.equal(emitted.length,1);
});
test('all feature TypeScript and TSX files pass syntactic compilation',()=>{
  const root=path.resolve(__dirname,'..');
  const files=[
    'src/lib/mind-council/room-contract.ts','src/lib/mind-council/room-copy.ts','src/lib/mind-council/room-scene-prompt.ts','src/lib/mind-council/room-providers.ts','src/lib/mind-council/room-server.ts',
    'src/components/mind-council/CouncilRoom.tsx','src/components/mind-council/CouncilScene.tsx','src/components/mind-council/CouncilWorkspace.tsx','src/components/mind-council/mind-council-experience.tsx',
    'src/app/api/mind-council/rooms/route.ts','src/app/api/mind-council/rooms/[roomId]/route.ts','src/app/api/mind-council/rooms/[roomId]/scene/route.ts','src/app/api/mind-council/rooms/[roomId]/turn/route.ts',
  ];
  for (const file of files) {
    const result=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{fileName:file,reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
    assert.deepEqual((result.diagnostics||[]).filter((d)=>d.category===ts.DiagnosticCategory.Error),[],file);
  }
});
