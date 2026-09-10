import {spawnSync} from "node:child_process";
import {writeFileSync} from "node:fs";
const reports=[];
for(const [script,args,dir] of [["verify-sky-garden.mjs",[],"release-sky"],["verify-sky-garden-mobile.mjs",[],"release-mobile"],["verify-garden-pet-ui.mjs",[],"release-pets"],["verify-sky-garden-adventure.mjs",["full"],"release-expedition"]]) {
 const env={...process.env,SKY_VERIFY_OUT:`../artifacts/sky-garden/${dir}`,GARDEN_VERIFY_OUT:`../artifacts/sky-garden/${dir}`,GARDEN_VERIFY_MODE:"optimized"};
 const result=spawnSync(process.execPath,[`scripts/${script}`,...args],{env,encoding:"utf8",maxBuffer:16*1024*1024});
 writeFileSync(`../artifacts/sky-garden/${dir}.log`,`${result.stdout??""}\n${result.stderr??""}`);reports.push({script,dir,status:result.status});
 console.log(JSON.stringify(reports.at(-1)));if(result.status!==0)break;
}
writeFileSync("../artifacts/sky-garden/release-results.json",JSON.stringify(reports,null,2));if(reports.length!==4||reports.some(r=>r.status!==0))process.exitCode=1;
