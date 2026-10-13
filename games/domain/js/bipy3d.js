import * as T from './vendor/three-runtime.mjs';

const characters = [
  ['gojo','Gojo Satoru','gojo'],['geto','Suguru Geto','geto'],
  ['yuji','Yuji Itadori','gojo'],['megumi','Megumi Fushiguro','gojo'],
  ['nobara','Nobara Kugisaki','gojo'],['sukuna','Ryomen Sukuna','geto'],
  ['yuta','Yuta Okkotsu','gojo'],['maki','Maki Zenin','gojo'],
  ['toge','Toge Inumaki','gojo'],['panda','Panda','gojo'],
  ['nanami','Kento Nanami','gojo'],['toji','Toji Fushiguro','geto'],['kenjaku','Kenjaku','geto'],
].map(([id,name,group])=>({id,name,group}));
const modelCache = new Map();
const loader = new T.GLTFLoader();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** @param {string} id */
async function modelFor(id) {
  if (!characters.some(item=>item.id===id)) throw new Error('Karakter tidak dikenal.');
  if (!modelCache.has(id)) {
    const url = new URL(`../assets/models/${id}.glb?v=domain3d-4`, import.meta.url);
    const pending = loader.loadAsync(url.href).then(gltf=>gltf.scene);
    modelCache.set(id,pending);
    pending.catch(()=>modelCache.delete(id));
  }
  return (await modelCache.get(id)).clone(true);
}

/** Real articulated GLB actor, lights, geometry and particles. */
async function create({container,character='gojo',mode='home'}) {
  let disposed=false,serial=0,actor=null,action='idle',started=performance.now(),last=started;
  let targetX=0,targetY=0,visible=true;
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.98;
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label',`Bipy ${character}, model 3D bergerak`);
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none';
  container.append(renderer.domElement);
  const illustration=document.createElement('div');
  illustration.className='cinematic-bipy';
  illustration.setAttribute('role','img');
  container.append(illustration);
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(34,1,.1,50);
  const stage=new T.Group();scene.add(stage);
  const actorGroup=new T.Group();stage.add(actorGroup);
  const effects=new T.Group();stage.add(effects);
  const hemi=new T.HemisphereLight(0xffffff,0x526ca7,1.8);scene.add(hemi);
  const key=new T.DirectionalLight(0xfff4df,3);key.position.set(3,6,5);
  key.castShadow=true;key.shadow.mapSize.set(512,512);scene.add(key);
  const rim=new T.DirectionalLight(0x54d8ff,3);rim.position.set(-4,3,-2);scene.add(rim);
  const fill=new T.PointLight(0x94eeff,8,9);fill.position.set(0,1.5,3.2);scene.add(fill);
  const floor=new T.Mesh(new T.CircleGeometry(2,64),new T.MeshStandardMaterial({color:0xc7eeff,metalness:.48,roughness:.28,transparent:true,opacity:.72}));
  floor.rotation.x=-Math.PI/2;floor.position.y=.01;floor.receiveShadow=true;stage.add(floor);
  const rings=[];
  for(let i=0;i<3;i++) {
    const material=new T.MeshBasicMaterial({color:0x62d7ff,transparent:true,opacity:.45-i*.1,blending:T.AdditiveBlending,depthWrite:false});
    const ring=new T.Mesh(new T.TorusGeometry(1.12+i*.23,.012,8,100),material);
    ring.rotation.x=Math.PI/2;ring.position.y=.12+i*.1;effects.add(ring);rings.push(ring);
  }
  const halo=new T.Mesh(new T.TorusGeometry(1.5,.025,12,96),new T.MeshBasicMaterial({color:0x7ee6ff,transparent:true,opacity:.4,blending:T.AdditiveBlending,depthWrite:false}));
  halo.position.set(0,1.72,-.65);effects.add(halo);
  const orbs=[];
  for(let i=0;i<9;i++) {
    const orb=new T.Mesh(new T.OctahedronGeometry(.05+(i%3)*.015),new T.MeshStandardMaterial({color:0xe4faff,emissive:0x43c9ff,emissiveIntensity:2,metalness:.4,roughness:.12}));
    effects.add(orb);orbs.push(orb);
  }
  const particleCount=mode==='preview'?45:130;
  const positions=new Float32Array(particleCount*3),speeds=[];
  for(let i=0;i<particleCount;i++) {const angle=i*2.39996,radius=.9+(i%11)*.12;positions.set([Math.sin(angle)*radius,(i%29)/7,Math.cos(angle)*radius],i*3);speeds.push(.06+(i%5)*.025);}
  const particlesGeometry=new T.BufferGeometry();particlesGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const particles=new T.Points(particlesGeometry,new T.PointsMaterial({color:0xa2eaff,size:.033,transparent:true,opacity:.78,blending:T.AdditiveBlending,depthWrite:false}));effects.add(particles);
  const beam=new T.Mesh(new T.CylinderGeometry(.16,.32,3.8,24,1,true),new T.MeshBasicMaterial({color:0x86eaff,transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));
  beam.position.set(0,2,-.5);effects.add(beam);
  /** @type {Record<string,import('./vendor/three-runtime.mjs').Object3D>} */
  let bones={};
  let baseRotations={};
  function palette(id) {
    const dark=characters.find(item=>item.id===id)?.group==='geto';
    const accent=dark?0xb873ff:0x66dfff;
    floor.material.color.setHex(dark?0x231334:0xb2eaff);
    floor.material.opacity=dark?.6:.7;
    hemi.groundColor.setHex(dark?0x301546:0x526ca7);
    rim.color.setHex(accent);fill.color.setHex(dark?0xe5b4ff:0xb2eeff);
    halo.material.color.setHex(accent);beam.material.color.setHex(accent);
    rings.forEach(ring=>ring.material.color.setHex(accent));
    particles.material.color.setHex(dark?0xe1b4ff:0xafefff);
    orbs.forEach(orb=>{orb.material.color.setHex(dark?0xcf8bff:0xe4faff);orb.material.emissive.setHex(accent)});
  }
  async function setCharacter(id) {
    const ticket=++serial;
    const next=await modelFor(id);
    if(disposed||ticket!==serial)return;
    if(actor)actorGroup.remove(actor);
    actor=next;actorGroup.add(actor);
    actor.traverse(item=>{if(item.isMesh){item.castShadow=true;item.receiveShadow=true;}});
    bones={};baseRotations={};
    for(const name of ['Head','Body','ArmL','ArmR','LegL','LegR']) {
      bones[name]=actor.getObjectByName(name);
      if(bones[name])baseRotations[name]=bones[name].rotation.clone();
    }
    palette(id);character=id;container.dataset.loadedCharacter=id;container.dataset.renderer='webgl2';
    illustration.replaceChildren();
    illustration.setAttribute('aria-label',`Ilustrasi Bipy ${characters.find(item=>item.id===id)?.name} bergerak`);
    const art=document.createElement(['gojo','geto','kenjaku'].includes(id)?'img':'div');
    art.className='bipy-art-sprite';
    if(art.tagName==='IMG'){art.src=new URL(`../assets/characters/${id}-action.png?v=clash5`,import.meta.url).href;art.alt='';}
    else {const index=characters.findIndex(item=>item.id===id);art.style.backgroundPosition=`${(index%4)*100/3}% ${Math.floor(index/4)*50}%`;}
    illustration.append(art);
    resize();
    renderer.domElement.setAttribute('aria-label',`Bipy ${characters.find(item=>item.id===id)?.name}, model 3D bergerak`);
  }
  function resize() {
    if(disposed)return;
    const {width,height}=container.getBoundingClientRect();
    if(width<1||height<1)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    const sprite=illustration.firstElementChild;
    if(sprite?.tagName==='DIV'){
      const bounds=illustration.getBoundingClientRect(),side=Math.min(bounds.width,bounds.height);
      Object.assign(sprite.style,{width:side+'px',height:side+'px',left:'50%',top:'50%',marginLeft:(-side/2)+'px',marginTop:(-side/2)+'px'});
    }
    const distance=mode==='preview'?7.4:mode==='arena'?7.8:7.05;
    const narrow=Math.max(1,.8/camera.aspect);
    camera.position.set(0,2.28,distance*narrow);camera.lookAt(0,1.77,0);camera.updateProjectionMatrix();
  }
  function setAction(next){if(!['idle','charge','cast','dodge','victory','dance'].includes(next))return;action=next;started=performance.now();container.dataset.action=action;}
  function aim(x,y){targetX=Math.max(-1,Math.min(1,x));targetY=Math.max(-1,Math.min(1,y));illustration.style.setProperty('--aim-x',`${targetX*16}px`);illustration.style.setProperty('--aim-y',`${targetY*10}px`);}
  function animate(now) {
    if(disposed)return;
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!visible||document.hidden||document.body.dataset.visual==='illustration'||container.getBoundingClientRect().width<1)return;
    const t=now/1000,phase=(now-started)/1000,motion=reduced?.18:1;
    if(actor) {
      actor.position.y=Math.sin(t*2.3)*.04*motion;
      actorGroup.rotation.y=T.MathUtils.lerp(actorGroup.rotation.y,targetX*.22+Math.sin(t*.45)*.075,dt*5);
      actorGroup.position.x=T.MathUtils.lerp(actorGroup.position.x,mode==='arena'?targetX*.48:0,dt*7);
      actorGroup.position.y=T.MathUtils.lerp(actorGroup.position.y,mode==='arena'?targetY*.16:0,dt*7);
      for(const [name,node]of Object.entries(bones))if(node)node.rotation.copy(baseRotations[name]);
      const wave=Math.sin(t*3)*motion;
      if(bones.Head){bones.Head.rotation.z+=Math.sin(t*1.4)*.055*motion;bones.Head.rotation.y+=Math.sin(t*.8)*.09*motion;}
      if(bones.ArmL)bones.ArmL.rotation.z+=.1+wave*.08;
      if(bones.ArmR)bones.ArmR.rotation.z-=.1-wave*.08;
      if(action==='charge'||action==='cast') {
        if(bones.ArmL){bones.ArmL.rotation.z+=.45;bones.ArmL.rotation.x-=.7;}
        if(bones.ArmR){bones.ArmR.rotation.z-=.45;bones.ArmR.rotation.x-=.7;}
        actor.position.y+=Math.sin(Math.min(phase,1.3)*Math.PI/2)*.15;
      } else if(action==='victory'||action==='dance') {
        if(bones.ArmL)bones.ArmL.rotation.z+=.9+wave*.14;
        if(bones.ArmR)bones.ArmR.rotation.z-=.9-wave*.14;
        if(bones.LegL)bones.LegL.rotation.x+=wave*.22;
        if(bones.LegR)bones.LegR.rotation.x-=wave*.22;
        actor.rotation.z=Math.sin(t*3)*.075*motion;
      } else if(action==='dodge') {actor.rotation.z=Math.sin(t*4)*.13*motion;actor.position.x=Math.sin(t*2)*.18*motion;}
      else {actor.rotation.z=T.MathUtils.lerp(actor.rotation.z,0,dt*6);actor.position.x=T.MathUtils.lerp(actor.position.x,0,dt*6);}
    }
    const energy=action==='charge'?1.5:action==='cast'?2.5:1;
    rings.forEach((ring,i)=>{ring.rotation.z=t*(.12+i*.06)*motion;const scale=1+Math.sin(t*2-i)*.025*energy;ring.scale.setScalar(scale);});
    halo.rotation.y=Math.sin(t*.6)*.16*motion;halo.scale.setScalar(1+Math.sin(t*1.5)*.018*energy);
    halo.material.opacity=action==='cast'?.72:.33;
    orbs.forEach((orb,i)=>{const angle=t*(.35+i*.025)*motion+i*Math.PI*2/9;const radius=1.35+(i%3)*.13;orb.position.set(Math.cos(angle)*radius,.7+(i%5)*.5+Math.sin(t*1.7+i)*.1,Math.sin(angle)*radius-.2);orb.rotation.set(t+i,t*.7,0);});
    for(let i=0;i<particleCount;i++){positions[i*3+1]+=dt*speeds[i]*energy*motion;if(positions[i*3+1]>4.2)positions[i*3+1]=.15;}
    particlesGeometry.attributes.position.needsUpdate=true;
    particles.rotation.y=t*.035*motion;
    beam.material.opacity=action==='cast'?.09*(.7+.3*Math.sin(t*9)):0;
    renderer.render(scene,camera);
  }
  const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;},{rootMargin:'100px'});intersection.observe(container);
  const observer=new ResizeObserver(resize);observer.observe(container);
  renderer.domElement.addEventListener('webglcontextlost',()=>{if(!disposed)container.dataset.renderer='context-lost';},{passive:true});
  function dispose(){if(disposed)return;disposed=true;serial++;observer.disconnect();intersection.disconnect();renderer.setAnimationLoop(null);effects.traverse(item=>{item.geometry?.dispose();if(item.material)item.material.dispose();});floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();illustration.remove();}
  try{await setCharacter(character);resize();renderer.setAnimationLoop(animate);}
  catch(error){dispose();throw error;}
  return {setCharacter,setAction,aim,resize,dispose};
}
window.Bipy3D=Object.freeze({characters,create});
