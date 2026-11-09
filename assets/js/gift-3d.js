import * as THREE from './three.module.js';
import { createGiftRibbon } from './gift-ribbon.js';
const $=s=>document.querySelector(s), stage=$('#stage'), action=$('#action'), hit=$('#gift-hit');
hit.disabled=true;
let state=0,busy=false,sceneVersion=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch{ $('#loading').textContent='المعاينة ثلاثية الأبعاد غير متاحة على هذا الجهاز. يمكنكِ متابعة فتح الهدية بالأزرار.'; }
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(33,1,.1,100);camera.position.set(5.2,4.4,6.8);camera.lookAt(0,.55,0);
if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;stage.prepend(renderer.domElement);$('#loading').hidden=true}
scene.add(new THREE.HemisphereLight(0xfff8ec,0xb9a6a0,2.5));const key=new THREE.DirectionalLight(0xfff4dc,4);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});key.shadow.bias=-.0004;key.shadow.normalBias=.02;key.shadow.radius=4;scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,2);fill.position.set(4,4,-4);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.15}));ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.receiveShadow=true;scene.add(ground);
// Fine paper grain, generated locally rather than relying on external textures.
const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=128;const tx=textureCanvas.getContext('2d');tx.fillStyle='#e9ddc7';tx.fillRect(0,0,128,128);let seed=3;for(let i=0;i<14000;i++){seed=(seed*16807)%2147483647;let x=seed%128;seed=(seed*16807)%2147483647;tx.fillStyle=i%2?'rgba(80,50,20,.025)':'rgba(255,255,255,.1)';tx.fillRect(x,seed%128,1,1)}const paperTexture=new THREE.CanvasTexture(textureCanvas);paperTexture.wrapS=paperTexture.wrapT=THREE.RepeatWrapping;paperTexture.repeat.set(3,3);paperTexture.colorSpace=THREE.SRGBColorSpace;
const paper=new THREE.MeshStandardMaterial({map:paperTexture,color:0xf5ead7,roughness:.76}),inner=new THREE.MeshStandardMaterial({color:0xcabb9d,roughness:.95}),silk=new THREE.MeshPhysicalMaterial({color:0x6a203a,roughness:.3,metalness:.25,clearcoat:.3,side:THREE.DoubleSide,sheen:1,sheenColor:new THREE.Color(0xc5798b),sheenRoughness:.45}),gold=new THREE.MeshStandardMaterial({color:0xb79557,metalness:.5,roughness:.32});
const gift=new THREE.Group();scene.add(gift);gift.rotation.y=-.12;
function block(w,h,d,mat,parent,x=0,y=0,z=0,bevel=.025){let shape=new THREE.Shape(),r=bevel;shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r,curveSegments:4});geo.translate(0,0,-d/2+r);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
block(2.55,.12,2.1,inner,gift,0,.08,0);block(2.55,1.25,.085,paper,gift,0,.69,1.02);block(2.55,1.25,.085,paper,gift,0,.69,-1.02);block(.085,1.25,2.04,paper,gift,-1.24,.69,0);block(.085,1.25,2.04,paper,gift,1.24,.69,0);
const lid=new THREE.Group();lid.position.y=1.39;gift.add(lid);block(2.7,.22,2.25,paper,lid);block(2.54,.035,2.1,inner,lid,0,-.13,0);
function label(text,sub,w=256,h=180){const c=document.createElement('canvas');c.width=w;c.height=h;const t=c.getContext('2d');t.fillStyle='#f6edda';t.fillRect(0,0,w,h);t.strokeStyle='#b39a72';t.strokeRect(8,8,w-16,h-16);t.fillStyle='#6b3943';t.textAlign='center';t.font='30px Georgia';t.fillText(text,w/2,h*.42);t.font='12px Georgia';t.fillText(sub,w/2,h*.67);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map,roughness:.7})}
const emblem=new THREE.Mesh(new THREE.PlaneGeometry(.47,.3),label('NOSHI','BAKERY'));emblem.position.set(.63,.8,1.068);gift.add(emblem);
// Opaque inner liners cover tiny extrusion seams; they use the existing paper material.
// Kept just inside the outer walls so they do not alter the box silhouette or ribbon.
for (const [w,h,d,x,z] of [[2.48,1.16,.07,0,.967],[2.48,1.16,.07,0,-.967],[.07,1.16,1.91,-1.185,0],[.07,1.16,1.91,1.185,0]]) {
  const liner=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),paper);
  liner.position.set(x,.69,z);gift.add(liner);
}
const ribbonSystem=createGiftRibbon(gift,silk);
const goods=new THREE.Group();gift.add(goods);goods.position.y=.15;
const productLoader = new THREE.TextureLoader();
const productMeshes=[];
function populateSceneProducts(items) {
  productMeshes.splice(0).forEach(m=>{goods.remove(m);m.traverse(c=>{if(c.geometry)c.geometry.dispose();if(c.material?.map)c.material.map.dispose();if(c.material && c.material!==paper)c.material.dispose()})});
  // Each order line gets one card slot, regardless of the product's category or image.
  // Never discard a card because its catalog image is unavailable.
  const visibleItems = items.slice(0,3);
  const positionsByCount = {
    1: [[0,.65,0]],
    2: [[-.62,.65,0],[.62,.65,0]],
    // Two separate upper corners; the third card is centered below them.
    // Vertical separation prevents the center card from covering either side.
    3: [[-.66,1.05,-.3],[.66,1.05,-.3],[0,.42,.38]]
  };
  visibleItems.forEach((item,i)=>{
    const product=new THREE.Group();goods.add(product);productMeshes.push(product);
    const [x,y,z]=positionsByCount[visibleItems.length][i];
    product.position.set(x,y,z);
    // Keep all cards parallel so left/right cards have equal visual width.
    product.rotation.y=0;
    product.rotation.z=0;
    block(1.02,1.08,.045,paper,product,0,0,0,.022);
    if(item.image){
      const texture=productLoader.load(item.image,()=>{},undefined,()=>{});
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=renderer?Math.min(renderer.capabilities.getMaxAnisotropy(),8):1;
      const photo=new THREE.Mesh(new THREE.PlaneGeometry(.92,.94),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,transparent:true}));
      photo.position.z=.047;product.add(photo);
    }
  });
}
// Tissue planes previously protruded through the gift wall as white wedges.
// The opaque box liner keeps the box clean in both closed and open states.
const motes=new THREE.Group();gift.add(motes);for(let i=0;i<28;i++){let m=new THREE.Mesh(new THREE.SphereGeometry(.012,5,4),gold);m.position.set(Math.sin(i*4)*1.4,1+(i%7)*.2,Math.cos(i*3)*1.1);m.userData.y=m.position.y;motes.add(m)}motes.visible=false;
let transition=null,hoverX=0,hoverY=0,openedAt=0;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function animateTo(kind,duration){return new Promise(resolve=>{transition={kind,start:performance.now(),duration:reduced?30:duration,resolve}})}
// NOSHI: preview and public token both populate the *same* Three.js scene.
const params=new URLSearchParams(location.search);
const preview=params.get('preview')==='1' && window.parent!==window;
// GitHub Pages serves /Noshi/g/<token> through the repository's 404.html fallback.
const shortPath=location.pathname.match(/^\/Noshi\/g\/([A-Za-z0-9_-]{20}|[A-Za-z0-9_-]{24}|[a-f0-9]{48})\/?$/);
const token=params.get('t')||shortPath?.[1]||'';
const allowedThemes=new Set(['rose','luxury','joy']);
let giftData=null, saving=false;
function finishThemeLoading(){document.body.classList.remove('gift-theme-pending');}
const catalog=Array.isArray(window.NOSHI_PRODUCTS)?window.NOSHI_PRODUCTS:[];
function safeText(value,max=120){return String(value??'').trim().slice(0,max)}
function resolvedItem(item){
  const product=catalog.find(p=>p.id===item.productId);
  const image=product?.image;
  return {name:safeText(item.name||product?.name||'هدية من نوشي'),description:safeText(product?.description||item.description||'',300),quantity:Math.max(1,Math.min(99,Number(item.quantity)||1)),image:typeof image==='string' && /^images\/[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|webp)$/i.test(image) && !image.includes('..') ?image:''};
}
const accents=new THREE.Group();gift.add(accents);
function selectSceneTheme(theme){
  const selected=allowedThemes.has(theme)?theme:'rose';
  document.body.dataset.theme=selected;
  const style={rose:[0xf3d6df,0xb97b8a,0xe9c1ca],luxury:[0x5e203a,0xc49a52,0x7d294c],joy:[0xffdd80,0x45c0af,0xff88a2]}[selected];
  paper.color.setHex(style[0]);silk.color.setHex(style[1]);inner.color.setHex(style[2]);
  accents.clear();
  if(selected==='rose'){
    // Soft petals float inside the gift after opening.
    for(let i=0;i<14;i++){let a=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshStandardMaterial({color:i%2?0xe9afc1:0xffffff,roughness:.8}));a.position.set(Math.cos(i*2.4)*1.1,.4+(i%5)*.22,Math.sin(i*2.4)*.8);accents.add(a)}
  }else if(selected==='luxury'){
    // Premium metallic corner fittings, without replacing the three-dimensional box.
    const trim=new THREE.MeshStandardMaterial({color:0xe2bd69,metalness:.9,roughness:.18});
    for(let x of [-1.24,1.24])for(let z of [-1.02,1.02]){const a=new THREE.Mesh(new THREE.BoxGeometry(.07,.99,.07),trim);a.position.set(x,.68,z);accents.add(a)}
  }else{
    const palette=[0xfd648f,0x5fd4c5,0xffd36e,0x9f8bf7];
    for(let i=0;i<18;i++){const a=new THREE.Mesh(new THREE.BoxGeometry(.045,.1,.045),new THREE.MeshStandardMaterial({color:palette[i%palette.length],metalness:.2}));a.position.set(Math.sin(i*2.1)*1.1,.8+(i%7)*.18,Math.cos(i*1.7)*.9);a.rotation.z=i*.8;accents.add(a)}
  }
}
function formatDate(date,time){
  const m=/^(\d{2}):(\d{2})$/.exec(time||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!m)return '';
  const h=Number(m[1]);return `${date.replaceAll('-','/')} — ${h>=12?'م':'ص'} ${h%12||12}:${m[2]}`;
}
function riyadhDate(addDays=0){
  const f=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'});
  const date=new Date(Date.now()+addDays*86400000);
  const p=Object.fromEntries(f.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const date=$('#date'),time=$('#time');
const dateText=$('#gift-date-text'),dateControl=$('#gift-date-control');
function updateDateText(){
  const normalized=/^\d{4}-\d{2}-\d{2}$/.test(date.value)?date.value.replaceAll('-','/'):'';
  dateText.textContent=normalized||'اختاري التاريخ';
  dateText.dir=normalized?'ltr':'rtl';
  dateControl.classList.toggle('has-value',Boolean(normalized));
}
date.addEventListener('change',updateDateText);
date.addEventListener('input',updateDateText);
updateDateText();
date.min=riyadhDate();date.max=riyadhDate(90);
for(let h=6;h<=23;h++)for(let m of [0,30]){
  const o=document.createElement('option');o.value=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  o.textContent=`${h>=12?'م':'ص'} ${h%12||12}:${String(m).padStart(2,'0')}`;time.append(o);
}
const midnight=document.createElement('option');midnight.value='00:00';midnight.textContent='ص 12:00';time.append(midnight);
const proposed=$('#proposed-appointment'), schedule=$('#schedule'), notice=$('#confirmation');
function showSchedule(){proposed.hidden=true;schedule.hidden=false;date.focus()}
function setNotice(message,good){notice.hidden=false;notice.textContent=message;notice.dataset.state=good?'success':'error';}
async function confirmDate(d,t){
  if(!giftData||saving)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d<date.min||d>date.max||![...time.options].some(x=>x.value===t)){
    setNotice('اختاري تاريخًا ووقتًا صحيحين.',false);return;
  }
  saving=true;notice.hidden=true;
  [...$('#delivery').querySelectorAll('button')].forEach(b=>b.disabled=true);
  try{
    if(preview){setNotice('هذه معاينة فقط. لن يُحفظ الموعد أو يُرسل أي طلب.',true)}
    else{
      const base=String(window.NOSHI_ORDER_API_URL||'').replace(/\/api\/orders\/?$/,'');
      const response=await fetch(`${base}/api/gifts/${encodeURIComponent(token)}/confirm`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:d,time:t}),cache:'no-store',referrerPolicy:'no-referrer'});
      const data=await response.json();
      if(!response.ok||!data.success)throw Error(data.message||'تعذر تأكيد الموعد. حاولي مرة أخرى.');
      setNotice('وصلنا اختيارك! بنراجع الموعد ونجهز هديتك بكل حب 💗',true);
    }
    proposed.hidden=true;schedule.hidden=true;
  }catch(error){setNotice(error.message||'تعذر حفظ الموعد. حاولي مرة أخرى.',false)}
  finally{saving=false;[...$('#delivery').querySelectorAll('button')].forEach(b=>b.disabled=false)}
}
$('#accept-proposed').onclick=()=>confirmDate(giftData.proposedDate,giftData.proposedTime);
$('#change-proposed').onclick=showSchedule;
schedule.onsubmit=e=>{e.preventDefault();if(e.target.reportValidity())confirmDate(date.value,time.value)};
function populateGift(data){
  if(!data||!allowedThemes.has(data.theme)||!Array.isArray(data.items))return;
  const isThemeChange=preview && giftData && giftData.theme!==data.theme;
  // Cancel any in-flight animation before rebuilding the preview. An old async
  // advance() continuation must never complete after the new theme is ready.
  ++sceneVersion;
  if(transition){const pending=transition;transition=null;pending.resolve()}
  giftData=data;selectSceneTheme(data.theme);
  $('#loading').hidden=true;hit.disabled=false;action.hidden=true;$('#reveal').hidden=true;notice.hidden=true;
  state=0;busy=false;$('#scene-spark').hidden=false;lid.position.set(0,1.39,0);lid.rotation.set(0,0,0);lid.scale.setScalar(1);
  gift.rotation.set(0,-.12,0);hoverX=0;hoverY=0;
  goods.position.set(0,.15,0);goods.visible=false;motes.visible=false;
  ribbonSystem.update(0,true); // snap geometry to the wrapped state, not 28% interpolation
  if(isThemeChange)window.scrollTo(0,0);
  const sender=safeText(data.senderName,80)||'مُهدية تحبّك';
  const recipient=safeText(data.recipientName,80)||'يا جميلة';
  $('.story h1').innerHTML='هناك من أراد أن يُسعد <span class="heartword">قلبكِ.</span>';
  // The suggested signature belongs only at the end of the paper letter.
  const signatureLine = `من ${sender} 💕`;
  const messageText = safeText(data.message,600);
  $('.letter p').textContent = messageText.endsWith(`\n${signatureLine}`)
    ? messageText.slice(0, -(signatureLine.length + 1)) : messageText;
  $('.signature span').textContent = `من ${sender}`;
  const products=$('.products');products.replaceChildren();
  const resolved=data.items.slice(0,32).map(resolvedItem);
  for(const item of resolved){
    const card=document.createElement('article');
    const art=document.createElement('div');art.className='product-art';
    if(item.image){const img=document.createElement('img');img.src=item.image;img.alt=item.name;img.loading='lazy';art.append(img)}
    else art.textContent='🧁';
    const name=document.createElement('h3');name.textContent=item.name;
    const desc=document.createElement('p');desc.className='product-description';desc.textContent=item.description;
    card.append(art,name,desc);
    if(item.quantity>1){const qty=document.createElement('span');qty.className='gift-qty';qty.textContent=`الكمية: ${item.quantity}`;card.append(qty)}
    products.append(card);
  }
  // Layout ONLY the HTML cards under “هدايا اختيرت لكِ بحب”.
  // Different product categories still occupy one card each.
  products.dataset.cardCount=String(resolved.length);
  populateSceneProducts(resolved);
  proposed.hidden=true;schedule.hidden=true;
  if(preview){$('#demo-note').hidden=false;$('#demo-note').textContent='هذه معاينة الهدية؛ تأكيد الموعد غير مفعل هنا.'}
  else{$('#demo-note').hidden=true}
  if(data.confirmedDate){setNotice(`✅ سبق تسجيل موعد التوصيل: ${formatDate(data.confirmedDate,data.confirmedTime)}`,true)}
  else if(data.locked){setNotice('تم اعتماد الطلب. لتعديل موعد التوصيل تواصلي مع فريق نوشي.',false)}
  else if(data.scheduleMode==='sender'&&data.proposedDate&&data.proposedTime){
    proposed.hidden=false;
    $('#proposed-heading').textContent=`${sender} اختارت لكِ هذا الموعد، هل يناسبك؟`;
    $('#proposed-value').textContent=formatDate(data.proposedDate,data.proposedTime);
  }else{schedule.hidden=false}
  $('#instruction').textContent='اضغطي على الشريط لفتح هديتك';
  hit.setAttribute('aria-label','اضغطي على شريط الهدية لفكه');
  finishThemeLoading();
  if(preview)window.parent.postMessage({type:'NOSHI_GIFT_PREVIEW_READY'},location.origin);
}
function openDetails(){if(state!==2||busy)return;$('#reveal').hidden=false;$('#reveal').scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})}
action.onclick=openDetails;
async function advance(){
  if(!giftData||busy||state===2)return;
  busy=true;hit.disabled=true;
  const openingVersion=sceneVersion;
  if(state===0){
    $('#instruction').textContent='الشريط ينفكّ…';
    await animateTo('ribbon',3600);if(openingVersion!==sceneVersion)return;state=1;
    $('#instruction').textContent='اضغطي على الغطاء';
    hit.setAttribute('aria-label','اضغطي على غطاء الهدية');
  }else{
    $('#instruction').textContent='الهدية تنفتح لكِ…';
    await animateTo('lid',2300);if(openingVersion!==sceneVersion)return;state=2;openedAt=performance.now();
    action.hidden=false;
    $('#instruction').textContent='';
    $('#scene-spark').hidden=true;
  }
  hit.disabled=state===2;busy=false;
}
hit.onclick=advance;
let pointerStart=0;
hit.onpointerdown=e=>pointerStart=e.clientY;
hit.onpointerup=e=>{if(state===1&&pointerStart-e.clientY>35)advance()};
stage.onpointermove=e=>{const r=stage.getBoundingClientRect();hoverX=((e.clientX-r.left)/r.width-.5)*.15;hoverY=((e.clientY-r.top)/r.height-.5)*.04};
stage.onpointerleave=()=>{hoverX=hoverY=0};
function frame(now){requestAnimationFrame(frame);if(!reduced){gift.rotation.y+=(-.12+Math.sin(now*.00055)*.11+hoverX*.3-gift.rotation.y)*.025;gift.rotation.x+=(Math.sin(now*.00044)*.025+hoverY*.3-gift.rotation.x)*.025;}if(transition){let t=Math.min(1,(now-transition.start)/transition.duration),e=ease(t);if(transition.kind==='ribbon'){ribbonSystem.update(t);}else{goods.visible=t>.24;const theme=giftData?.theme||'rose';
      lid.position.y=1.39+e*(theme==='joy'?3.4:theme==='luxury'?1.7:2.7);
      lid.position.x=-e*(theme==='luxury'?.6:theme==='joy'?-.3:2.15);
      lid.position.z=-e*(theme==='luxury'?1.6:theme==='joy'?-.3:.8);
      lid.rotation.z=e*(theme==='joy'?.65:theme==='luxury'?-.15:-.48);
      lid.rotation.x=e*(theme==='luxury'?-1.05:theme==='joy'?.35:-.4);lid.scale.setScalar(1-e*.22);goods.position.y=.15+Math.max(0,e-.2)*1.3;motes.visible=t>.45;motes.children.forEach((m,i)=>m.position.y=m.userData.y+e*.8+Math.sin(now*.001+i)*.08)}if(t===1){if(transition.kind==='lid')goods.visible=true;const resolve=transition.resolve;transition=null;resolve()}}else if(state===2&&!reduced){goods.position.y=1.19+Math.sin((now-openedAt)*.0015)*.035;motes.children.forEach((m,i)=>m.position.y=m.userData.y+.8+Math.sin(now*.001+i)*.1)}if(renderer)renderer.render(scene,camera)}requestAnimationFrame(frame);
function resize(){const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer?.setSize(w,h,false)}new ResizeObserver(resize).observe(stage);resize();
// A preview may only be populated by the same-origin parent cart.
if(preview){
  document.body.classList.add('gift-preview');
  const nonce=params.get('nonce');
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='NOSHI_GIFT_PREVIEW'||event.data.nonce!==nonce)return;
    populateGift(event.data.gift);
  });
  window.parent.postMessage({type:'NOSHI_GIFT_PREVIEW_READY'},location.origin);
}else if(!/^(?:[A-Za-z0-9_-]{20}|[A-Za-z0-9_-]{24}|[a-f0-9]{48})$/.test(token)){
  $('#loading').textContent='رابط الهدية غير صالح. تواصلي مع فريق نوشي.';
  finishThemeLoading();
}else{
  const base=String(window.NOSHI_ORDER_API_URL||'').replace(/\/api\/orders\/?$/,'');
  fetch(`${base}/api/gifts/${encodeURIComponent(token)}`,{cache:'no-store',referrerPolicy:'no-referrer'})
    .then(async response=>{const data=await response.json();if(!response.ok||!data.success)throw Error('الرابط غير متاح أو انتهت صلاحيته. تواصلي مع فريق نوشي.');populateGift(data.gift)})
    .catch(error=>{$('#loading').textContent=error.message||'تعذّر فتح الهدية، حاولي مرة أخرى.';finishThemeLoading()});
}
