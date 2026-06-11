'use strict';

const MOVE_SPEED  = 7.0;
const JUMP_VEL    = 9.5;
const GRAVITY     = -26;
const EYE_H       = 1.72;
const FIELD_W     = 68;
const FIELD_L     = 105;
const ENEMY_COUNT = 14;
const FIRE_RATE   = 0.1;

/* ─── Renderer ──────────────────────────────────────────────── */
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.useLegacyLights     = false;

/* ─── Scene + Sky ───────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x8ecae6, 0.007);

(function buildSky() {
  const geo = new THREE.SphereGeometry(280, 32, 18);
  geo.scale(-1, 1, 1);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, Math.min(1, (pos.getY(i) + 280) / 560));
    col[i*3]=0.682-0.38*t; col[i*3+1]=0.839-0.30*t; col[i*3+2]=0.945-0.14*t;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true })));
})();

/* ─── Camera ────────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 300);
camera.position.set(0, EYE_H, 18);
scene.add(camera); // required so gun (camera children) renders

/* ─── Lighting ──────────────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0xffffff, 0.28));
scene.add(new THREE.HemisphereLight(0x87CEEB, 0x4a8c28, 0.65));
const sun = new THREE.DirectionalLight(0xFFF5CC, 2.0);
sun.position.set(55, 85, 45); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -90;
sun.shadow.camera.right = sun.shadow.camera.top = 90;
sun.shadow.camera.far = 280; sun.shadow.bias = -0.0006;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xBBCCFF, 0.35);
fill.position.set(-50, 40, -60); scene.add(fill);
[[-50,30,-70],[50,30,-70],[-50,30,70],[50,30,70]].forEach(([x,y,z]) => {
  const s = new THREE.SpotLight(0xFFF5E0, 0.6, 200, Math.PI/6, 0.4, 1);
  s.position.set(x,y,z); s.target.position.set(0,0,0); scene.add(s); scene.add(s.target);
});

/* ─── Textures ──────────────────────────────────────────────── */
function makeGrassTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const ctx = cv.getContext('2d');
  for (let x = 0; x < 512; x++) {
    ctx.fillStyle = Math.floor(x/32)%2===0 ? '#2a7a2a' : '#357c35';
    ctx.fillRect(x,0,1,512);
  }
  ctx.globalAlpha=0.055;
  for (let i=0;i<600;i++) { ctx.fillStyle=Math.random()>.5?'#000':'#fff'; ctx.fillRect(Math.random()*512,Math.random()*512,Math.random()*3+1,2); }
  ctx.globalAlpha=1;
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(14,18); return t;
}
function makeYellowJerseyTex(n) {
  const cv=document.createElement('canvas'); cv.width=128; cv.height=192;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#FFD700'; ctx.fillRect(0,0,128,192);
  ctx.fillStyle='#B8860B'; ctx.fillRect(44,0,40,18);
  ctx.fillStyle='#1a1000'; ctx.font='bold 58px Arial Black,Arial'; ctx.textAlign='center';
  ctx.fillText(String(n),64,162);
  return new THREE.CanvasTexture(cv);
}
function makeConcreteTex() {
  const cv=document.createElement('canvas'); cv.width=cv.height=256;
  const ctx=cv.getContext('2d'); ctx.fillStyle='#888'; ctx.fillRect(0,0,256,256);
  for (let i=0;i<300;i++) { ctx.fillStyle=`rgba(0,0,0,${Math.random()*.08})`; ctx.fillRect(Math.random()*256,Math.random()*256,Math.random()*6+1,Math.random()*6+1); }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(6,3); return t;
}

const GRASS_TEX    = makeGrassTex();
const CONCRETE_TEX = makeConcreteTex();
const JERSEY_TEXS  = [10,9,7,11,8,6,4,5,2,3,1,17,21,23].map(makeYellowJerseyTex);

/* ─── Materials ─────────────────────────────────────────────── */
const whiteMat = new THREE.MeshStandardMaterial({ color:0xFFFFFF, metalness:.5, roughness:.3 });
const lineMat  = new THREE.MeshBasicMaterial({ color:0xFFFFFF });
const skinMat  = new THREE.MeshLambertMaterial({ color:0xC68642 });
const shortsMat= new THREE.MeshLambertMaterial({ color:0x1a1a00 });
const sockMat  = new THREE.MeshLambertMaterial({ color:0xEEEEEE });
const shoeMat  = new THREE.MeshLambertMaterial({ color:0x1A1008 });
const hairMats = [0x1a0a00,0x2d1506,0x000000,0x3b1f05].map(c=>new THREE.MeshLambertMaterial({color:c}));
const eyeMat   = new THREE.MeshBasicMaterial({ color:0x111111 });
const netMat   = new THREE.MeshBasicMaterial({ color:0xFFFFFF,transparent:true,opacity:.22,side:THREE.DoubleSide,wireframe:true });

/* ─── Ground ────────────────────────────────────────────────── */
const gnd = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W+40,FIELD_L+40), new THREE.MeshLambertMaterial({map:GRASS_TEX}));
gnd.rotation.x=-Math.PI/2; gnd.receiveShadow=true; scene.add(gnd);

/* ─── Field Lines ───────────────────────────────────────────── */
const LW=0.12;
function addLine(x,z,w,d,y=0.016){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),lineMat); m.rotation.x=-Math.PI/2; m.position.set(x,y,z); scene.add(m); }
addLine(0,-FIELD_L/2,FIELD_W,LW); addLine(0,FIELD_L/2,FIELD_W,LW);
addLine(-FIELD_W/2,0,LW,FIELD_L); addLine(FIELD_W/2,0,LW,FIELD_L); addLine(0,0,FIELD_W,LW);
(function(){
  const pts=[]; for(let i=0;i<=80;i++){const a=(i/80)*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a)*9.15,.018,Math.sin(a)*9.15));}
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xFFFFFF})));
  const sp=new THREE.Mesh(new THREE.CircleGeometry(.3,16),lineMat); sp.rotation.x=-Math.PI/2; sp.position.y=.016; scene.add(sp);
})();
[-1,1].forEach(s=>{
  const gz=s*(FIELD_L/2),sg=-s;
  addLine(0,gz+sg*8.25,40.32,LW); addLine(-20.16,gz+sg*4.125,LW,16.5); addLine(20.16,gz+sg*4.125,LW,16.5);
  addLine(0,gz+sg*2.75,18.32,LW); addLine(-9.16,gz+sg*1.375,LW,5.5); addLine(9.16,gz+sg*1.375,LW,5.5);
  const ps=new THREE.Mesh(new THREE.CircleGeometry(.28,12),lineMat); ps.rotation.x=-Math.PI/2; ps.position.set(0,.016,gz+sg*11); scene.add(ps);
});

/* ─── Goals ─────────────────────────────────────────────────── */
function buildGoal(side){
  const r=.065,GW=7.32,GH=2.44,GD=2.2,z=side*FIELD_L/2,sd=side;
  function post(x,y,h,rx,rz){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),whiteMat); m.rotation.x=rx||0; m.rotation.z=rz||0; m.position.set(x,y,z); m.castShadow=true; scene.add(m);}
  post(-GW/2,GH/2,GH,0,0); post(GW/2,GH/2,GH,0,0); post(0,GH,GW,0,Math.PI/2);
  post(-GW/2,GH/2,GD,Math.PI/2+Math.atan2(GD,.001)*sd,0); post(GW/2,GH/2,GD,Math.PI/2+Math.atan2(GD,.001)*sd,0);
  const net=new THREE.Mesh(new THREE.BoxGeometry(GW-.1,GH,GD),netMat); net.position.set(0,GH/2,z+sd*GD/2); scene.add(net);
}
buildGoal(1); buildGoal(-1);

/* ─── Corner Flags ──────────────────────────────────────────── */
[[-FIELD_W/2,-FIELD_L/2],[FIELD_W/2,-FIELD_L/2],[-FIELD_W/2,FIELD_L/2],[FIELD_W/2,FIELD_L/2]].forEach(([x,z])=>{
  const p=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.5,8),new THREE.MeshStandardMaterial({color:0xFFFFFF,metalness:.6,roughness:.3})); p.position.set(x,.75,z); scene.add(p);
  const f=new THREE.Mesh(new THREE.PlaneGeometry(.5,.32),new THREE.MeshBasicMaterial({color:0x74ACDF,side:THREE.DoubleSide})); f.position.set(x+.26,1.46,z); scene.add(f);
});

/* ─── Stands ────────────────────────────────────────────────── */
(function(){
  const cm=new THREE.MeshLambertMaterial({map:CONCRETE_TEX}),ROWS=[0x74ACDF,0xFFFFFF,0x74ACDF,0xFFFFFF,0x74ACDF,0xFFFFFF];
  [{p:[0,FIELD_L/2+20,0],w:FIELD_W+50,d:16,h:22},{p:[0,-FIELD_L/2-20,0],w:FIELD_W+50,d:16,h:22},
   {p:[FIELD_W/2+13,0,0],w:14,d:FIELD_L+12,h:22},{p:[-FIELD_W/2-13,0,0],w:14,d:FIELD_L+12,h:22}
  ].forEach(({p,w,d,h})=>{
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),cm); b.position.set(p[0],h/2,p[2]); b.receiveShadow=b.castShadow=true; scene.add(b);
    const rh=h/ROWS.length; ROWS.forEach((c,i)=>{ const s=new THREE.Mesh(new THREE.BoxGeometry(w-.4,rh-.2,d-.4),new THREE.MeshLambertMaterial({color:c})); s.position.set(p[0],(i+.5)*rh,p[2]); scene.add(s); });
    const rf=new THREE.Mesh(new THREE.BoxGeometry(w+4,1,d+4),new THREE.MeshLambertMaterial({color:0x555555})); rf.position.set(p[0],h+.5,p[2]); rf.castShadow=true; scene.add(rf);
  });
  [[-FIELD_W/2-10,-FIELD_L/2-8],[FIELD_W/2+10,-FIELD_L/2-8],[-FIELD_W/2-10,FIELD_L/2+8],[FIELD_W/2+10,FIELD_L/2+8]].forEach(([x,z])=>{
    const tw=new THREE.Mesh(new THREE.BoxGeometry(1.2,30,1.2),new THREE.MeshLambertMaterial({color:0x888888})); tw.position.set(x,15,z); tw.castShadow=true; scene.add(tw);
    const lp=new THREE.Mesh(new THREE.BoxGeometry(3,1,3),new THREE.MeshLambertMaterial({color:0xaaaaaa})); lp.position.set(x,30.5,z); scene.add(lp);
  });
})();

/* ─── Gun (attached to camera) ──────────────────────────────── */
const GM  = new THREE.MeshStandardMaterial({ color:0x1a1a1a, metalness:.85, roughness:.25 });
const GM2 = new THREE.MeshStandardMaterial({ color:0x111111, metalness:.7,  roughness:.4  });
const gunGroup = new THREE.Group();
const gunBody  = new THREE.Mesh(new THREE.BoxGeometry(.07,.065,.22), GM); gunGroup.add(gunBody);
const barrel   = new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.32,10), GM);
barrel.rotation.x=Math.PI/2; barrel.position.set(0,.008,-.26); gunGroup.add(barrel);
const rail     = new THREE.Mesh(new THREE.BoxGeometry(.025,.018,.18), GM2);
rail.position.set(0,.044,-.02); gunGroup.add(rail);
const mag      = new THREE.Mesh(new THREE.BoxGeometry(.038,.11,.05), GM2);
mag.position.set(0,-.088,.02); mag.rotation.x=-.15; gunGroup.add(mag);
const stock    = new THREE.Mesh(new THREE.BoxGeometry(.055,.042,.09), GM);
stock.position.set(0,-.008,.135); gunGroup.add(stock);
const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(.055,8,6), new THREE.MeshBasicMaterial({color:0xFFDD44,transparent:true,opacity:.9}));
muzzleFlash.position.set(0,.008,-.43); muzzleFlash.visible=false; gunGroup.add(muzzleFlash);
gunGroup.rotation.y = -0.04;
camera.add(gunGroup);
gunGroup.position.set(.26,-.19,-.42);

/* ─── NPC Builder ───────────────────────────────────────────── */
function buildNPC(x, z) {
  const jTex = JERSEY_TEXS[Math.floor(Math.random()*JERSEY_TEXS.length)];
  const group = new THREE.Group();
  group.position.set(x,0,z); group.rotation.y=Math.random()*Math.PI*2;
  const jMat=new THREE.MeshLambertMaterial({map:jTex});
  const hair=hairMats[Math.floor(Math.random()*hairMats.length)];
  function add(geo,mat,px,py,pz,par){ const m=new THREE.Mesh(geo,mat); m.position.set(px,py,pz); m.castShadow=true; (par||group).add(m); return m; }
  function pivot(px,py,pz){ const g=new THREE.Group(); g.position.set(px,py,pz); group.add(g); return g; }
  add(new THREE.BoxGeometry(.13,.08,.25),shoeMat,-.12,.04,.04);
  add(new THREE.BoxGeometry(.13,.08,.25),shoeMat, .12,.04,.04);
  add(new THREE.CylinderGeometry(.072,.065,.27,8),sockMat,-.12,.55,0);
  add(new THREE.CylinderGeometry(.072,.065,.27,8),sockMat, .12,.55,0);
  const lLeg=pivot(-.12,1.04,0), rLeg=pivot(.12,1.04,0);
  const legG=new THREE.CylinderGeometry(.075,.062,.60,8);
  add(legG,shortsMat,0,-.30,0,lLeg); add(legG,shortsMat,0,-.30,0,rLeg);
  add(new THREE.BoxGeometry(.42,.58,.23),jMat,0,1.30,0);
  const lArm=pivot(-.27,1.50,0), rArm=pivot(.27,1.50,0);
  const armG=new THREE.CylinderGeometry(.058,.046,.52,8);
  add(armG,jMat,0,-.26,0,lArm); add(armG,jMat,0,-.26,0,rArm);
  add(new THREE.SphereGeometry(.062,8,6),skinMat,-.27,.99,0);
  add(new THREE.SphereGeometry(.062,8,6),skinMat, .27,.99,0);
  add(new THREE.CylinderGeometry(.076,.076,.11,8),skinMat,0,1.62,0);
  add(new THREE.SphereGeometry(.152,14,12),skinMat,0,1.79,0);
  add(new THREE.SphereGeometry(.160,14,12,0,Math.PI*2,0,Math.PI*.52),hair,0,1.79,0);
  add(new THREE.SphereGeometry(.022,6,5),eyeMat,-.059,1.80,.138);
  add(new THREE.SphereGeometry(.022,6,5),eyeMat, .059,1.80,.138);
  const bm=new THREE.MeshBasicMaterial({color:0x1a0a00});
  add(new THREE.BoxGeometry(.045,.012,.01),bm,-.059,1.836,.144);
  add(new THREE.BoxGeometry(.045,.012,.01),bm, .059,1.836,.144);
  // Hit flash sphere
  const flashSph=new THREE.Mesh(new THREE.SphereGeometry(.55,8,6),new THREE.MeshBasicMaterial({color:0xFF2200,transparent:true,opacity:.75}));
  flashSph.position.set(0,.9,0); flashSph.visible=false; group.add(flashSph);
  scene.add(group);
  return { group,lLeg,rLeg,lArm,rArm,flashSph,
    phase:Math.random()*Math.PI*2, walkSpeed:1.2+Math.random()*.8,
    state:'alive', flyVel:new THREE.Vector3(), flyRotVel:new THREE.Vector3(),
    deadTimer:0, hitFlash:0 };
}

/* ─── Spawn enemies ─────────────────────────────────────────── */
function randomFieldPos(minDist) {
  let x,z,tries=0;
  do { x=(Math.random()-.5)*(FIELD_W-4); z=(Math.random()-.5)*(FIELD_L-4); tries++; }
  while (minDist && tries<12 && Math.hypot(x-camera.position.x, z-camera.position.z)<minDist);
  return [x,z];
}
const npcs = Array.from({length:ENEMY_COUNT}, ()=>{ const [x,z]=randomFieldPos(18); return buildNPC(x,z); });

/* ─── HUD elements ──────────────────────────────────────────── */
let kills=0, fireTimer=0, shooting=false, muzzleTimer=0, recoilZ=0, recoilRot=0;

const killsEl = document.createElement('div');
Object.assign(killsEl.style,{position:'fixed',top:'14px',right:'18px',background:'rgba(0,0,0,.55)',backdropFilter:'blur(8px)',color:'#FFD700',padding:'8px 18px',borderRadius:'8px',fontFamily:'"Arial Black",Arial,sans-serif',fontSize:'clamp(1rem,2.5vw,1.4rem)',letterSpacing:'.1em',display:'none',userSelect:'none',pointerEvents:'none',whiteSpace:'nowrap'});
document.getElementById('hud').appendChild(killsEl);

const streakEl = document.createElement('div');
Object.assign(streakEl.style,{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',fontFamily:'"Arial Black",Arial,sans-serif',fontSize:'clamp(2rem,8vw,5.5rem)',color:'#FFD700',textShadow:'0 0 30px #FF6600',pointerEvents:'none',display:'none',letterSpacing:'.1em',textAlign:'center'});
document.body.appendChild(streakEl);

// Hit marker (4-line cross in red)
const hmEl = document.createElement('div');
hmEl.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity .06s';
hmEl.innerHTML='<svg width="28" height="28" viewBox="0 0 28 28"><line x1="14" y1="0" x2="14" y2="8" stroke="#ff2200" stroke-width="2.5"/><line x1="14" y1="20" x2="14" y2="28" stroke="#ff2200" stroke-width="2.5"/><line x1="0" y1="14" x2="8" y2="14" stroke="#ff2200" stroke-width="2.5"/><line x1="20" y1="14" x2="28" y2="14" stroke="#ff2200" stroke-width="2.5"/></svg>';
document.body.appendChild(hmEl);
let hmTimer=0;

function updateKills(){ killsEl.textContent='💀 '+kills; }
let streakTimer=0;
function showStreak(txt){ streakEl.textContent=txt; streakEl.style.display='block'; streakTimer=1.8; }
function checkStreak(){ if(kills>0&&kills%10===0) showStreak('CAMPEÓN! 🏆'); else if(kills>0&&kills%5===0) showStreak('GOLAZO! ⚽'); }

/* ─── Shoot ─────────────────────────────────────────────────── */
const _rd=new THREE.Vector3(), _oc=new THREE.Vector3();
function fire() {
  muzzleFlash.visible=true; muzzleTimer=0.055;
  recoilZ=0.045; recoilRot=0.09;
  player.pitch-=0.016;
  _rd.set(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  let hit=null, hitT=Infinity;
  npcs.forEach(npc=>{
    if (npc.state!=='alive') return;
    _oc.set(camera.position.x-npc.group.position.x, camera.position.y-(npc.group.position.y+0.9), camera.position.z-npc.group.position.z);
    const b=2*_oc.dot(_rd), c=_oc.dot(_oc)-.25, disc=b*b-4*c;
    if (disc<0) return;
    const tt=(-b-Math.sqrt(disc))/2;
    if (tt>.15&&tt<hitT) { hit=npc; hitT=tt; }
  });
  if (hit) {
    hit.state='flying';
    hit.flyVel.set(_rd.x*10+(Math.random()-.5)*3, 7+Math.random()*5, _rd.z*10+(Math.random()-.5)*3);
    hit.flyRotVel.set((Math.random()-.5)*10,(Math.random()-.5)*10,(Math.random()-.5)*6);
    hit.flashSph.visible=true; hit.hitFlash=0.12;
    kills++; updateKills(); checkStreak();
    hmEl.style.opacity='1'; hmTimer=0.18;
  }
}

/* ─── Player state ──────────────────────────────────────────── */
const player={yaw:0,pitch:0,vy:0,y:EYE_H,onGround:true};
const keys={};
let gameActive=false, locked=false, dragLook=false, lastMX=0, lastMY=0;

window.addEventListener('keydown',e=>{ if(!gameActive)return; keys[e.code]=true; if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault(); });
window.addEventListener('keyup',e=>{ keys[e.code]=false; });
document.addEventListener('mousedown',e=>{ if(!gameActive)return; if(e.button===0)shooting=true; });
document.addEventListener('mouseup',e=>{ if(e.button===0)shooting=false; });

/* ─── Controls ──────────────────────────────────────────────── */
const overlay=document.getElementById('overlay'), hud=document.getElementById('hud');
const pauseMsg=document.getElementById('paused-msg'), hint=document.getElementById('hint');
function tryLock(){ const fn=canvas.requestPointerLock||canvas.mozRequestPointerLock; if(fn) try{fn.call(canvas);}catch(e){} }
function startGame(){ gameActive=true; overlay.style.display='none'; hud.classList.add('visible'); killsEl.style.display='block'; updateKills(); pauseMsg.classList.remove('show'); tryLock(); }
function onLockChange(){
  locked=!!(document.pointerLockElement||document.mozPointerLockElement);
  if(locked){ pauseMsg.classList.remove('show'); hint.textContent='CLICK para disparar · ESC pausar'; }
  else if(gameActive){ hint.textContent='Click para capturar el mouse'; pauseMsg.classList.add('show'); }
}
document.addEventListener('pointerlockchange',onLockChange);
document.addEventListener('mozpointerlockchange',onLockChange);
document.addEventListener('pointerlockerror',()=>{ locked=false; });
window.addEventListener('mousemove',e=>{
  if(!gameActive)return;
  if(locked){ player.yaw-=e.movementX*.0022; player.pitch-=e.movementY*.0022; }
  else if(dragLook){ player.yaw-=(e.clientX-lastMX)*.0038; player.pitch-=(e.clientY-lastMY)*.0038; lastMX=e.clientX; lastMY=e.clientY; }
  player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch));
});
canvas.addEventListener('mousedown',e=>{ if(!gameActive)return; if(!locked){tryLock();dragLook=true;lastMX=e.clientX;lastMY=e.clientY;} });
window.addEventListener('mouseup',()=>{ dragLook=false; });
let ts=null;
canvas.addEventListener('touchstart',e=>{ if(!gameActive)return; ts={x:e.touches[0].clientX,y:e.touches[0].clientY}; },{passive:true});
canvas.addEventListener('touchmove',e=>{ if(!gameActive||!ts)return; const t=e.touches[0]; player.yaw-=(t.clientX-ts.x)*.004; player.pitch-=(t.clientY-ts.y)*.004; player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch)); ts={x:t.clientX,y:t.clientY}; },{passive:true});
document.getElementById('startBtn').addEventListener('click',startGame);
pauseMsg.addEventListener('click',()=>{ tryLock(); pauseMsg.classList.remove('show'); });

/* ─── Game Loop ─────────────────────────────────────────────── */
let prevTime=performance.now();
(function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min((now-prevTime)/1000,.05); prevTime=now; const t=now/1000;

  // Auto-fire
  if (shooting&&gameActive){ fireTimer-=dt; if(fireTimer<=0){fire();fireTimer=FIRE_RATE;} } else fireTimer=0;
  if(muzzleTimer>0){muzzleTimer-=dt; if(muzzleTimer<=0)muzzleFlash.visible=false;}
  if(hmTimer>0){hmTimer-=dt; if(hmTimer<=0)hmEl.style.opacity='0';}
  if(streakTimer>0){streakTimer-=dt; if(streakTimer<=0)streakEl.style.display='none';}

  // Gun recoil spring
  recoilZ*=Math.pow(.04,dt); recoilRot*=Math.pow(.04,dt);
  gunGroup.position.z=-.42+recoilZ; gunGroup.rotation.x=recoilRot;

  // Player movement
  if(gameActive){
    const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw); let mx=0,mz=0;
    if(keys['ArrowUp']  ||keys['KeyW']){mx-=sy;mz-=cy;}
    if(keys['ArrowDown']||keys['KeyS']){mx+=sy;mz+=cy;}
    if(keys['ArrowRight']||keys['KeyD']){mx+=cy;mz-=sy;}
    if(keys['ArrowLeft']||keys['KeyA']){mx-=cy;mz+=sy;}
    const len=Math.sqrt(mx*mx+mz*mz);
    if(len>0){camera.position.x+=(mx/len)*MOVE_SPEED*dt; camera.position.z+=(mz/len)*MOVE_SPEED*dt;}
    camera.position.x=Math.max(-62,Math.min(62,camera.position.x));
    camera.position.z=Math.max(-72,Math.min(72,camera.position.z));
    if(keys['Space']&&player.onGround){player.vy=JUMP_VEL;player.onGround=false;}
  }
  player.vy+=GRAVITY*dt; player.y+=player.vy*dt;
  if(player.y<=EYE_H){player.y=EYE_H;player.vy=0;player.onGround=true;}
  camera.position.y=player.y;
  camera.rotation.order='YXZ'; camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;

  // NPC update
  npcs.forEach(npc=>{
    const ph=npc.phase+t*npc.walkSpeed*3.8;
    if(npc.state==='alive'){
      const sw=Math.sin(ph)*.48;
      npc.lLeg.rotation.x=sw; npc.rLeg.rotation.x=-sw;
      npc.lArm.rotation.x=-sw*.52; npc.rArm.rotation.x=sw*.52;
      npc.group.position.y=Math.max(0,Math.abs(Math.sin(ph))*.06-.01);
      // Chase player
      const dx=camera.position.x-npc.group.position.x, dz=camera.position.z-npc.group.position.z;
      const d=Math.sqrt(dx*dx+dz*dz);
      if(d>1.5){ const spd=npc.walkSpeed*2.2*dt; npc.group.position.x+=(dx/d)*spd; npc.group.position.z+=(dz/d)*spd; npc.group.rotation.y=Math.atan2(dx,dz); npc.group.position.x=Math.max(-FIELD_W/2+1,Math.min(FIELD_W/2-1,npc.group.position.x)); npc.group.position.z=Math.max(-FIELD_L/2+1,Math.min(FIELD_L/2-1,npc.group.position.z)); }
      if(npc.hitFlash>0){npc.hitFlash-=dt; if(npc.hitFlash<=0)npc.flashSph.visible=false;}

    } else if(npc.state==='flying'){
      npc.flyVel.y+=GRAVITY*dt;
      npc.group.position.x+=npc.flyVel.x*dt;
      npc.group.position.y+=npc.flyVel.y*dt;
      npc.group.position.z+=npc.flyVel.z*dt;
      npc.group.rotation.x+=npc.flyRotVel.x*dt;
      npc.group.rotation.y+=npc.flyRotVel.y*dt;
      npc.group.rotation.z+=npc.flyRotVel.z*dt;
      if(npc.group.position.y<0){
        npc.group.position.y=0; npc.state='dead'; npc.deadTimer=2.5;
        npc.group.visible=false; npc.flashSph.visible=false;
      }

    } else if(npc.state==='dead'){
      npc.deadTimer-=dt;
      if(npc.deadTimer<=0){
        const [rx,rz]=randomFieldPos(15);
        npc.group.position.set(rx,0,rz); npc.group.rotation.set(0,Math.random()*Math.PI*2,0);
        npc.group.visible=true; npc.state='alive'; npc.hitFlash=0;
      }
    }
  });

  renderer.render(scene,camera);
})(performance.now());

window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
