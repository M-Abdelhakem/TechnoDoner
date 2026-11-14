// Berlin Bears 3D kit — copied read-only from bears.html (main game) so the trailer matches its look.
(function () {
const BPM = 128;
function rr(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function circ(c,x,y,r,f){c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=f;c.fill()}
const ORD='mltogh';
const NAMES={m:'Fleisch',l:'Salat',t:'Tomate',o:'Zwiebel',g:'Knoblauch',h:'Scharf','+':'Ja!','-':'Nein!','?':'Hä?',w:'Moment'};
function drawItem(c,it,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);
 if(it==='L'){circ(c,0,0,15,'#4fae35');circ(c,-5,-4,9,'#6fd24c');circ(c,6,3,6,'#3f8f2a')}
 else if(it==='l'){for(let i=0;i<6;i++){c.fillStyle=i%2?'#6fd24c':'#3f8f2a';rr(c,-16+i*5.5,-8+(i%3)*4,7,13,3);c.fill()}}
 else if(it==='T'){circ(c,0,0,14,'#e8402f');circ(c,-5,-5,4,'#ff8a70');c.fillStyle='#2f8f2a';c.fillRect(-4,-17,8,6)}
 else if(it==='t'){[-10,0,10].forEach(dx=>{circ(c,dx,2,8,'#e8402f');circ(c,dx,2,4.5,'#ff9a80')})}
 else if(it==='O'){c.fillStyle='#b77ccf';c.beginPath();c.ellipse(0,2,13,14,0,0,7);c.fill();c.fillStyle='#e9d1f2';c.fillRect(-2,-16,4,7)}
 else if(it==='o'){c.strokeStyle='#c58bd6';c.lineWidth=3.5;[-8,7].forEach(dx=>{c.beginPath();c.arc(dx,2,8,0,7);c.stroke()})}
 else if(it==='m'){for(let i=0;i<4;i++){c.fillStyle=i%2?'#a85d33':'#7a3e1f';rr(c,-15+i*2,-10+i*5,28,6,3);c.fill()}}
 else if(it==='g'){c.fillStyle='#f4f1e6';rr(c,-8,-14,16,26,4);c.fill();c.fillStyle='#bbb';c.fillRect(-2,-20,4,7);c.fillStyle='#7a6';c.fillRect(-8,-4,16,6)}
 else if(it==='h'){c.fillStyle='#e0262a';rr(c,-8,-14,16,26,4);c.fill();c.fillStyle='#ffd';c.fillRect(-2,-20,4,7);c.fillStyle='#7a1010';c.fillRect(-8,-4,16,6)}
 else if(it&&it[0]==='D'){const k=it.slice(1);c.fillStyle='#c98b45';c.beginPath();c.ellipse(0,5,22,15,0,0,7);c.fill();c.fillStyle='#e9b872';c.beginPath();c.ellipse(0,1,19,11,0,0,7);c.fill();
  const cols={m:'#8a4b2a',l:'#5fbf3f',t:'#e8402f',o:'#c58bd6'};let i=0;for(const ch of k)if(cols[ch]){circ(c,-11+i*7.5,-2,5.5,cols[ch]);i++}
  if(k.includes('g')){c.strokeStyle='#fff';c.lineWidth=2.5;c.beginPath();c.moveTo(-13,-7);for(let q=0;q<6;q++)c.lineTo(-13+q*5,q%2?-2:-8);c.stroke()}
  if(k.includes('h')){c.strokeStyle='#ff2a2a';c.lineWidth=2.5;c.beginPath();c.moveTo(-13,2);for(let q=0;q<6;q++)c.lineTo(-13+q*5,q%2?6:1);c.stroke()}}
 c.restore()}
function drawSignIcon(c,k,x,y,s=1){if('mltogh'.includes(k)){drawItem(c,k==='l'||k==='t'||k==='o'?k.toUpperCase():k,x,y,s);return}
 c.save();c.translate(x,y);c.scale(s,s);c.textAlign='center';c.textBaseline='middle';
 if(k==='+'||k==='-'){c.fillStyle=k==='+'?'#3fbf5f':'#e04040';circ(c,0,0,17,c.fillStyle);c.strokeStyle='#fff';c.lineWidth=5;c.lineCap='round';c.beginPath();if(k==='+'){c.moveTo(-8,0);c.lineTo(-2,7);c.lineTo(9,-7)}else{c.moveTo(-7,-7);c.lineTo(7,7);c.moveTo(7,-7);c.lineTo(-7,7)}c.stroke()}
 else{circ(c,0,0,17,k==='?'?'#7a5cff':'#ffb238');c.fillStyle='#fff';c.font='22px Bungee, sans-serif';c.fillText(k==='?'?'?':'…',0,2)}
 c.restore()}
function paw(c,x,y,r,col,rot=0){c.save();c.translate(x,y);c.rotate(rot);circ(c,0,0,r,col);[-.9,-.3,.3,.9].forEach(a=>circ(c,Math.sin(a)*r*1.05,-Math.cos(a)*r*1.05,r*.38,col));circ(c,0,r*.15,r*.5,'#0002');c.restore()}
function drawBearFace(c,x,y,r,kind,t){const body=kind?'#efe6d2':'#8b5a33',muz=kind?'#fffaf0':'#c8956a';
 circ(c,x-r*.72,y-r*.72,r*.42,body);circ(c,x+r*.72,y-r*.72,r*.42,body);circ(c,x-r*.72,y-r*.72,r*.22,'#0003');circ(c,x+r*.72,y-r*.72,r*.22,'#0003');
 circ(c,x,y,r,body);circ(c,x,y+r*.35,r*.42,muz);circ(c,x,y+r*.2,r*.15,'#1a1010');
 const blink=(t%4)<.12;c.fillStyle='#1a1010';if(blink){c.fillRect(x-r*.42,y-r*.15,r*.22,3);c.fillRect(x+r*.2,y-r*.15,r*.22,3)}else{circ(c,x-r*.32,y-r*.12,r*.1,'#1a1010');circ(c,x+r*.32,y-r*.12,r*.1,'#1a1010')}
 if(kind===0){c.fillStyle='#d8322b';c.beginPath();c.arc(x,y-r*.35,r*.95,Math.PI*1.05,Math.PI*1.95);c.fill();c.fillRect(x-r*.2,y-r*.62,r*1.15,r*.18)}
 else{c.fillStyle='#22b0a2';c.fillRect(x-r,y-r*.62,r*2,r*.3);circ(c,x+r,y-r*.48,r*.2,'#22b0a2')}}
const SPECIES=['fox','raccoon','boar','rabbit','pigeon'];
function drawCustomer(c,x,y,r,seed,t,pose,mood){const sp=SPECIES[seed%5];const col={fox:'#e07b2a',raccoon:'#8f8f9a',boar:'#7a5236',rabbit:'#ece2d6',pigeon:'#8796b0'}[sp];
 const bob=Math.sin(t*Math.PI*2*BPM/60)*r*.05;y+=bob+(pose==='D'?r*.15:0);
 // shoulders
 c.fillStyle=['#3b2a7a','#1d6f6a','#7a1d4f','#2a2a2a','#5a3a1a'][(seed>>3)%5];c.beginPath();c.ellipse(x,y+r*1.55,r*1.35,r*.8,0,Math.PI,0);c.fill();
 // arms by pose
 const A={U:[[-.85,-1.2],[.85,-1.2]],L:[[-1.6,-.2],[.9,.9]],R:[[-.9,.9],[1.6,-.2]],D:[[-1.2,1.1],[1.2,1.1]]}[pose]||[[-1.15,1.05],[1.15,1.05]];
 A.forEach(a=>paw(c,x+a[0]*r,y+a[1]*r,r*.28,col));
 if(sp==='rabbit'){[-1,1].forEach(s=>{c.fillStyle=col;c.beginPath();c.ellipse(x+s*r*.35,y-r*1.2,r*.18,r*.55,s*.15,0,7);c.fill()})}
 else if(sp==='fox'){[-1,1].forEach(s=>{c.fillStyle=col;c.beginPath();c.moveTo(x+s*r*.85,y-r*1.15);c.lineTo(x+s*r*.25,y-r*.7);c.lineTo(x+s*r*.95,y-r*.35);c.fill()})}
 else if(sp!=='pigeon'){circ(c,x-r*.7,y-r*.7,r*.3,col);circ(c,x+r*.7,y-r*.7,r*.3,col)}
 circ(c,x,y,r,col);
 if(sp==='raccoon'){c.fillStyle='#2a2a33';rr(c,x-r*.75,y-r*.32,r*1.5,r*.38,r*.18);c.fill()}
 if(sp==='fox')circ(c,x,y+r*.42,r*.38,'#fff3e6');
 if(sp==='boar'){circ(c,x,y+r*.35,r*.34,'#c48a66');circ(c,x-r*.12,y+r*.35,r*.07,'#5a3020');circ(c,x+r*.12,y+r*.35,r*.07,'#5a3020');c.fillStyle='#fff';c.fillRect(x-r*.45,y+r*.25,r*.08,r*.25);c.fillRect(x+r*.37,y+r*.25,r*.08,r*.25)}
 if(sp==='pigeon'){c.fillStyle='#f2b33a';c.beginPath();c.moveTo(x-r*.15,y+r*.15);c.lineTo(x+r*.15,y+r*.15);c.lineTo(x,y+r*.42);c.fill();c.fillStyle='#4fbf9a88';c.fillRect(x-r*.8,y+r*.6,r*1.6,r*.25)}
 if(sp==='rabbit')circ(c,x,y+r*.3,r*.12,'#f08aa0');
 const eyeC=sp==='raccoon'?'#fff':'#141018';circ(c,x-r*.33,y-r*.15,r*.11,eyeC);circ(c,x+r*.33,y-r*.15,r*.11,eyeC);
 if(mood>.66){c.strokeStyle='#141018';c.lineWidth=r*.07;c.beginPath();c.moveTo(x-r*.5,y-r*.42);c.lineTo(x-r*.15,y-r*.3);c.moveTo(x+r*.5,y-r*.42);c.lineTo(x+r*.15,y-r*.3);c.stroke()}
 // accessory
 const acc=(seed>>2)%4;if(acc===1){c.fillStyle='#111';rr(c,x-r*.62,y-r*.3,r*.5,r*.26,5);c.fill();rr(c,x+r*.12,y-r*.3,r*.5,r*.26,5);c.fill();c.fillRect(x-r*.15,y-r*.22,r*.3,r*.06)}
 if(acc===2){c.fillStyle='#ff4fa8';c.beginPath();c.arc(x,y-r*.45,r*.92,Math.PI,0);c.fill();c.fillStyle='#ffd23f';c.fillRect(x-r*.92,y-r*.5,r*1.84,r*.14)}
 if(acc===3){circ(c,x+r*.95,y+r*.1,r*.1,'#ffd23f')}}
function bar(c,x,y,w,h,v,col){c.fillStyle='#000a';rr(c,x,y,w,h,h/2);c.fill();c.fillStyle=col;rr(c,x,y,Math.max(h,w*Math.max(0,Math.min(1,v))),h,h/2);c.fill()}
const ARROW={U:'↑',D:'↓',L:'←',R:'→'};
const VW=960,VH=540;

// ================= 3D kit (early PS2 look) =================
const LOW_W=480,LOW_H=270;
function tex(w,h,fn,rep){const cv=document.createElement('canvas');cv.width=w;cv.height=h;fn(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}return t}
const lam=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}));
const basic=(c,o)=>new THREE.MeshBasicMaterial(Object.assign({color:c},o||{}));
function M(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);return m}
const GEO={box:(w,h,d)=>new THREE.BoxGeometry(w,h,d),sph:(r,s=8)=>new THREE.SphereGeometry(r,s,Math.max(4,Math.round(s*.7))),cyl:(a,b,h,s=8)=>new THREE.CylinderGeometry(a,b,h,s),cone:(r,h,s=6)=>new THREE.ConeGeometry(r,h,s)};
const TEX={};
function getTex(name){if(TEX[name])return TEX[name];let t;
 if(name==='tiles')t=tex(32,32,(c)=>{c.fillStyle='#145a5e';c.fillRect(0,0,32,32);for(let i=0;i<2;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#2a9a9c':'#22858a';c.fillRect(i*16+1,j*16+1,14,14);c.fillStyle='#ffffff30';c.fillRect(i*16+5,j*16+5,6,6)}},[10,6]);
 else if(name==='steel')t=tex(32,32,(c)=>{c.fillStyle='#a7b0bd';c.fillRect(0,0,32,32);for(let i=0;i<60;i++){c.fillStyle=Math.random()<.5?'#bcc4cf':'#8f99a8';c.fillRect(Math.random()*32|0,Math.random()*32|0,2,1)}},[6,2]);
 else if(name==='wood')t=tex(32,32,(c)=>{c.fillStyle='#b77b4a';c.fillRect(0,0,32,32);for(let y=0;y<32;y+=4){c.fillStyle=y%8?'#a86d3e':'#c48a58';c.fillRect(0,y,32,2)}},[4,1]);
 else if(name==='clubfloor')t=tex(16,16,(c)=>{for(let i=0;i<2;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#2a0c3a':'#120618';c.fillRect(i*8,j*8,8,8)}},[24,24]);
 else if(name==='neon')t=tex(128,32,(c)=>{c.fillStyle='#000';c.fillRect(0,0,128,32);c.font='20px Bungee, Impact, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ffb238';c.fillText('DÖNER',64,17)});
 else if(name==='soft')t=tex(32,32,(c)=>{const g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,32,32)});
 else if(name.startsWith('sign:'))t=tex(64,64,(c)=>{c.fillStyle='#fff';c.beginPath();c.arc(32,32,31,0,7);c.fill();c.lineWidth=3;c.strokeStyle='#1a1020';c.stroke();drawSignIcon(c,name.slice(5),32,33,1.3)});
 return TEX[name]=t}
function makeItem(code){const g=new THREE.Group();if(!code)return g;
 const add=(geo,c,x,y,z,sx,sy,sz)=>{const m=M(geo,lam(c),x,y,z);if(sx)m.scale.set(sx,sy,sz);g.add(m);return m};
 if(code==='L'){add(GEO.sph(.07,7),0x4fae35,0,.06,0);add(GEO.sph(.045,6),0x6fd24c,-.03,.1,.02)}
 else if(code==='l'){for(let i=0;i<5;i++)add(GEO.box(.035,.018,.09),i%2?0x6fd24c:0x3f8f2a,-.08+i*.04,.012,(i%2)*.02)}
 else if(code==='T'){add(GEO.sph(.062,7),0xe8402f,0,.062,0);add(GEO.box(.03,.02,.03),0x2f8f2a,0,.13,0)}
 else if(code==='t'){for(let i=0;i<3;i++)add(GEO.cyl(.042,.042,.014,8),0xe8402f,-.08+i*.08,.01,0)}
 else if(code==='O'){add(GEO.sph(.062,7),0xb77ccf,0,.068,0,1,1.15,1);add(GEO.cone(.02,.05,5),0xe9d1f2,0,.15,0)}
 else if(code==='o'){for(let i=0;i<2;i++){const m=add(new THREE.TorusGeometry(.045,.012,4,10),0xc58bd6,-.05+i*.1,.014,0);m.rotation.x=Math.PI/2}}
 else if(code==='m'){for(let i=0;i<3;i++){const m=add(GEO.box(.13,.018,.04),i%2?0xa85d33:0x7a3e1f,0,.01+i*.014,-.035+i*.035);m.rotation.y=i*.45}}
 else if(code==='g'||code==='h'){add(GEO.cyl(.035,.04,.17,8),code==='g'?0xf4f1e6:0xe0262a,0,.085,0);add(GEO.cone(.02,.05,6),code==='g'?0xcccccc:0xffffdd,0,.195,0);add(GEO.cyl(.041,.041,.04,8),code==='g'?0x77aa66:0x7a1010,0,.08,0)}
 else if(code[0]==='D'){const k=code.slice(1);add(GEO.sph(.11,8),0xc98b45,0,.03,0,1.02,.32,.72);add(GEO.sph(.105,8),0xe9b872,0,.045,0,1,.36,.66);
  const cols={m:0x8a4b2a,l:0x5fbf3f,t:0xe8402f,o:0xc58bd6};let i=0;for(const ch of k)if(cols[ch]){add(GEO.sph(.03,5),cols[ch],-.06+i*.04,.08,(i%2)*.02-.01);i++}
  if(k.includes('g'))add(GEO.box(.17,.008,.014),0xffffff,0,.105,-.012);if(k.includes('h'))add(GEO.box(.17,.008,.014),0xff2020,0,.108,.014)}
 return g}
function makeBear(kind){const g=new THREE.Group();const body=kind?0xefe6d2:0x8b5a33,muz=kind?0xfffaf0:0xc8956a;
 g.add(M(GEO.sph(.42,9),lam(body),0,.45,0));g.add(M(GEO.box(.44,.4,.1),lam(0xffffff),0,.42,.36));
 const head=new THREE.Group();head.position.set(0,1.0,0);g.add(head);
 head.add(M(GEO.sph(.3,9),lam(body)));[-1,1].forEach(s=>head.add(M(GEO.sph(.1,6),lam(body),s*.22,.22,0)));
 head.add(M(GEO.sph(.12,7),lam(muz),0,-.07,.25));head.add(M(GEO.sph(.045,5),lam(0x1a1010),0,-.03,.36));
 [-1,1].forEach(s=>head.add(M(GEO.sph(.035,5),lam(0x111111),s*.11,.06,.27)));
 if(kind===0){head.add(M(new THREE.SphereGeometry(.315,9,4,0,Math.PI*2,0,Math.PI/2),lam(0xd8322b),0,.06,0));head.add(M(GEO.box(.3,.03,.2),lam(0xd8322b),0,.07,.3))}
 else head.add(M(GEO.cyl(.31,.31,.08,10),lam(0x22b0a2),0,.12,0));
 const pL=M(GEO.sph(.12,6),lam(body),-.42,.5,.25),pR=M(GEO.sph(.12,6),lam(body),.42,.5,.25);g.add(pL,pR);
 const plac=makePlacard();plac.position.set(.42,1.25,.3);plac.visible=false;g.add(plac);
 g.userData={head,pL,pR,plac};return g}
function makePlacard(){const g=new THREE.Group();const disk=M(new THREE.CircleGeometry(.24,12),basic(0xffffff,{map:getTex('sign:+'),transparent:true}));g.add(disk);g.add(M(GEO.cyl(.02,.02,.3,5),lam(0x8a5530),0,-.36,-.01));g.userData.disk=disk;g.userData.code='+';return g}
function setPlacard(p,code){if(p.userData.code!==code){p.userData.code=code;p.userData.disk.material.map=getTex('sign:'+code);p.userData.disk.material.needsUpdate=true}}
function makeCustomer(seed){const sp=SPECIES[seed%5];const col={fox:0xe07b2a,raccoon:0x8f8f9a,boar:0x7a5236,rabbit:0xece2d6,pigeon:0x8796b0}[sp];
 const g=new THREE.Group(),mats=[];const L=c=>{const m=lam(c);mats.push(m);return m};const add=(geo,c,x,y,z)=>{const m=M(geo,L(c),x,y,z);g.add(m);return m};
 const sh=add(GEO.sph(.4,8),[0x3b2a7a,0x1d6f6a,0x7a1d4f,0x2a2a2a,0x5a3a1a][(seed>>3)%5],0,-.55,0);sh.scale.set(1.3,.8,.8);
 add(GEO.sph(.3,9),col,0,0,0);
 if(sp==='rabbit')[-1,1].forEach(s=>{const e=add(GEO.sph(.11,6),col,s*.11,.4,0);e.scale.set(.6,1.9,.6)});
 else if(sp==='fox'){[-1,1].forEach(s=>add(GEO.cone(.1,.2,4),col,s*.17,.3,0)) ;add(GEO.sph(.12,6),0xfff3e6,0,-.09,.23)}
 else if(sp!=='pigeon')[-1,1].forEach(s=>add(GEO.sph(.1,6),col,s*.22,.22,0));
 if(sp==='raccoon')add(GEO.box(.44,.09,.06),0x2a2a33,0,.05,.26);
 if(sp==='boar'){const s=add(GEO.cyl(.1,.1,.1,8),0xc48a66,0,-.07,.3);s.rotation.x=Math.PI/2;[-1,1].forEach(q=>add(GEO.cone(.02,.08,4),0xffffff,q*.12,-.15,.27))}
 if(sp==='pigeon'){const b=add(GEO.cone(.05,.14,5),0xf2b33a,0,-.04,.34);b.rotation.x=Math.PI/2;const n=add(new THREE.TorusGeometry(.2,.04,4,10),0x4fbf9a,0,-.27,0);n.rotation.x=Math.PI/2}
 if(sp==='rabbit')add(GEO.sph(.035,5),0xf08aa0,0,-.04,.29);
 [-1,1].forEach(s=>add(GEO.sph(.04,5),sp==='raccoon'?0xffffff:0x141018,s*.11,.06,.27));
 const acc=(seed>>2)%4;if(acc===1)add(GEO.box(.42,.08,.04),0x111111,0,.07,.29);if(acc===2){add(new THREE.SphereGeometry(.315,9,4,0,Math.PI*2,0,Math.PI/2),0xff4fa8,0,.05,0)}if(acc===3)add(GEO.sph(.03,4),0xffd23f,.3,-.06,0);
 const pL=add(GEO.sph(.095,6),col,-.4,-.5,.15),pR=add(GEO.sph(.095,6),col,.4,-.5,.15);
 g.userData={mats,pL,pR};return g}
const POSES={U:[[-.3,.42,.12],[.3,.42,.12]],L:[[-.65,.02,.1],[.34,-.45,.15]],R:[[-.34,-.45,.15],[.65,.02,.1]],D:[[-.48,-.62,.2],[.48,-.62,.2]]};
function poseCustomer(g,pose){const p=POSES[pose]||[[-.4,-.5,.18],[.4,-.5,.18]];g.userData.pL.position.set(...p[0]);g.userData.pR.position.set(...p[1])}
window.BBK = { BPM, rr, circ, ORD, NAMES, drawItem, drawSignIcon, paw, drawBearFace, drawCustomer, bar, ARROW, VW, VH, LOW_W, LOW_H,
  tex, lam, basic, M, GEO, getTex, makeItem, makeBear, makePlacard, setPlacard, makeCustomer, poseCustomer, POSES, SPECIES };
})();
