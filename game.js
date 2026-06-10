'use strict';

/* ═══════════════════════════════════════════════════════════════
   ARGENTINA WALK — Three.js First-Person Stadium Simulator
   ═══════════════════════════════════════════════════════════════ */

const MOVE_SPEED  = 7.0;
const JUMP_VEL    = 9.5;
const GRAVITY     = -26;
const EYE_H       = 1.72;
const FIELD_W     = 68;
const FIELD_L     = 105;

/* ─── Renderer ──────────────────────────────────────────────── */
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.physicallyCorrectLights = true;

/* ─── Scene ─────────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x8ecae6, 0.007);

// Gradient sky sphere
(function buildSky() {
  const geo = new THREE.SphereGeometry(280, 32, 18);
  geo.scale(-1, 1, 1);
  const pos    = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, (y + 280) / 560));
    // horizon: #aed6f1  /  zenith: #1a6fb0
    colors[i*3]   = 0.682 - 0.38 * t;
    colors[i*3+1] = 0.839 - 0.30 * t;
    colors[i*3+2] = 0.945 - 0.14 * t;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true })));
})();

/* ─── Camera ─────────────────────────────────────────────────── */
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
sun.shadow.camera.right = sun.shadow.camera.top    =  90;
sun.shadow.camera.far   = 280;
sun.shadow.bias = -0.0006;
scene.add(sun);

scene.add(Object.assign(new THREE.DirectionalLight(0xBBCCFF, 0.35), {
  position: new THREE.Vector3(-50, 40, -60)
}));

// Stadium flood lights (4 corners)
[[-50, 30, -70], [50, 30, -70], [-50, 30, 70], [50, 30, 70]].forEach(([x, y, z]) => {
  const spot = new THREE.SpotLight(0xFFF5E0, 0.6, 200, Math.PI / 6, 0.4, 1);
  spot.position.set(x, y, z);
  spot.target.position.set(0, 0, 0);
  scene.add(spot);
  scene.add(spot.target);
});

/* ─── Textures ──────────────────────────────────────────────── */
function makeGrassTex() {
  const cv  = document.createElement('canvas');
  cv.width  = cv.height = 512;
  const ctx = cv.getContext('2d');
  // Alternating pitch stripes
  for (let x = 0; x < 512; x++) {
    const band = Math.floor(x / 32) % 2;
    ctx.fillStyle = band === 0 ? '#2a7a2a' : '#357c35';
    ctx.fillRect(x, 0, 1, 512);
  }
  // Subtle noise
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
  const cv  = document.createElement('canvas');
  cv.width  = 128; cv.height = 192;
  const ctx = cv.getContext('2d');
  // Celeste & white vertical stripes
  for (let x = 0; x < 128; x++) {
    ctx.fillStyle = Math.floor(x / 11) % 2 === 0 ? '#74ACDF' : '#FFFFFF';
    ctx.fillRect(x, 0, 1, 192);
  }
  // AFA-style badge area (small dark square)
  ctx.fillStyle = 'rgba(10,30,80,0.45)';
  ctx.fillRect(10, 16, 28, 28);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('AFA', 14, 35);
  // Number on back
  ctx.fillStyle = 'rgba(8,20,70,0.82)';
  ctx.font      = 'bold 58px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(String(number), 64, 162);
  return new THREE.CanvasTexture(cv);
}

function makeConcreteTex() {
  const cv  = document.createElement('canvas');
  cv.width  = cv.height = 256;
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

const GRASS_TEX    = makeGrassTex();
const CONCRETE_TEX = makeConcreteTex();
const JERSEY_NUMS  = [10, 9, 7, 11, 8, 6, 4, 5, 2, 3, 1, 17, 21, 23, 14, 18];
const JERSEY_TEXS  = JERSEY_NUMS.map(n => makeJerseyTex(n));

/* ─── Shared Materials ──────────────────────────────────────── */
const whiteMat    = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.5, roughness: 0.3 });
const lineMat     = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
const skinMat     = new THREE.MeshLambertMaterial({ color: 0xC68642 });
const shortsMat   = new THREE.MeshLambertMaterial({ color: 0x0D0D4E });
const sockMat     = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
const shoeMat     = new THREE.MeshLambertMaterial({ color: 0x1A1008 });
const hairColors  = [0x1a0a00, 0x2d1506, 0x000000, 0x3b1f05];
const hairMats    = hairColors.map(c => new THREE.MeshLambertMaterial({ color: c }));
const eyeMat      = new THREE.MeshBasicMaterial({ color: 0x111111 });
const netMat      = new THREE.MeshBasicMaterial({
  color: 0xFFFFFF, transparent: true, opacity: 0.22,
  side: THREE.DoubleSide, wireframe: true
});

/* ─── Ground ────────────────────────────────────────────────── */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(FIELD_W + 40, FIELD_L + 40, 1, 1),
  new THREE.MeshLambertMaterial({ map: GRASS_TEX })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* ─── Field Lines ───────────────────────────────────────────── */
const LW = 0.12;
function addLine(x, z, w, d, yOff = 0.016) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, yOff, z);
  scene.add(m);
}

// Boundary
addLine(0, -FIELD_L/2, FIELD_W, LW);
addLine(0,  FIELD_L/2, FIELD_W, LW);
addLine(-FIELD_W/2, 0, LW, FIELD_L);
addLine( FIELD_W/2, 0, LW, FIELD_L);
// Half-way
addLine(0, 0, FIELD_W, LW);

// Center circle
(function() {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i/80)*Math.PI*2;
    pts.push(new THREE.Vector3(Math.cos(a)*9.15, 0.018, Math.sin(a)*9.15));
  }
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0xFFFFFF })
  ));
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), lineMat);
  spot.rotation.x = -Math.PI/2; spot.position.y = 0.016;
  scene.add(spot);
})();

// Penalty areas (both ends)
[-1, 1].forEach(side => {
  const gz   = side * (FIELD_L/2);
  const sign = -side;
  // Penalty area
  addLine(0, gz + sign*8.25, 40.32, LW);
  addLine(-20.16, gz + sign*4.125, LW, 16.5);
  addLine( 20.16, gz + sign*4.125, LW, 16.5);
  // Goal area
  addLine(0, gz + sign*2.75, 18.32, LW);
  addLine(-9.16, gz + sign*1.375, LW, 5.5);
  addLine( 9.16, gz + sign*1.375, LW, 5.5);
  // Penalty spot
  const ps = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), lineMat);
  ps.rotation.x = -Math.PI/2;
  ps.position.set(0, 0.016, gz + sign*11);
  scene.add(ps);
});

/* ─── Goals ─────────────────────────────────────────────────── */
function buildGoal(side) {
  const r = 0.065, GW = 7.32, GH = 2.44, GD = 2.2;
  const z  = side * FIELD_L / 2;
  const sd = side;

  function post(x, y, h, rx, rz) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), whiteMat);
    m.rotation.x = rx || 0; m.rotation.z = rz || 0;
    m.position.set(x, y, z);
    m.castShadow = true;
    scene.add(m);
  }
  // Uprights
  post(-GW/2, GH/2, GH, 0, 0);
  post( GW/2, GH/2, GH, 0, 0);
  // Crossbar
  post(0, GH, GW, 0, Math.PI/2);
  // Back frame
  post(-GW/2, GH/2, GD, Math.PI/2 + Math.atan2(GD, 0.001)*sd, 0);
  post( GW/2, GH/2, GD, Math.PI/2 + Math.atan2(GD, 0.001)*sd, 0);

  // Net
  const netGeo = new THREE.BoxGeometry(GW - 0.1, GH, GD);
  const net = new THREE.Mesh(netGeo, netMat);
  net.position.set(0, GH/2, z + sd * GD/2);
  scene.add(net);
}
buildGoal(1);
buildGoal(-1);

/* ─── Corner Flags ──────────────────────────────────────────── */
[[-FIELD_W/2,-FIELD_L/2],[FIELD_W/2,-FIELD_L/2],
 [-FIELD_W/2, FIELD_L/2],[FIELD_W/2, FIELD_L/2]].forEach(([x, z]) => {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness:0.6, roughness:0.3 })
  );
  pole.position.set(x, 0.75, z);
  scene.add(pole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.32),
    new THREE.MeshBasicMaterial({ color: 0x74ACDF, side: THREE.DoubleSide })
  );
  flag.position.set(x + 0.26, 1.46, z);
  scene.add(flag);
});

/* ─── Stadium Stands ────────────────────────────────────────── */
(function buildStands() {
  const concreteMat = new THREE.MeshLambertMaterial({ map: CONCRETE_TEX });
  const ARGENTINA_ROWS = [0x74ACDF, 0xFFFFFF, 0x74ACDF, 0xFFFFFF, 0x74ACDF, 0xFFFFFF];

  const stands = [
    { pos: [0,  FIELD_L/2+20, 0], w: FIELD_W+50, d: 16, h: 22 },
    { pos: [0, -FIELD_L/2-20, 0], w: FIELD_W+50, d: 16, h: 22 },
    { pos: [ FIELD_W/2+13, 0, 0], w: 14,  d: FIELD_L+12, h: 22 },
    { pos: [-FIELD_W/2-13, 0, 0], w: 14,  d: FIELD_L+12, h: 22 },
  ];

  stands.forEach(({ pos, w, d, h }) => {
    // Concrete base
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), concreteMat);
    base.position.set(pos[0], h/2, pos[2]);
    base.receiveShadow = true; base.castShadow = true;
    scene.add(base);

    // Seat color rows (Argentina colors)
    const rowH = h / ARGENTINA_ROWS.length;
    ARGENTINA_ROWS.forEach((color, i) => {
      const seatMat = new THREE.MeshLambertMaterial({ color });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w-0.4, rowH-0.2, d-0.4), seatMat);
      seat.position.set(pos[0], (i + 0.5) * rowH, pos[2]);
      scene.add(seat);
    });

    // Roof overhang
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 4, 1, d + 4),
      new THREE.MeshLambertMaterial({ color: 0x555555 })
    );
    roof.position.set(pos[0], h + 0.5, pos[2]);
    roof.castShadow = true;
    scene.add(roof);
  });

  // Floodlight towers (4 corners)
  [[-FIELD_W/2-10, -FIELD_L/2-8], [FIELD_W/2+10, -FIELD_L/2-8],
   [-FIELD_W/2-10,  FIELD_L/2+8], [FIELD_W/2+10,  FIELD_L/2+8]].forEach(([x, z]) => {
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 30, 1.2), mat);
    tower.position.set(x, 15, z);
    tower.castShadow = true;
    scene.add(tower);
    // Lamp housing
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3),
      new THREE.MeshLambertMaterial({ color: 0xaaaaaa }));
    lamp.position.set(x, 30.5, z);
    scene.add(lamp);
  });
})();

/* ─── Football ──────────────────────────────────────────────── */
(function() {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0 })
  );
  ball.position.set(0, 0.11, 0);
  ball.castShadow = true;
  scene.add(ball);

  // Pentagon patches
  const patchMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  [0, 1, 2, 3, 4].forEach(i => {
    const a = (i/5)*Math.PI*2;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.038, 5), patchMat);
    patch.position.set(Math.cos(a)*0.085, 0.11 + Math.sin(a)*0.038, Math.sin(a)*0.085);
    patch.lookAt(0, 0.11, 0); patch.rotation.z += Math.PI;
    scene.add(patch);
  });
})();

/* ─── NPC Builder ───────────────────────────────────────────── */
function buildNPC(x, z, jerseyIdx) {
  const group    = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.random() * Math.PI * 2;

  const jMat = new THREE.MeshLambertMaterial({ map: JERSEY_TEXS[jerseyIdx % JERSEY_TEXS.length] });
  const hair = hairMats[Math.floor(Math.random() * hairMats.length)];

  // ── Helper: mesh + shadow + optional parent group
  function add(geo, mat, px, py, pz, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    (parent || group).add(m);
    return m;
  }
  function pivot(px, py, pz) {
    const g = new THREE.Group(); g.position.set(px, py, pz); group.add(g); return g;
  }

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.13, 0.08, 0.25);
  add(shoeGeo, shoeMat, -0.12, 0.04, 0.04);
  add(shoeGeo, shoeMat,  0.12, 0.04, 0.04);

  // Socks
  const sockGeo = new THREE.CylinderGeometry(0.072, 0.065, 0.27, 8);
  add(sockGeo, sockMat, -0.12, 0.55, 0);
  add(sockGeo, sockMat,  0.12, 0.55, 0);

  // Leg pivots (hip joint)
  const lLeg = pivot(-0.12, 1.04, 0);
  const rLeg = pivot( 0.12, 1.04, 0);
  const legGeo = new THREE.CylinderGeometry(0.075, 0.062, 0.60, 8);
  add(legGeo, shortsMat, 0, -0.30, 0, lLeg);
  add(legGeo, shortsMat, 0, -0.30, 0, rLeg);

  // Torso
  add(new THREE.BoxGeometry(0.42, 0.58, 0.23), jMat, 0, 1.30, 0);

  // Arm pivots (shoulder joint)
  const lArm = pivot(-0.27, 1.50, 0);
  const rArm = pivot( 0.27, 1.50, 0);
  const armGeo = new THREE.CylinderGeometry(0.058, 0.046, 0.52, 8);
  add(armGeo, jMat, 0, -0.26, 0, lArm);
  add(armGeo, jMat, 0, -0.26, 0, rArm);

  // Hands
  const handGeo = new THREE.SphereGeometry(0.062, 8, 6);
  add(handGeo, skinMat, -0.27, 0.99, 0);
  add(handGeo, skinMat,  0.27, 0.99, 0);

  // Neck
  add(new THREE.CylinderGeometry(0.076, 0.076, 0.11, 8), skinMat, 0, 1.62, 0);

  // Head
  add(new THREE.SphereGeometry(0.152, 14, 12), skinMat, 0, 1.79, 0);

  // Hair cap (upper hemisphere)
  const hairGeo = new THREE.SphereGeometry(0.160, 14, 12, 0, Math.PI*2, 0, Math.PI*0.52);
  add(hairGeo, hair, 0, 1.79, 0);

  // Eyes
  const eGeo = new THREE.SphereGeometry(0.022, 6, 5);
  add(eGeo, eyeMat, -0.059, 1.80,  0.138);
  add(eGeo, eyeMat,  0.059, 1.80,  0.138);

  // Eyebrows (subtle)
  const bGeo = new THREE.BoxGeometry(0.045, 0.012, 0.01);
  const bMat = new THREE.MeshBasicMaterial({ color: 0x1a0a00 });
  add(bGeo, bMat, -0.059, 1.836, 0.144);
  add(bGeo, bMat,  0.059, 1.836, 0.144);

  scene.add(group);

  // Waypoints
  const range = 20;
  const waypoints = Array.from({ length: 6 }, () => ({
    x: x + (Math.random()-0.5)*range,
    z: z + (Math.random()-0.5)*range
  }));

  return {
    group, lLeg, rLeg, lArm, rArm,
    phase:     Math.random() * Math.PI * 2,
    walkSpeed: 1.0 + Math.random() * 0.7,
    waypoints, wpIdx: 0,
    pauseTimer: Math.random() * 4,
    paused: false
  };
}

/* ─── Spawn NPCs ────────────────────────────────────────────── */
const NPC_SPAWN = [
  [0,-25], [12,-20], [-12,-20], [18,-10], [-18,-10],
  [22, 0], [-22, 0], [18, 10], [-18, 10], [10, 28],
  [-10, 28], [0, 42], [28,-38], [-28,-38], [32, 15],
  [-32, 15], [5, -5], [-6, 8]
];
const npcs = NPC_SPAWN.map(([x, z], i) => buildNPC(x, z, i));

/* ─── Player State ──────────────────────────────────────────── */
const player = { yaw: 0, pitch: 0, vy: 0, y: EYE_H, onGround: true };
const keys   = {};

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup',   e => { keys[e.code] = false; });

/* ─── Pointer Lock ──────────────────────────────────────────── */
let locked = false;
const overlay   = document.getElementById('overlay');
const hud       = document.getElementById('hud');
const pauseMsg  = document.getElementById('paused-msg');

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  overlay.style.display = locked ? 'none' : 'flex';
  hud.classList.toggle('visible', locked);
  pauseMsg.classList.toggle('show', !locked && overlay.style.display === 'none');
});

window.addEventListener('mousemove', e => {
  if (!locked) return;
  player.yaw   -= e.movementX * 0.0022;
  player.pitch -= e.movementY * 0.0022;
  player.pitch  = Math.max(-1.45, Math.min(1.45, player.pitch));
});

document.getElementById('startBtn').addEventListener('click', () => canvas.requestPointerLock());
pauseMsg.addEventListener('click', () => canvas.requestPointerLock());

// ESC pauses (pointer lock releases automatically)
window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && !locked) {
    pauseMsg.classList.remove('show');
    canvas.requestPointerLock();
  }
});

/* ─── Game Loop ─────────────────────────────────────────────── */
let prevTime = performance.now();

(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - prevTime) / 1000, 0.05);
  prevTime = now;
  const t = now / 1000;

  /* ── Player movement ── */
  if (locked) {
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    let mx = 0, mz = 0;

    if (keys['ArrowUp']    || keys['KeyW']) { mx -= sy; mz -= cy; }
    if (keys['ArrowDown']  || keys['KeyS']) { mx += sy; mz += cy; }
    if (keys['ArrowRight'] || keys['KeyD']) { mx += cy; mz -= sy; }
    if (keys['ArrowLeft']  || keys['KeyA']) { mx -= cy; mz += sy; }

    const len = Math.sqrt(mx*mx + mz*mz);
    if (len > 0) {
      camera.position.x += (mx/len) * MOVE_SPEED * dt;
      camera.position.z += (mz/len) * MOVE_SPEED * dt;
    }
    camera.position.x = Math.max(-62, Math.min(62, camera.position.x));
    camera.position.z = Math.max(-72, Math.min(72, camera.position.z));

    if (keys['Space'] && player.onGround) {
      player.vy = JUMP_VEL;
      player.onGround = false;
    }
  }

  /* ── Gravity ── */
  player.vy += GRAVITY * dt;
  player.y  += player.vy * dt;
  if (player.y <= EYE_H) {
    player.y = EYE_H; player.vy = 0; player.onGround = true;
  }
  camera.position.y = player.y;

  /* ── Camera orientation ── */
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  /* ── NPC animation ── */
  npcs.forEach(npc => {
    const ph    = npc.phase + t * npc.walkSpeed * 3.8;
    const swing = Math.sin(ph) * 0.48;

    // Walking limb swing
    npc.lLeg.rotation.x =  swing;
    npc.rLeg.rotation.x = -swing;
    npc.lArm.rotation.x = -swing * 0.52;
    npc.rArm.rotation.x =  swing * 0.52;

    // Subtle body bob
    npc.group.position.y = Math.max(0, Math.abs(Math.sin(ph)) * 0.06 - 0.01);

    if (npc.paused) {
      npc.pauseTimer -= dt;
      if (npc.pauseTimer <= 0) npc.paused = false;
      return;
    }

    // Move toward current waypoint
    const wp  = npc.waypoints[npc.wpIdx];
    const dx  = wp.x - npc.group.position.x;
    const dz  = wp.z - npc.group.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    if (dist > 0.4) {
      const step = npc.walkSpeed * 1.4 * dt;
      npc.group.position.x += (dx/dist) * step;
      npc.group.position.z += (dz/dist) * step;
      npc.group.rotation.y  = Math.atan2(dx, dz);
    } else {
      npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
      // Random pause at waypoint
      if (Math.random() < 0.3) {
        npc.paused     = true;
        npc.pauseTimer = 1.5 + Math.random() * 2.5;
      }
    }
  });

  renderer.render(scene, camera);
})( performance.now() );

/* ─── Resize ────────────────────────────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
