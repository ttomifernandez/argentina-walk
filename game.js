'use strict';

const MOVE_SPEED = 7.0;
const JUMP_VEL   = 9.5;
const GRAVITY    = -26;
const EYE_H      = 1.72;
const FIELD_W    = 68;
const FIELD_L    = 105;
const BALL_R     = 0.60;
const GOAL_W     = 7.32;
const GOAL_H     = 2.44;
const GOAL_DEPTH = 2.2;

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

/* ─── Scene ─────────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x8ecae6, 0.007);

(function buildSky() {
  const geo    = new THREE.SphereGeometry(280, 32, 18);
  geo.scale(-1, 1, 1);
  const pos    = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, (y + 280) / 560));
    colors[i*3]   = 0.682 - 0.38 * t;
    colors[i*3+1] = 0.839 - 0.30 * t;
    colors[i*3+2] = 0.945 - 0.14 * t;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true })));
})();

/* ─── Camera ────────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 300);
camera.position.set(0, EYE_H, 18);

/* ─── Lighting ──────────────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0xffffff, 0.28));
scene.add(new THREE.HemisphereLight(0x87CEEB, 0x4a8c28, 0.65));

const sun = new THREE.DirectionalLight(0xFFF5CC, 2.0);
sun.position.set(55, 85, 45);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -90;
sun.shadow.camera.right = sun.shadow.camera.top   =  90;
sun.shadow.camera.far   = 280;
sun.shadow.bias = -0.0006;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0xBBCCFF, 0.35);
fillLight.position.set(-50, 40, -60);
scene.add(fillLight);

[[-50,30,-70],[50,30,-70],[-50,30,70],[50,30,70]].forEach(([x,y,z]) => {
  const spot = new THREE.SpotLight(0xFFF5E0, 0.6, 200, Math.PI/6, 0.4, 1);
  spot.position.set(x,y,z);
  spot.target.position.set(0,0,0);
  scene.add(spot); scene.add(spot.target);
});

/* ─── Textures ──────────────────────────────────────────────── */
function makeGrassTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const ctx = cv.getContext('2d');
  for (let x = 0; x < 512; x++) {
    ctx.fillStyle = Math.floor(x/32) % 2 === 0 ? '#2a7a2a' : '#357c35';
    ctx.fillRect(x, 0, 1, 512);
  }
  ctx.globalAlpha = 0.055;
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(Math.random()*512, Math.random()*512, Math.random()*3+1, Math.random()*2+1);
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 18);
  return t;
}

function makeJerseyTex(number) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 192;
  const ctx = cv.getContext('2d');
  for (let x = 0; x < 128; x++) {
    ctx.fillStyle = Math.floor(x/11) % 2 === 0 ? '#74ACDF' : '#FFFFFF';
    ctx.fillRect(x, 0, 1, 192);
  }
  ctx.fillStyle = 'rgba(10,30,80,0.45)';
  ctx.fillRect(10, 16, 28, 28);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('AFA', 14, 35);
  ctx.fillStyle = 'rgba(8,20,70,0.82)';
  ctx.font = 'bold 58px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(String(number), 64, 162);
  return new THREE.CanvasTexture(cv);
}

function makeOpponentJerseyTex(number) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 192;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(0, 0, 128, 192);
  ctx.fillStyle = '#880000';
  ctx.fillRect(44, 0, 40, 18);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 58px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(String(number), 64, 162);
  return new THREE.CanvasTexture(cv);
}

function makeConcreteTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#888';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.08})`;
    ctx.fillRect(Math.random()*256, Math.random()*256, Math.random()*6+1, Math.random()*6+1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  return t;
}

function makeBallTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, 256, 256);
  const patches = [[128,72],[184,112],[164,176],[92,176],[72,112],[128,130]];
  patches.forEach(([cx, cy]) => {
    ctx.beginPath();
    const r = cy === 130 ? 30 : 22;
    for (let i = 0; i < 5; i++) {
      const a = (i/5)*Math.PI*2 - Math.PI/2;
      if (i === 0) ctx.moveTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
      else ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fillStyle = '#111';
    ctx.fill();
  });
  return new THREE.CanvasTexture(cv);
}

const GRASS_TEX    = makeGrassTex();
const CONCRETE_TEX = makeConcreteTex();
const BALL_TEX     = makeBallTex();

const ARG_JERSEY_TEXS = [10,9,7,11,8].map(makeJerseyTex);
const OPP_JERSEY_TEXS = [1,5,4,6,9].map(makeOpponentJerseyTex);

/* ─── Materials ─────────────────────────────────────────────── */
const whiteMat     = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.5, roughness: 0.3 });
const lineMat      = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
const skinMat      = new THREE.MeshLambertMaterial({ color: 0xC68642 });
const shortsMat    = new THREE.MeshLambertMaterial({ color: 0x0D0D4E });
const oppShortsMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
const sockMat      = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
const shoeMat      = new THREE.MeshLambertMaterial({ color: 0x1A1008 });
const hairMats     = [0x1a0a00,0x2d1506,0x000000,0x3b1f05].map(c => new THREE.MeshLambertMaterial({ color: c }));
const eyeMat       = new THREE.MeshBasicMaterial({ color: 0x111111 });
const netMat       = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.22, side: THREE.DoubleSide, wireframe: true });

/* ─── Ground ────────────────────────────────────────────────── */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(FIELD_W+40, FIELD_L+40),
  new THREE.MeshLambertMaterial({ map: GRASS_TEX })
);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

/* ─── Field Lines ───────────────────────────────────────────── */
const LW = 0.12;
function addLine(x, z, w, d, yOff=0.016) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
  m.rotation.x = -Math.PI/2;
  m.position.set(x, yOff, z);
  scene.add(m);
}
addLine(0,-FIELD_L/2, FIELD_W, LW);
addLine(0, FIELD_L/2, FIELD_W, LW);
addLine(-FIELD_W/2, 0, LW, FIELD_L);
addLine( FIELD_W/2, 0, LW, FIELD_L);
addLine(0, 0, FIELD_W, LW);

(function() {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i/80)*Math.PI*2;
    pts.push(new THREE.Vector3(Math.cos(a)*9.15, 0.018, Math.sin(a)*9.15));
  }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xFFFFFF })));
  const sp = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), lineMat);
  sp.rotation.x = -Math.PI/2; sp.position.y = 0.016; scene.add(sp);
})();

[-1,1].forEach(side => {
  const gz = side*(FIELD_L/2), sg = -side;
  addLine(0, gz+sg*8.25, 40.32, LW);
  addLine(-20.16, gz+sg*4.125, LW, 16.5);
  addLine( 20.16, gz+sg*4.125, LW, 16.5);
  addLine(0, gz+sg*2.75, 18.32, LW);
  addLine(-9.16, gz+sg*1.375, LW, 5.5);
  addLine( 9.16, gz+sg*1.375, LW, 5.5);
  const ps = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), lineMat);
  ps.rotation.x = -Math.PI/2; ps.position.set(0, 0.016, gz+sg*11); scene.add(ps);
});

/* ─── Goals ─────────────────────────────────────────────────── */
function buildGoal(side) {
  const r=0.065, GW=GOAL_W, GH=GOAL_H, GD=GOAL_DEPTH;
  const z=side*FIELD_L/2, sd=side;
  function post(x,y,h,rx,rz) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10), whiteMat);
    m.rotation.x=rx||0; m.rotation.z=rz||0; m.position.set(x,y,z); m.castShadow=true; scene.add(m);
  }
  post(-GW/2, GH/2, GH, 0, 0);
  post( GW/2, GH/2, GH, 0, 0);
  post(0, GH, GW, 0, Math.PI/2);
  post(-GW/2, GH/2, GD, Math.PI/2+Math.atan2(GD,0.001)*sd, 0);
  post( GW/2, GH/2, GD, Math.PI/2+Math.atan2(GD,0.001)*sd, 0);
  const net = new THREE.Mesh(new THREE.BoxGeometry(GW-0.1, GH, GD), netMat);
  net.position.set(0, GH/2, z+sd*GD/2); scene.add(net);
}
buildGoal(1); buildGoal(-1);

/* ─── Corner Flags ──────────────────────────────────────────── */
[[-FIELD_W/2,-FIELD_L/2],[FIELD_W/2,-FIELD_L/2],
 [-FIELD_W/2, FIELD_L/2],[FIELD_W/2, FIELD_L/2]].forEach(([x,z]) => {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,1.5,8),
    new THREE.MeshStandardMaterial({ color:0xFFFFFF, metalness:0.6, roughness:0.3 }));
  pole.position.set(x,0.75,z); scene.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.32),
    new THREE.MeshBasicMaterial({ color:0x74ACDF, side:THREE.DoubleSide }));
  flag.position.set(x+0.26,1.46,z); scene.add(flag);
});

/* ─── Stands ────────────────────────────────────────────────── */
(function() {
  const conMat = new THREE.MeshLambertMaterial({ map: CONCRETE_TEX });
  const ROWS   = [0x74ACDF,0xFFFFFF,0x74ACDF,0xFFFFFF,0x74ACDF,0xFFFFFF];
  [
    { pos:[0, FIELD_L/2+20,0], w:FIELD_W+50, d:16, h:22 },
    { pos:[0,-FIELD_L/2-20,0], w:FIELD_W+50, d:16, h:22 },
    { pos:[ FIELD_W/2+13,0,0], w:14, d:FIELD_L+12, h:22 },
    { pos:[-FIELD_W/2-13,0,0], w:14, d:FIELD_L+12, h:22 },
  ].forEach(({pos,w,d,h}) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), conMat);
    base.position.set(pos[0],h/2,pos[2]); base.receiveShadow=true; base.castShadow=true; scene.add(base);
    const rowH = h/ROWS.length;
    ROWS.forEach((color,i) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w-0.4,rowH-0.2,d-0.4),
        new THREE.MeshLambertMaterial({color}));
      seat.position.set(pos[0],(i+0.5)*rowH,pos[2]); scene.add(seat);
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w+4,1,d+4),
      new THREE.MeshLambertMaterial({color:0x555555}));
    roof.position.set(pos[0],h+0.5,pos[2]); roof.castShadow=true; scene.add(roof);
  });
  [[-FIELD_W/2-10,-FIELD_L/2-8],[FIELD_W/2+10,-FIELD_L/2-8],
   [-FIELD_W/2-10, FIELD_L/2+8],[FIELD_W/2+10, FIELD_L/2+8]].forEach(([x,z]) => {
    const mat = new THREE.MeshLambertMaterial({color:0x888888});
    const tw = new THREE.Mesh(new THREE.BoxGeometry(1.2,30,1.2), mat);
    tw.position.set(x,15,z); tw.castShadow=true; scene.add(tw);
    const lp = new THREE.Mesh(new THREE.BoxGeometry(3,1,3), new THREE.MeshLambertMaterial({color:0xaaaaaa}));
    lp.position.set(x,30.5,z); scene.add(lp);
  });
})();

/* ─── Ball ──────────────────────────────────────────────────── */
const ballPos   = new THREE.Vector3(0, BALL_R, 0);
const ballVel   = new THREE.Vector3(0, 0, 0);
const _rollAxis = new THREE.Vector3();

const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_R, 24, 18),
  new THREE.MeshStandardMaterial({ map: BALL_TEX, roughness: 0.65, metalness: 0 })
);
ballMesh.castShadow = true;
ballMesh.position.copy(ballPos);
scene.add(ballMesh);

const ballShadow = new THREE.Mesh(
  new THREE.CircleGeometry(BALL_R*0.85, 16),
  new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.28 })
);
ballShadow.rotation.x = -Math.PI/2;
ballShadow.position.y = 0.013;
scene.add(ballShadow);

function resetBall() {
  ballPos.set(0, BALL_R, 0);
  ballVel.set(0, 0, 0);
}

/* ─── NPC Builder ───────────────────────────────────────────── */
function buildNPC(x, z, jerseyTex, sShortsMat, team) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.random()*Math.PI*2;
  const jMat = new THREE.MeshLambertMaterial({ map: jerseyTex });
  const hair = hairMats[Math.floor(Math.random()*hairMats.length)];

  function add(geo, mat, px, py, pz, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px,py,pz); m.castShadow=true;
    (parent||group).add(m); return m;
  }
  function pivot(px,py,pz) { const g=new THREE.Group(); g.position.set(px,py,pz); group.add(g); return g; }

  add(new THREE.BoxGeometry(0.13,0.08,0.25), shoeMat, -0.12,0.04,0.04);
  add(new THREE.BoxGeometry(0.13,0.08,0.25), shoeMat,  0.12,0.04,0.04);
  add(new THREE.CylinderGeometry(0.072,0.065,0.27,8), sockMat, -0.12,0.55,0);
  add(new THREE.CylinderGeometry(0.072,0.065,0.27,8), sockMat,  0.12,0.55,0);

  const lLeg=pivot(-0.12,1.04,0), rLeg=pivot(0.12,1.04,0);
  const legGeo = new THREE.CylinderGeometry(0.075,0.062,0.60,8);
  add(legGeo, sShortsMat, 0,-0.30,0, lLeg);
  add(legGeo, sShortsMat, 0,-0.30,0, rLeg);

  add(new THREE.BoxGeometry(0.42,0.58,0.23), jMat, 0,1.30,0);

  const lArm=pivot(-0.27,1.50,0), rArm=pivot(0.27,1.50,0);
  const armGeo = new THREE.CylinderGeometry(0.058,0.046,0.52,8);
  add(armGeo, jMat, 0,-0.26,0, lArm);
  add(armGeo, jMat, 0,-0.26,0, rArm);

  add(new THREE.SphereGeometry(0.062,8,6), skinMat, -0.27,0.99,0);
  add(new THREE.SphereGeometry(0.062,8,6), skinMat,  0.27,0.99,0);
  add(new THREE.CylinderGeometry(0.076,0.076,0.11,8), skinMat, 0,1.62,0);
  add(new THREE.SphereGeometry(0.152,14,12), skinMat, 0,1.79,0);
  add(new THREE.SphereGeometry(0.160,14,12,0,Math.PI*2,0,Math.PI*0.52), hair, 0,1.79,0);
  add(new THREE.SphereGeometry(0.022,6,5), eyeMat, -0.059,1.80,0.138);
  add(new THREE.SphereGeometry(0.022,6,5), eyeMat,  0.059,1.80,0.138);
  const bMat = new THREE.MeshBasicMaterial({color:0x1a0a00});
  add(new THREE.BoxGeometry(0.045,0.012,0.01), bMat, -0.059,1.836,0.144);
  add(new THREE.BoxGeometry(0.045,0.012,0.01), bMat,  0.059,1.836,0.144);

  scene.add(group);
  return { group, lLeg, rLeg, lArm, rArm, phase: Math.random()*Math.PI*2,
           walkSpeed: 1.0+Math.random()*0.7, team, kickCooldown: Math.random()*2 };
}

/* ─── Spawn 5v5 ─────────────────────────────────────────────── */
// Team 0 (Argentina): +z half, attacks -z goal
// Team 1 (Roja):      -z half, attacks +z goal
const npcs = [
  ...[[-5,20],[10,32],[-12,28],[22,15],[-20,18]].map(([x,z],i) => buildNPC(x,z, ARG_JERSEY_TEXS[i], shortsMat,    0)),
  ...[[5,-20],[-10,-32],[12,-28],[-22,-15],[20,-18]].map(([x,z],i) => buildNPC(x,z, OPP_JERSEY_TEXS[i], oppShortsMat, 1)),
];

/* ─── Score HUD ─────────────────────────────────────────────── */
let scoreARG = 0, scoreOPP = 0, goalState = 0;

const scoreEl = document.createElement('div');
Object.assign(scoreEl.style, {
  position:'fixed', top:'14px', left:'50%', transform:'translateX(-50%)',
  background:'rgba(0,0,0,0.58)', backdropFilter:'blur(8px)',
  color:'#fff', padding:'8px 28px', borderRadius:'10px',
  fontFamily:'"Arial Black",Arial,sans-serif', fontSize:'clamp(1rem,3vw,1.5rem)',
  letterSpacing:'0.1em', display:'none', userSelect:'none', pointerEvents:'none',
  whiteSpace:'nowrap'
});
document.getElementById('hud').appendChild(scoreEl);

const goalEl = document.createElement('div');
Object.assign(goalEl.style, {
  position:'fixed', inset:'0', display:'none',
  alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'0.15em',
  fontFamily:'"Arial Black",Arial,sans-serif', fontSize:'clamp(3rem,12vw,8rem)',
  color:'#FFD700', textShadow:'0 0 40px #FF6600, 0 0 80px #FF3300',
  background:'rgba(0,0,0,0.38)', pointerEvents:'none',
  letterSpacing:'0.08em', textAlign:'center'
});
document.body.appendChild(goalEl);

function updateScore() {
  scoreEl.textContent = 'ARG  ' + scoreARG + ' : ' + scoreOPP + '  ROJA';
}

function triggerGoal(team) {
  if (team === 0) {
    scoreARG++;
    goalEl.innerHTML = 'GOL!<br><span style="font-size:0.42em;color:#74ACDF;letter-spacing:0.12em">ARGENTINA</span>';
  } else {
    scoreOPP++;
    goalEl.innerHTML = 'GOL!<br><span style="font-size:0.42em;color:#ff6666;letter-spacing:0.12em">ROJA</span>';
  }
  goalEl.style.display = 'flex';
  goalState = 2.8;
  updateScore();
  resetBall();
}

function checkGoal() {
  if (goalState > 0) return;
  if (Math.abs(ballPos.x) >= GOAL_W/2) return;
  if (ballPos.y >= GOAL_H + BALL_R)   return;
  if (ballPos.z < -(FIELD_L/2 - 0.5)) { triggerGoal(0); return; }
  if (ballPos.z >  (FIELD_L/2 - 0.5)) { triggerGoal(1); }
}

/* ─── Player State ──────────────────────────────────────────── */
const player = { yaw:0, pitch:0, vy:0, y:EYE_H, onGround:true };
const keys   = {};
let gameActive=false, locked=false, dragLook=false, lastMX=0, lastMY=0;

window.addEventListener('keydown', e => {
  if (!gameActive) return;
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

/* ─── Controls ──────────────────────────────────────────────── */
const overlay  = document.getElementById('overlay');
const hud      = document.getElementById('hud');
const pauseMsg = document.getElementById('paused-msg');
const hint     = document.getElementById('hint');

function tryLock() {
  try { (canvas.requestPointerLock || canvas.mozRequestPointerLock).call(canvas); } catch(e) {}
}
function startGame() {
  gameActive = true;
  overlay.style.display = 'none';
  hud.classList.add('visible');
  scoreEl.style.display = 'block';
  updateScore();
  pauseMsg.classList.remove('show');
  tryLock();
}
function onLockChange() {
  locked = !!(document.pointerLockElement || document.mozPointerLockElement);
  if (locked) { pauseMsg.classList.remove('show'); hint.textContent = 'ESC para pausar'; }
  else if (gameActive) { hint.textContent = 'Click · Arrastrá para mirar'; pauseMsg.classList.add('show'); }
}
document.addEventListener('pointerlockchange', onLockChange);
document.addEventListener('mozpointerlockchange', onLockChange);
document.addEventListener('pointerlockerror', () => { locked=false; if(gameActive) hint.textContent='Arrastrá para mirar · Flechas para mover'; });

window.addEventListener('mousemove', e => {
  if (!gameActive) return;
  if (locked) { player.yaw -= e.movementX*0.0022; player.pitch -= e.movementY*0.0022; }
  else if (dragLook) {
    player.yaw   -= (e.clientX-lastMX)*0.0038;
    player.pitch -= (e.clientY-lastMY)*0.0038;
    lastMX=e.clientX; lastMY=e.clientY;
  }
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
});
canvas.addEventListener('mousedown', e => { if (!gameActive) return; if (!locked) { tryLock(); dragLook=true; lastMX=e.clientX; lastMY=e.clientY; } });
window.addEventListener('mouseup', () => { dragLook=false; });

let touchStart=null;
canvas.addEventListener('touchstart', e => { if (!gameActive) return; touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY}; }, {passive:true});
canvas.addEventListener('touchmove', e => {
  if (!gameActive||!touchStart) return;
  const t=e.touches[0];
  player.yaw   -= (t.clientX-touchStart.x)*0.004;
  player.pitch -= (t.clientY-touchStart.y)*0.004;
  player.pitch  = Math.max(-1.45,Math.min(1.45,player.pitch));
  touchStart={x:t.clientX,y:t.clientY};
}, {passive:true});

document.getElementById('startBtn').addEventListener('click', startGame);
pauseMsg.addEventListener('click', () => { tryLock(); pauseMsg.classList.remove('show'); });

/* ─── Game Loop ─────────────────────────────────────────────── */
let prevTime = performance.now();

(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now-prevTime)/1000, 0.05);
  prevTime  = now;
  const t   = now/1000;

  /* ── Goal celebration pause ── */
  if (goalState > 0) {
    goalState -= dt;
    if (goalState <= 0) { goalEl.style.display='none'; goalState=0; }
    renderer.render(scene, camera);
    return;
  }

  /* ── Player movement ── */
  let pmx=0, pmz=0;
  if (gameActive) {
    const sy=Math.sin(player.yaw), cy=Math.cos(player.yaw);
    if (keys['ArrowUp']   ||keys['KeyW']) { pmx-=sy; pmz-=cy; }
    if (keys['ArrowDown'] ||keys['KeyS']) { pmx+=sy; pmz+=cy; }
    if (keys['ArrowRight']||keys['KeyD']) { pmx+=cy; pmz-=sy; }
    if (keys['ArrowLeft'] ||keys['KeyA']) { pmx-=cy; pmz+=sy; }
    const plen=Math.sqrt(pmx*pmx+pmz*pmz);
    if (plen>0) {
      camera.position.x += (pmx/plen)*MOVE_SPEED*dt;
      camera.position.z += (pmz/plen)*MOVE_SPEED*dt;
    }
    camera.position.x = Math.max(-62, Math.min(62, camera.position.x));
    camera.position.z = Math.max(-72, Math.min(72, camera.position.z));
    if (keys['Space'] && player.onGround) { player.vy=JUMP_VEL; player.onGround=false; }

    /* ── Player pushes ball ── */
    const pdx = ballPos.x - camera.position.x;
    const pdz = ballPos.z - camera.position.z;
    const pd  = Math.sqrt(pdx*pdx + pdz*pdz);
    const pushRange = BALL_R + 0.45;
    if (pd < pushRange && pd > 0.001) {
      const nx=pdx/pd, nz=pdz/pd;
      ballPos.x = camera.position.x + nx*pushRange;
      ballPos.z = camera.position.z + nz*pushRange;
      const plen2 = Math.sqrt(pmx*pmx+pmz*pmz) || 0.01;
      const approach = Math.max(0, -(pmx/plen2)*nx - (pmz/plen2)*nz);
      const str = 5.0 + approach * MOVE_SPEED * 2.0;
      ballVel.x = nx * str;
      ballVel.z = nz * str;
      if (ballVel.y < 1.0) ballVel.y = 1.0;
    }
  }

  /* ── Ball physics ── */
  ballVel.y += GRAVITY * dt;
  ballPos.x += ballVel.x * dt;
  ballPos.y += ballVel.y * dt;
  ballPos.z += ballVel.z * dt;

  if (ballPos.y < BALL_R) {
    ballPos.y = BALL_R;
    ballVel.y = ballVel.y < -0.8 ? Math.abs(ballVel.y) * 0.42 : 0;
    ballVel.x *= 0.80;
    ballVel.z *= 0.80;
  }

  const onGnd = ballPos.y <= BALL_R + 0.05;
  const fric  = onGnd ? Math.pow(0.88, dt) : Math.pow(0.995, dt);
  ballVel.x  *= fric;
  ballVel.z  *= fric;

  // Sideline bounce
  const maxBX = FIELD_W/2 + 4;
  if (Math.abs(ballPos.x) > maxBX) { ballPos.x=Math.sign(ballPos.x)*maxBX; ballVel.x*=-0.45; }
  // End-line bounce (only outside goal mouth)
  const maxBZ = FIELD_L/2 + 4;
  if (Math.abs(ballPos.z) > maxBZ && Math.abs(ballPos.x) >= GOAL_W/2+0.3) {
    ballPos.z=Math.sign(ballPos.z)*maxBZ; ballVel.z*=-0.45;
  }

  checkGoal();

  // Roll rotation
  const spd2d = Math.sqrt(ballVel.x*ballVel.x + ballVel.z*ballVel.z);
  if (spd2d > 0.05) {
    _rollAxis.set(-ballVel.z/spd2d, 0, ballVel.x/spd2d);
    ballMesh.rotateOnWorldAxis(_rollAxis, spd2d*dt/BALL_R);
  }
  ballMesh.position.copy(ballPos);

  const hFac = Math.max(0.1, 1-(ballPos.y-BALL_R)/6);
  ballShadow.position.x = ballPos.x;
  ballShadow.position.z = ballPos.z;
  ballShadow.scale.setScalar(hFac);

  /* ── NPC AI ── */
  let kicker0=null, kd0=Infinity, kicker1=null, kd1=Infinity;
  npcs.forEach(npc => {
    const dx=ballPos.x-npc.group.position.x, dz=ballPos.z-npc.group.position.z;
    const d=Math.sqrt(dx*dx+dz*dz);
    if (npc.team===0 && d<kd0) { kicker0=npc; kd0=d; }
    if (npc.team===1 && d<kd1) { kicker1=npc; kd1=d; }
  });

  npcs.forEach(npc => {
    const ph=npc.phase+t*npc.walkSpeed*3.8, sw=Math.sin(ph)*0.48;
    npc.lLeg.rotation.x= sw; npc.rLeg.rotation.x=-sw;
    npc.lArm.rotation.x=-sw*0.52; npc.rArm.rotation.x=sw*0.52;
    npc.group.position.y = Math.max(0, Math.abs(Math.sin(ph))*0.06-0.01);
    if (npc.kickCooldown>0) npc.kickCooldown-=dt;

    const isKicker = npc===kicker0 || npc===kicker1;
    const bx=ballPos.x-npc.group.position.x, bz=ballPos.z-npc.group.position.z;
    const bd=Math.sqrt(bx*bx+bz*bz);
    const kickRange = BALL_R + 0.85;

    if (bd > kickRange) {
      const spd = isKicker ? npc.walkSpeed*2.4 : npc.walkSpeed*1.5;
      npc.group.position.x += (bx/bd)*spd*dt;
      npc.group.position.z += (bz/bd)*spd*dt;
      npc.group.rotation.y  = Math.atan2(bx, bz);
      npc.group.position.x  = Math.max(-FIELD_W/2+1, Math.min(FIELD_W/2-1, npc.group.position.x));
      npc.group.position.z  = Math.max(-FIELD_L/2+1, Math.min(FIELD_L/2-1, npc.group.position.z));
    } else if (isKicker && npc.kickCooldown<=0) {
      const targetZ = npc.team===0 ? -(FIELD_L/2) : (FIELD_L/2);
      const aimX = (Math.random()-0.5)*GOAL_W;
      const gdx=aimX-ballPos.x, gdz=targetZ-ballPos.z;
      const gd=Math.sqrt(gdx*gdx+gdz*gdz);
      const str=14+Math.random()*9;
      ballVel.x=(gdx/gd)*str; ballVel.z=(gdz/gd)*str;
      ballVel.y=1.8+Math.random()*2.5;
      npc.kickCooldown=1.6+Math.random()*0.8;
      npc.group.rotation.y=Math.atan2(gdx,gdz);
    }
  });

  /* ── Gravity & camera ── */
  player.vy += GRAVITY*dt;
  player.y  += player.vy*dt;
  if (player.y<=EYE_H) { player.y=EYE_H; player.vy=0; player.onGround=true; }
  camera.position.y = player.y;
  camera.rotation.order='YXZ';
  camera.rotation.y=player.yaw;
  camera.rotation.x=player.pitch;

  renderer.render(scene, camera);
})(performance.now());

/* ─── Resize ────────────────────────────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
