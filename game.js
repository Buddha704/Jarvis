import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/* =========================================================
   STREET EMPIRE — complete replacement game.js
   ========================================================= */

const $ = id => document.getElementById(id);
const isTouchDevice = () => navigator.maxTouchPoints > 0 || "ontouchstart" in window;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79a8d4);
scene.fog = new THREE.Fog(0x79a8d4, 180, 1900);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .08, 2500);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("game").appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xb9d9ff, 0x253329, 2.0);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d1, 2.8);
sun.position.set(300, 650, 180);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left = -900; sun.shadow.camera.right = 900;
sun.shadow.camera.top = 900; sun.shadow.camera.bottom = -900;
scene.add(sun);

const ambientNight = new THREE.AmbientLight(0x4a6280, 0);
scene.add(ambientNight);

const WORLD = 5000;
const ROAD = 110;
const world = {roads:[], buildings:[], cars:[], npcs:[], police:[], props:[], lights:[]};

const mats = {
  grass:new THREE.MeshStandardMaterial({color:0x2d713b,roughness:1}),
  asphalt:new THREE.MeshStandardMaterial({color:0x25282c,roughness:.94}),
  sidewalk:new THREE.MeshStandardMaterial({color:0x8d9194,roughness:.9}),
  curb:new THREE.MeshStandardMaterial({color:0x62676b,roughness:.9}),
  white:new THREE.MeshStandardMaterial({color:0xe8e9e8,roughness:.8}),
  yellow:new THREE.MeshBasicMaterial({color:0xf1cf37}),
  glass:new THREE.MeshStandardMaterial({color:0x17384b,metalness:.1,roughness:.25,transparent:true,opacity:.8}),
  dark:new THREE.MeshStandardMaterial({color:0x111418,roughness:.8})
};

const grass = new THREE.Mesh(new THREE.PlaneGeometry(WORLD,WORLD),mats.grass);
grass.rotation.x = -Math.PI/2; grass.receiveShadow = true; scene.add(grass);

function box(w,h,d,material,x,y,z){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; scene.add(m); return m;
}

function road(x,z,w,d){
  box(w,.12,d,mats.asphalt,x,.06,z);
  const horizontal=w>d;
  const span=horizontal?w:d;
  for(let p=-span/2+30;p<span/2;p+=55){
    const line=box(horizontal?28:3,.13,horizontal?3:28,mats.yellow,
      horizontal?x+p:x,.13,horizontal?z:z+p);
    line.castShadow=false;
  }
  const sw=horizontal?ROAD+16:ROAD+16;
  if(horizontal){
    box(w, .08, 8, mats.sidewalk, x,.08,z-ROAD/2-4);
    box(w, .08, 8, mats.sidewalk, x,.08,z+ROAD/2+4);
  }else{
    box(8,.08,d,mats.sidewalk,x-ROAD/2-4,.08,z);
    box(8,.08,d,mats.sidewalk,x+ROAD/2+4,.08,z);
  }
  world.roads.push({x,z,w,d});
}

for(let p=-2000;p<=2000;p+=500){ road(0,p,WORLD,ROAD); road(p,0,ROAD,WORLD); }

function crosswalk(x,z,horizontal){
  for(let i=-5;i<=5;i++){
    if(horizontal) box(8,.04,4,mats.white,x+i*9,.15,z);
    else box(4,.04,8,mats.white,x,.15,z+i*9);
  }
}
for(let p=-2000;p<=2000;p+=500){crosswalk(p,55,false);crosswalk(55,p,true);}

const buildingColors=[0x4c5862,0x68737b,0x59636d,0x7b7169,0x4b5057,0x6c655d];

function createBuilding(x,z,w,d,h,type="office"){
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color:buildingColors[(Math.random()*buildingColors.length)|0],roughness:.88}));
  body.position.set(x,h/2,z); body.castShadow=true; body.receiveShadow=true; scene.add(body);
  world.buildings.push({mesh:body,box:new THREE.Box3().setFromObject(body)});

  for(let y=12;y<h-8;y+=18){
    for(let xx=-w/2+10;xx<w/2-6;xx+=17){
      const win=new THREE.Mesh(new THREE.BoxGeometry(7,8,.28),
        new THREE.MeshBasicMaterial({color:Math.random()>.78?0x20252a:0x9cc8d4}));
      win.position.set(x+xx,y,z-d/2-.18); scene.add(win);
      if(type==="tower" && Math.random()>.5){
        const win2=win.clone(); win2.position.z=z+d/2+.18; win2.rotation.y=Math.PI; scene.add(win2);
      }
    }
  }
  if(Math.random()>.55){
    box(Math.min(80,w*.65),3,.8,new THREE.MeshStandardMaterial({color:0x1d252c,emissive:0x111111}),x,h*.55,z-d/2-.45);
  }
}

for(let x=-2250;x<=2250;x+=500){
  for(let z=-2250;z<=2250;z+=500){
    const h=45+Math.random()*130;
    createBuilding(x+250,z+250,210+Math.random()*90,210+Math.random()*90,h,h>125?"tower":"office");
  }
}

function tree(x,z,scale=1){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2.5,14,8),new THREE.MeshStandardMaterial({color:0x5d3b26}));
  trunk.position.y=7;
  const crown=new THREE.Mesh(new THREE.SphereGeometry(10,10,8),new THREE.MeshStandardMaterial({color:0x235e32,roughness:1}));
  crown.position.y=17; g.add(trunk,crown); g.position.set(x,0,z); g.scale.setScalar(scale); g.traverse(o=>{if(o.isMesh)o.castShadow=true}); scene.add(g);
}
for(let i=0;i<260;i++){
  const x=THREE.MathUtils.randFloatSpread(WORLD-250),z=THREE.MathUtils.randFloatSpread(WORLD-250);
  if(Math.abs(x%500)<100 || Math.abs(z%500)<100) continue;
  tree(x,z,.75+Math.random()*.5);
}

function streetLight(x,z,rot=0){
  const g=new THREE.Group();
  box(1,14,1,mats.dark,x,7,z);
  const head=box(5,1,1.3,new THREE.MeshStandardMaterial({color:0x22272b,emissive:0x101010}),x+Math.sin(rot)*2,14,z+Math.cos(rot)*2);
  const lamp=new THREE.PointLight(0xffdca3,.8,75,2); lamp.position.set(x+Math.sin(rot)*4,13.5,z+Math.cos(rot)*4); lamp.castShadow=false;
  scene.add(lamp); world.lights.push(lamp);
}
for(let p=-2000;p<=2000;p+=250){streetLight(p,65,0);streetLight(65,p,Math.PI/2);}

function sign(x,z,text,color=0x1c7cbd){
  const board=box(28,12,1,new THREE.MeshStandardMaterial({color,roughness:.6}),x,8,z);
  const canvas=document.createElement("canvas"); canvas.width=256;canvas.height=96;
  const c=canvas.getContext("2d"); c.fillStyle="#fff";c.font="bold 38px Arial";c.textAlign="center";c.textBaseline="middle";c.fillText(text,128,48);
  const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Mesh(new THREE.PlaneGeometry(24,9),new THREE.MeshBasicMaterial({map:tex,transparent:true}));
  sprite.position.set(x,8.1,z-.55); scene.add(sprite);
  return board;
}
sign(120,130,"BANK",0x214f77); sign(-120,130,"GAS",0x7d3a25);

function createCharacter(skin,shirt,pants){
  const root=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.48,1.05,6,10),new THREE.MeshStandardMaterial({color:shirt}));
  body.position.y=1.55;
  const head=new THREE.Mesh(new THREE.SphereGeometry(.38,14,12),new THREE.MeshStandardMaterial({color:skin}));
  head.position.y=2.55;
  const pm=new THREE.MeshStandardMaterial({color:pants});
  const ll=new THREE.Mesh(new THREE.BoxGeometry(.25,.82,.3),pm), rl=ll.clone(); ll.position.set(-.18,.65,0);rl.position.set(.18,.65,0);
  const am=new THREE.MeshStandardMaterial({color:skin});
  const la=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.65,5,8),am), ra=la.clone(); la.position.set(-.63,1.55,0);ra.position.set(.63,1.55,0);
  root.add(body,head,ll,rl,la,ra); root.userData.parts={body,head,ll,rl,la,ra};
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return root;
}

const player={
  position:new THREE.Vector3(80,0,80),yaw:0,pitch:-.08,health:100,cash:500,wanted:0,
  mode:"third",inCar:false,car:null,ammo:15,maxAmmo:45,weapon:"GLOCK 22",
  inventory:{Green:0,Powder:0,Pills:0},outfit:{shirt:0x111318,pants:0x17191d}
};
let playerModel=createCharacter(0xb97b55,player.outfit.shirt,player.outfit.pants);
playerModel.position.copy(player.position);scene.add(playerModel);

const skinColors=[0xf0c3a2,0xd59a70,0xa96946,0x774a33,0x57372a,0x3f2920];
const shirtColors=[0xb23a35,0x275e9b,0x2d8a55,0x70429b,0xb37a24,0x22272d,0xd7d9da];
const pantsColors=[0x202329,0x30405a,0x554331,0x74787c];

function spawnNPC(kind="civilian"){
  const npc={kind,mesh:createCharacter(
    skinColors[(Math.random()*skinColors.length)|0],
    kind==="buyer"?0x2b7d57:kind==="seller"?0x7d2f72:shirtColors[(Math.random()*shirtColors.length)|0],
    pantsColors[(Math.random()*pantsColors.length)|0]),
    health:100,speed:.7+Math.random()*.5,target:new THREE.Vector3(),walk:Math.random()*10,fight:false,attack:0};
  npc.mesh.position.set(THREE.MathUtils.randFloatSpread(WORLD-500),0,THREE.MathUtils.randFloatSpread(WORLD-500));
  npc.target.copy(npc.mesh.position);chooseNPCTarget(npc);scene.add(npc.mesh);world.npcs.push(npc);
}
for(let i=0;i<75;i++)spawnNPC(i<8?"buyer":i<14?"seller":"civilian");

function chooseNPCTarget(n){n.target.set(n.mesh.position.x+THREE.MathUtils.randFloatSpread(300),0,n.mesh.position.z+THREE.MathUtils.randFloatSpread(300));}

const carColors=[0xa93636,0x2d5e99,0x2f7c4a,0xc49b25,0x68428d,0xd7d9da,0x14171a];

function createCar(color){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.35,.65,4.5),new THREE.MeshStandardMaterial({color}));
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.72,.62,2.15),new THREE.MeshStandardMaterial({color}));
  const glass=new THREE.Mesh(new THREE.BoxGeometry(1.75,.4,1.72),mats.glass.clone());
  /* Local car parts. */
  body.position.set(0,.75,0);roof.position.set(0,1.2,-.25);glass.position.set(0,1.25,-.25);g.add(body,roof,glass);
  const wm=new THREE.MeshStandardMaterial({color:0x090b0d});
  for(const x of [-1.08,1.08])for(const z of [-1.45,1.45]){
    const w=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.3,12),wm);w.rotation.z=Math.PI/2;w.position.set(x,.42,z);g.add(w);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}
function spawnCar(){
  const horizontal=Math.random()>.5, roadIndex=(Math.floor(Math.random()*9)-4)*500;
  const c={mesh:createCar(carColors[(Math.random()*carColors.length)|0]),speed:3+Math.random()*3,angle:0,occupied:false,driver:null,health:100,ai:true};
  if(horizontal){c.mesh.position.set(THREE.MathUtils.randFloatSpread(4000),0,roadIndex);c.angle=Math.random()>.5?0:Math.PI}
  else{c.mesh.position.set(roadIndex,0,THREE.MathUtils.randFloatSpread(4000));c.angle=Math.random()>.5?Math.PI/2:-Math.PI/2}
  c.mesh.rotation.y=c.angle;scene.add(c.mesh);world.cars.push(c);
}
for(let i=0;i<42;i++)spawnCar();

function createPistol(){
  const g=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color:0x1b1e21,metalness:.8,roughness:.28});
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.18,.65,.28),new THREE.MeshStandardMaterial({color:0x171717}));
  grip.position.set(0,-.22,0);
  const slide=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.75),metal);slide.position.set(0,.16,-.2);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.22,8),metal);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.16,-.63);
  g.add(grip,slide,barrel);g.visible=false;scene.add(g);return g;
}
const pistol=createPistol();

const dealerMarker=new THREE.Mesh(new THREE.CylinderGeometry(5,5,.25,24),new THREE.MeshStandardMaterial({color:0x39d873,emissive:0x123f23}));
dealerMarker.position.set(250,.2,250);scene.add(dealerMarker);
const bankMarker=new THREE.Mesh(new THREE.BoxGeometry(14,.3,14),new THREE.MeshStandardMaterial({color:0xe3b32b,emissive:0x2e2104}));
bankMarker.position.set(120,.2,130);scene.add(bankMarker);
const gasMarker=new THREE.Mesh(new THREE.BoxGeometry(14,.3,14),new THREE.MeshStandardMaterial({color:0xd04a3b,emissive:0x2e0b08}));
gasMarker.position.set(-120,.2,130);scene.add(gasMarker);

const missions=[
  {title:"First Run",text:"Buy one package from the dealer.",done:false},
  {title:"Make Some Money",text:"Sell something for profit.",done:false},
  {title:"Heat",text:"Reach wanted level 2, then escape.",done:false},
  {title:"Big Job",text:"Complete a bank or gas station robbery.",done:false}
];
let missionIndex=0;

const products=[{name:"Green",buy:40,sell:70},{name:"Powder",buy:100,sell:180},{name:"Pills",buy:75,sell:125}];

function updateMission(){
  const m=missions[missionIndex];
  $("missionTitle").textContent=m?m.title:"Free Roam";
  $("missionText").textContent=m?m.text:"Build your empire.";
}
function completeMission(){
  player.cash+=250;moneyBurst();toast("Mission complete. +$250");missionIndex++;updateMission();
}

function dealerOpen(){
  $("dealer").classList.add("show");renderDealer();
}
function renderDealer(){
  const c=$("dealerItems");c.innerHTML="";
  products.forEach(p=>{
    const row=document.createElement("div");row.className="dealer-item";
    row.innerHTML=`<div><strong>${p.name}</strong><br>Buy: $${p.buy}<br>Sell: $${p.sell}</div><div><button data-buy="${p.name}">BUY</button><button data-sell="${p.name}">SELL</button></div>`;
    c.appendChild(row);
  });
  c.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buyProduct(b.dataset.buy));
  c.querySelectorAll("[data-sell]").forEach(b=>b.onclick=()=>sellProduct(b.dataset.sell));
}
function buyProduct(name){
  const p=products.find(x=>x.name===name);
  if(player.cash<p.buy)return toast("Not enough cash.");
  player.cash-=p.buy;player.inventory[name]++;updateHUD();updateInventory();renderDealer();
  if(missionIndex===0)toast("Package purchased.");
}
function sellProduct(name){
  if(player.inventory[name]<=0)return toast("You don't have any.");
  const p=products.find(x=>x.name===name);player.inventory[name]--;player.cash+=p.sell;moneyBurst();
  updateHUD();updateInventory();renderDealer();
  if(missionIndex===1 && player.cash>=570)completeMission();
}

function updateInventory(){
  const c=$("inventoryItems");c.innerHTML="";
  Object.entries(player.inventory).forEach(([name,n])=>{
    const r=document.createElement("div");r.className="inventory-item";
    r.innerHTML=`<span>${name}</span><div><strong>${n}</strong> <button data-use="${name}">USE</button></div>`;
    c.appendChild(r);
  });
  c.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>consumeItem(b.dataset.use));
  $("inventoryCash").textContent="$"+player.cash;
}

function consumeItem(name){
  if(player.inventory[name]<=0)return toast("You don't have any.");
  player.inventory[name]--;
  player.health=Math.min(100,player.health+(name==="Green"?5:name==="Pills"?18:8));
  drugEffect(name);
  updateInventory();updateHUD();
}

function drugEffect(name){
  const overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;inset:0;z-index:55;pointer-events:none;background:rgba(100,255,150,.12);transition:opacity .7s";
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.style.opacity="0");
  setTimeout(()=>overlay.remove(),800);
  for(let i=0;i<18;i++){
    const a=Math.random()*Math.PI*2,r=.5+Math.random()*2;
    const p=new THREE.Mesh(new THREE.SphereGeometry(.06+Math.random()*.08,6,6),new THREE.MeshBasicMaterial({color:name==="Powder"?0xffffff:name==="Pills"?0x62b7ff:0x52e080}));
    p.position.copy(player.position).add(new THREE.Vector3(Math.cos(a)*r,.8+Math.random()*1.8,Math.sin(a)*r));scene.add(p);
    const life=.8+Math.random()*.7, start=performance.now();
    const tick=now=>{const q=Math.min(1,(now-start)/(life*1000));p.position.y+=.018;p.scale.setScalar(1-q);if(q<1)requestAnimationFrame(tick);else{scene.remove(p);p.geometry.dispose();p.material.dispose()}};
    requestAnimationFrame(tick);
  }
  toast(`${name} used.`);
}

function moneyBurst(){
  for(let i=0;i<16;i++){
    const bill=new THREE.Mesh(new THREE.BoxGeometry(.22,.015,.12),new THREE.MeshBasicMaterial({color:0x78d68b}));
    bill.position.copy(player.position).add(new THREE.Vector3((Math.random()-.5)*1.8,1+Math.random()*1.8,(Math.random()-.5)*1.8));
    scene.add(bill);
    let life=0;const tick=()=>{life+=.035;bill.position.y+=.035;bill.rotation.x+=.15;bill.rotation.z+=.12;if(life<1.4)requestAnimationFrame(tick);else{scene.remove(bill);bill.geometry.dispose();bill.material.dispose()}};requestAnimationFrame(tick);
  }
}

function toggleInventory(){$("inventory").classList.toggle("show");updateInventory();}

function customize(){
  $("shirtSelect").value="0x"+player.outfit.shirt.toString(16).padStart(6,"0");
  $("pantsSelect").value="0x"+player.outfit.pants.toString(16).padStart(6,"0");
  $("customizer").classList.add("show");
}
function saveOutfit(){
  player.outfit.shirt=parseInt($("shirtSelect").value);player.outfit.pants=parseInt($("pantsSelect").value);
  const p=playerModel.userData.parts;p.body.material.color.setHex(player.outfit.shirt);p.ll.material.color.setHex(player.outfit.pants);p.rl.material=p.ll.material;
  $("customizer").classList.remove("show");toast("Outfit saved.");
}

let robbery={active:false,kind:null,timer:0,reward:0};
function openRobbery(kind){
  robbery.kind=kind;
  $("robberyTitle").textContent=kind==="bank"?"Bank Job":"Gas Station Job";
  $("robberyText").textContent=kind==="bank"?"Start the bank job, survive the heat and collect $1,200.":"Hit the gas station and escape with $450.";
  $("robberyPanel").classList.add("show");
}
function startRobbery(){
  $("robberyPanel").classList.remove("show");
  robbery.active=true;robbery.timer=kindReward(robbery.kind).time;robbery.reward=kindReward(robbery.kind).reward;
  increaseWanted(2);toast("Job started. Get out alive.");
}
function kindReward(k){return k==="bank"?{time:18,reward:1200}:{time:10,reward:450};}
function updateRobbery(dt){
  if(!robbery.active)return;
  robbery.timer-=dt;
  if(robbery.timer<=0){player.cash+=robbery.reward;moneyBurst();robbery.active=false;toast(`Job complete. +$${robbery.reward}`);if(missionIndex===3)completeMission();}
  else if(Math.random()<dt*.18)toast(`${robbery.kind==="bank"?"BANK":"GAS"} JOB: ${Math.ceil(robbery.timer)}s`);
}

function collidesBuilding(pos,r=.65){
  for(const b of world.buildings){
    const q=b.box;
    if(pos.x>q.min.x-r&&pos.x<q.max.x+r&&pos.z>q.min.z-r&&pos.z<q.max.z+r)return true;
  }
  return false;
}

let verticalVelocity=0,grounded=true;
function jump(){if(player.inCar||!grounded)return;verticalVelocity=7.2;grounded=false;}
function gravity(dt){
  if(player.inCar)return;
  if(!grounded){verticalVelocity-=18*dt;player.position.y+=verticalVelocity*dt;if(player.position.y<=0){player.position.y=0;verticalVelocity=0;grounded=true}}
}

const keys={};
let inputMode=isTouchDevice()?"touch":"keyboard";
const joystick={x:0,y:0,id:null};
let lookPointer=null;

function setInputMode(mode){
  inputMode=mode;document.body.classList.toggle("touch-mode",mode==="touch");document.body.classList.toggle("keyboard-mode",mode==="keyboard");
}
setInputMode(inputMode);

addEventListener("keydown",e=>{
  setInputMode("keyboard");keys[e.code]=true;
  if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==="Space")jump();
  if(e.code==="KeyV")toggleCamera();
  if(e.code==="KeyI")toggleInventory();
  if(e.code==="KeyE")interact();
  if(e.code==="KeyF")attack();
  if(e.code==="KeyC")customize();
});
addEventListener("keyup",e=>keys[e.code]=false);

renderer.domElement.addEventListener("click",()=>{
  if(innerWidth>800 && inputMode==="keyboard")renderer.domElement.requestPointerLock?.();
});
document.addEventListener("mousemove",e=>{
  if(document.pointerLockElement!==renderer.domElement)return;
  player.yaw-=e.movementX*.0024;player.pitch-=e.movementY*.0024;clampPitch();
});
function clampPitch(){player.pitch=THREE.MathUtils.clamp(player.pitch,-1.18,.82);}

function onJoystickDown(e){
  e.preventDefault();e.stopPropagation();setInputMode("touch");joystick.id=e.pointerId;$("joystick").setPointerCapture?.(e.pointerId);moveJoystick(e);
}
function moveJoystick(e){
  if(joystick.id!==e.pointerId)return;
  const r=$("joystick").getBoundingClientRect(),max=r.width*.35;
  let x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);
  const len=Math.hypot(x,y);if(len>max){x=x/len*max;y=y/len*max}
  joystick.x=x/max;joystick.y=y/max;$("joystickKnob").style.transform=`translate(${x}px,${y}px)`;
}
function endJoystick(e){
  if(joystick.id!==e.pointerId)return;
  joystick.id=null;joystick.x=0;joystick.y=0;$("joystickKnob").style.transform="translate(0,0)";
}
$("joystick").addEventListener("pointerdown",onJoystickDown);
$("joystick").addEventListener("pointermove",moveJoystick);
$("joystick").addEventListener("pointerup",endJoystick);
$("joystick").addEventListener("pointercancel",endJoystick);

renderer.domElement.addEventListener("pointerdown",e=>{
  if(inputMode!=="touch" || e.clientX<innerWidth*.34 || e.clientY>innerHeight*.76)return;
  lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture?.(e.pointerId);
});
renderer.domElement.addEventListener("pointermove",e=>{
  if(!lookPointer||e.pointerId!==lookPointer.id)return;
  player.yaw-=(e.clientX-lookPointer.x)*.006;
  player.pitch-=(e.clientY-lookPointer.y)*.006;clampPitch();
  lookPointer.x=e.clientX;lookPointer.y=e.clientY;
});
["pointerup","pointercancel"].forEach(type=>renderer.domElement.addEventListener(type,e=>{if(lookPointer&&e.pointerId===lookPointer.id)lookPointer=null}));

function movement(dt){
  if(player.inCar){drive(dt);return;}
  let f=(keys.KeyW?1:0)-(keys.KeyS?1:0)-joystick.y;
  let s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joystick.x;
  const len=Math.hypot(f,s);if(len>1){f/=len;s/=len}
  const speed=(keys.ShiftLeft||keys.ShiftRight)?7.5:4.5;
  const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),player.yaw);
  const right=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),player.yaw);
  const delta=forward.multiplyScalar(f*speed*dt).add(right.multiplyScalar(s*speed*dt));
  const next=player.position.clone().add(delta);
  if(Math.abs(next.x)<WORLD/2-30&&Math.abs(next.z)<WORLD/2-30&&!collidesBuilding(next,.7))player.position.copy(next);
  playerModel.position.copy(player.position);playerModel.rotation.y=player.yaw;
  animateCharacter(playerModel,f,s,speed>6,dt);
}

let walkClock=0;
function animateCharacter(model,f,s,run,dt){
  const p=model.userData.parts,moving=Math.abs(f)+Math.abs(s)>.08;
  if(moving){walkClock+=dt*(run?13:8);const a=Math.sin(walkClock)*.55;p.ll.rotation.x=a;p.rl.rotation.x=-a;p.la.rotation.x=-a;p.ra.rotation.x=a}
  else{p.ll.rotation.x*=.8;p.rl.rotation.x*=.8;p.la.rotation.x*=.8;p.ra.rotation.x*=.8}
}

function findCar(){
  let best=null,d=6;
  for(const c of world.cars)if(!c.occupied){const n=c.mesh.position.distanceTo(player.position);if(n<d){d=n;best=c}}
  return best;
}
function enterCar(c){
  player.inCar=true;player.car=c;c.occupied=true;c.ai=false;player.position.copy(c.mesh.position);playerModel.visible=false;pistol.visible=false;$("vehicleHud").style.display="block";toast("Vehicle entered.");
}
function exitCar(){
  const c=player.car;if(!c)return;player.inCar=false;c.occupied=false;c.ai=true;
  player.position.copy(c.mesh.position);player.position.x+=Math.cos(c.mesh.rotation.y)*3.2;player.position.z-=Math.sin(c.mesh.rotation.y)*3.2;player.car=null;
  playerModel.visible=player.mode!=="first";$("vehicleHud").style.display="none";toast("Vehicle exited.");
}
function drive(dt){
  const c=player.car;if(!c)return;
  let t=(keys.KeyW?1:0)-(keys.KeyS?1:0)-joystick.y,s=(keys.KeyA?1:0)-(keys.KeyD?1:0)+joystick.x;
  c.speed+=t*11*dt;c.speed*=.987;c.speed=THREE.MathUtils.clamp(c.speed,-14,32);
  c.mesh.rotation.y+=s*c.speed*.032*dt;
  const dir=new THREE.Vector3(0,0,1).applyQuaternion(c.mesh.quaternion);
  const next=c.mesh.position.clone().add(dir.multiplyScalar(c.speed*dt));
  if(!collidesBuilding(next,1.6))c.mesh.position.copy(next);else c.speed*=-.2;
  player.position.copy(c.mesh.position);$("vehicleSpeed").textContent=`${Math.abs(c.speed*3).toFixed(0)} MPH`;
  pistol.visible=false;
}

function cameraDirection(){
  return new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(player.pitch,player.yaw,0,"YXZ")).normalize();
}
const camTarget=new THREE.Vector3(),camDesired=new THREE.Vector3();

function updateCamera(dt){
  const dir=cameraDirection();
  if(player.inCar){vehicleCamera(dt,dir);return}
  if(player.mode==="first"){
    camTarget.copy(player.position);camTarget.y+=1.62;
    camera.position.lerp(camTarget,1-Math.pow(.00001,dt));
    camera.rotation.order="YXZ";camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;
    pistol.visible=true;pistol.position.copy(camera.position);pistol.quaternion.copy(camera.quaternion);
    const offset=new THREE.Vector3(.25,-.18,-.55).applyQuaternion(camera.quaternion);pistol.position.add(offset);
    return;
  }
  pistol.visible=false;camTarget.copy(player.position);camTarget.y+=1.35;
  camDesired.copy(camTarget).add(dir.clone().multiplyScalar(-7));camDesired.y+=2.0;
  const minY=1.0;camDesired.y=Math.max(minY,camDesired.y);
  const desiredDir=camDesired.clone().sub(camTarget).normalize(),distance=camTarget.distanceTo(camDesired);
  const ray=new THREE.Raycaster(camTarget,desiredDir,.2,distance);
  const hits=ray.intersectObjects(scene.children,true);
  let final=camDesired.clone();
  for(const h of hits){
    if(h.object===grass||h.object.parent===playerModel)continue;
    if(h.distance<distance){final=camTarget.clone().add(desiredDir.multiplyScalar(Math.max(1.0,h.distance-.4)));break}
  }
  final.y=Math.max(0.9,final.y);
  camera.position.lerp(final,1-Math.pow(.0001,dt));
  const look=camTarget.clone().add(dir.clone().multiplyScalar(100));camera.lookAt(look);
}
function vehicleCamera(dt,dir){
  if(player.mode==="first"){
    camera.position.lerp(player.car.mesh.position.clone().add(new THREE.Vector3(0,1.45,-.7).applyQuaternion(player.car.mesh.quaternion)),1-Math.pow(.0001,dt));
    camera.rotation.order="YXZ";camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;
  }else{
    const desired=player.car.mesh.position.clone().add(dir.clone().multiplyScalar(-9));desired.y=Math.max(1.2,desired.y+3.2);
    camera.position.lerp(desired,.12);camera.lookAt(player.car.mesh.position.clone().add(new THREE.Vector3(0,1,0)).add(dir.clone().multiplyScalar(100)));
  }
}

function toggleCamera(){
  player.mode=player.mode==="first"?"third":"first";playerModel.visible=player.mode!=="first";toast(player.mode==="first"?"First person":"Third person");
}

function attack(){
  if(player.inCar){shoot();return}
  let target=null,d=4;
  for(const n of world.npcs)if(n.health>0){const q=n.mesh.position.distanceTo(player.position);if(q<d){d=q;target=n}}
  if(!target)return toast("Nobody close enough.");
  target.health-=35;target.fight=true;increaseWanted(.5);toast("Hit");
  if(target.health<=0){target.mesh.rotation.z=Math.PI/2;toast("NPC knocked down.")}
}
function shoot(){
  if(player.ammo<=0)return toast("Out of ammo.");
  player.ammo--;increaseWanted(1);
  const ray=new THREE.Raycaster(camera.position,cameraDirection(),0,80);
  const hits=ray.intersectObjects(world.npcs.filter(n=>n.health>0).map(n=>n.mesh),true);
  if(hits.length){
    let o=hits[0].object;while(o.parent&&!world.npcs.some(n=>n.mesh===o))o=o.parent;
    const n=world.npcs.find(n=>n.mesh===o);if(n){n.health-=60;n.fight=true}
  }
  toast("Shot fired.");
}

function updateNPCs(dt){
  for(const n of world.npcs){
    if(n.health<=0)continue;
    const d=n.mesh.position.distanceTo(player.position);
    if(n.fight&&d<3){n.attack-=dt;if(n.attack<=0){player.health-=8;n.attack=1}continue}
    if(n.fight){n.mesh.position.add(player.position.clone().sub(n.mesh.position).normalize().multiplyScalar(n.speed*dt));continue}
    if(n.mesh.position.distanceTo(n.target)<3)chooseNPCTarget(n);
    n.mesh.position.add(n.target.clone().sub(n.mesh.position).normalize().multiplyScalar(n.speed*dt));
    n.mesh.lookAt(n.target.x,n.mesh.position.y,n.target.z);
    n.walk+=dt*5;const a=Math.sin(n.walk)*.35,p=n.mesh.userData.parts;p.ll.rotation.x=a;p.rl.rotation.x=-a;p.la.rotation.x=-a;p.ra.rotation.x=a;
  }
}

function updateTraffic(dt){
  for(const c of world.cars){
    if(c.occupied||!c.ai)continue;
    const dir=new THREE.Vector3(0,0,1).applyQuaternion(c.mesh.quaternion);
    c.mesh.position.add(dir.multiplyScalar(c.speed*dt));
    if(Math.abs(c.mesh.position.x)>2200||Math.abs(c.mesh.position.z)>2200)c.mesh.position.multiplyScalar(-.95);
  }
}

function spawnPolice(){
  const p={mesh:createCharacter(0xd29b76,0x183b68,0x101a32),speed:1.8,attack:0,health:100};
  p.mesh.position.copy(player.position).add(new THREE.Vector3(THREE.MathUtils.randFloat(-80,80),0,THREE.MathUtils.randFloat(-80,80)));
  scene.add(p.mesh);world.police.push(p);
}
let wantedTimer=0;
function increaseWanted(n){player.wanted=THREE.MathUtils.clamp(player.wanted+n,0,5);wantedTimer=18}
function updateWanted(dt){
  if(player.wanted>0){wantedTimer-=dt;if(wantedTimer<=0&&world.police.length===0)player.wanted=Math.max(0,player.wanted-dt*.12)}
  const desired=Math.ceil(player.wanted);
  while(world.police.length<desired)spawnPolice();
  for(let i=world.police.length-1;i>=0;i--){
    const p=world.police[i],d=p.mesh.position.distanceTo(player.position);
    if(d>1800){scene.remove(p.mesh);world.police.splice(i,1);continue}
    p.mesh.position.add(player.position.clone().sub(p.mesh.position).normalize().multiplyScalar(p.speed*dt));
    p.mesh.lookAt(player.position.x,p.mesh.position.y,player.position.z);
    if(d<3){p.attack-=dt;if(p.attack<=0){player.health-=12;p.attack=1}}
  }
}

function nearestInteraction(){
  if(player.inCar)return {type:"car",distance:0};
  const car=findCar();if(car)return {type:"car",object:car};
  const d=player.position.distanceTo(dealerMarker.position);if(d<15)return {type:"dealer"};
  if(player.position.distanceTo(bankMarker.position)<18)return {type:"bank"};
  if(player.position.distanceTo(gasMarker.position)<18)return {type:"gas"};
  return null;
}
function interact(){
  const x=nearestInteraction();if(!x)return toast("Nothing nearby.");
  if(x.type==="car")return enterCar(x.object);
  if(x.type==="dealer")return dealerOpen();
  if(x.type==="bank")return openRobbery("bank");
  if(x.type==="gas")return openRobbery("gas");
}

function checkMission(){
  if(missionIndex===0&&Object.values(player.inventory).some(v=>v>0)){completeMission();return}
  if(missionIndex===2&&player.wanted>=2&&world.police.length===0){completeMission();return}
}

function updatePrompt(){
  const x=nearestInteraction(),p=$("interactionPrompt");
  if(!x){p.classList.remove("show");p.textContent="";return}
  const text=x.type==="car"?"ENTER VEHICLE":x.type==="dealer"?"OPEN DEALER":x.type==="bank"?"BANK JOB":x.type==="gas"?"GAS STATION JOB":"INTERACT";
  p.textContent=`${text} • ${inputMode==="touch"?"INTERACT":"E"}`;p.classList.add("show");
}

function updateHUD(){
  $("cash").textContent="$"+player.cash;
  $("healthFill").style.width=Math.max(0,player.health)+"%";
  const stars=Math.ceil(player.wanted);$("wanted").textContent="★".repeat(stars)+"☆".repeat(5-stars);
  $("weaponHud").textContent=player.weapon;$("ammoHud").textContent=`${player.ammo} / ${player.maxAmmo}`;
}
let toastTimer;
function toast(text){$("message").textContent=text;$("message").style.opacity="1";clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("message").style.opacity="0",1700)}

function updateDayNight(t){
  const day=(Math.sin(t*.015)+1)/2;
  const sky=new THREE.Color().lerpColors(new THREE.Color(0x07101d),new THREE.Color(0x79a8d4),day);
  scene.background.copy(sky);scene.fog.color.copy(sky);
  sun.intensity=.55+2.3*day;hemi.intensity=.7+1.4*day;ambientNight.intensity=(1-day)*.5;
  world.lights.forEach(l=>l.intensity=(1-day)*1.8);
}

function checkDeath(){
  if(player.health>0)return;
  player.health=100;player.position.set(80,0,80);player.wanted=0;player.cash=Math.max(0,player.cash-100);
  world.police.forEach(p=>scene.remove(p.mesh));world.police.length=0;toast("You were taken down. -$100");
}

$("playButton").onclick=()=>{$("startScreen").style.display="none";setInputMode(isTouchDevice()?"touch":"keyboard");toast("Welcome to Street Empire.")};
$("jumpButton").onclick=()=>jump();$("attackButton").onclick=()=>attack();$("enterButton").onclick=()=>interact();$("cameraButton").onclick=()=>toggleCamera();$("inventoryButton").onclick=()=>toggleInventory();$("interactButton").onclick=()=>interact();$("customizeButton").onclick=()=>customize();
$("closeInventory").onclick=()=>$("inventory").classList.remove("show");
$("closeDealer").onclick=()=>$("dealer").classList.remove("show");
$("closeCustomizer").onclick=()=>$("customizer").classList.remove("show");
$("closeRobbery").onclick=()=>$("robberyPanel").classList.remove("show");
$("startRobbery").onclick=startRobbery;$("saveCustomizer").onclick=saveOutfit;

$("inventoryButton").addEventListener("dblclick",customize);

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
});

const clock=new THREE.Clock();let worldTime=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);worldTime+=dt;
  movement(dt);gravity(dt);updateNPCs(dt);updateTraffic(dt);updateWanted(dt);updateRobbery(dt);updateCamera(dt);
  checkMission();updatePrompt();updateHUD();checkDeath();updateDayNight(worldTime);
  renderer.render(scene,camera);
}
updateMission();updateInventory();updateHUD();animate();
