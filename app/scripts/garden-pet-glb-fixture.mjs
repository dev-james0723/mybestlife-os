import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
/** Test-only authored geometry, never presented as a generated personal pet. */
export async function petGlbFixture() {
 const before=globalThis.FileReader;
 globalThis.FileReader=class {readAsArrayBuffer(blob){void blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){void blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString("base64")}`;this.onloadend?.();});}};
 const root=new THREE.Group();root.name="Authored GLB fixture animal - not AI generated";
 const purple=new THREE.MeshStandardMaterial({color:0x966bdb}),cream=new THREE.MeshStandardMaterial({color:0xffe9c5});
 const add=(x,y,z,sx,sy,sz,material=purple)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);root.add(m);};
 add(0,.45,0,.6,.55,.8);add(0,.85,.25,.52,.48,.48);add(-.19,1.12,.25,.14,.3,.17);add(.19,1.12,.25,.14,.3,.17);add(0,.8,.51,.28,.16,.1,cream);for(const x of [-.22,.22])for(const z of [-.25,.25])add(x,.1,z,.14,.26,.17,cream);
 try {return Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true}));}finally{globalThis.FileReader=before;root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});purple.dispose();cream.dispose();}
}
