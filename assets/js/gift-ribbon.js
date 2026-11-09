import * as THREE from './three.module.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const v=(x,y,z=0)=>new THREE.Vector3(x,y,z);

// The wrap follows explicit exterior waypoints. Unlike an unconstrained spline,
// no interpolated segment can cut through the lid corners or the box walls.
function exteriorPath(extent,top,body){
  const outer=extent+.035;
  const path=new THREE.CurvePath();
  const line=(a,b)=>path.add(new THREE.LineCurve3(a,b));
  const bend=(a,b,c)=>path.add(new THREE.QuadraticBezierCurve3(a,b,c));
  line(v(0,-.022),v(body-.08,-.022));
  bend(v(body-.08,-.022),v(body,-.022),v(body,.09));
  line(v(body,.09),v(body,1.15));
  bend(v(body,1.15),v(body,1.21),v(outer,1.255));
  line(v(outer,1.255),v(outer,top-.085));
  bend(v(outer,top-.085),v(outer,top),v(outer-.085,top));
  line(v(outer-.085,top),v(0,top));
  path.arcLengthDivisions=1000;
  return path;
}

// Arc-length lookup keeps the satin length stable as its free end peels away.
function measured(points){
  const distances=[0];
  for(let i=1;i<points.length;i++)distances.push(distances[i-1]+points[i].distanceTo(points[i-1]));
  return {points,distances,length:distances.at(-1)};
}
function atLength(table,s){
  s=Math.max(0,Math.min(table.length,s));
  let a=0,b=table.distances.length-1;
  while(a+1<b){const m=(a+b)>>1;if(table.distances[m]<s)a=m;else b=m}
  const t=(s-table.distances[a])/(table.distances[b]-table.distances[a]||1);
  return table.points[a].clone().lerp(table.points[b],t);
}
function toWorld(p,axis,side){return axis==='x'?v(p.x*side,p.y,p.z*side):v(p.z*side,p.y,p.x*side)}

export function createGiftRibbon(parent,material){
  const group=new THREE.Group();parent.add(group);
  const meshes=[];
  function protectBox(p){
    // Check the whole sheet, not just its spine: curled edges have width too.
    for(const [x,z,low,high] of [[1.316,1.071,-.013,1.348],[1.383,1.133,1.247,1.533]]){
      if(Math.abs(p.x)<x&&Math.abs(p.z)<z&&p.y>low&&p.y<high){
        const distances=[x-Math.abs(p.x),z-Math.abs(p.z),p.y-low,high-p.y];
        const closest=distances.indexOf(Math.min(...distances));
        if(closest===0)p.x=(p.x<0?-1:1)*x;
        else if(closest===1)p.z=(p.z<0?-1:1)*z;
        else p.y=closest===2?low:high;
      }
    }
  }
  function sheet(width,axis,rows=128,collision=false){
    const across=6,positions=new Float32Array((rows+1)*(across+1)*3),uv=[],indices=[];
    for(let i=0;i<=rows;i++)for(let j=0;j<=across;j++){
      uv.push(j/across,i/rows);
      if(i<rows&&j<across){const a=i*(across+1)+j,b=a+across+1;indices.push(a,b,a+1,b,b+1,a+1)}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);
    const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);meshes.push(mesh);
    let ready=false;
    return {mesh,update(centerline,twist=()=>0,settle=1){
      for(let i=0;i<=rows;i++){
        const u=i/rows,p=centerline(u),tangent=centerline(Math.min(1,u+.0005)).sub(centerline(Math.max(0,u-.0005))).normalize();
        const acrossVector=axis==='x'?v(0,0,1):v(1,0,0);
        acrossVector.addScaledVector(tangent,-acrossVector.dot(tangent)).normalize().applyAxisAngle(tangent,twist(u));
        const normal=new THREE.Vector3().crossVectors(tangent,acrossVector).normalize();
        for(let j=0;j<=across;j++){
          const s=j/across*2-1;
          // A very slight crown catches highlights without a flat plastic look.
          const q=p.clone().addScaledVector(acrossVector,s*width/2).addScaledVector(normal,Math.sin(j/across*Math.PI)*.0015);
          if(collision)protectBox(q);
          const offset=(i*(across+1)+j)*3;
          // Dampen sudden free-tail geometry changes when the peeling edge
          // passes a corner, without slowing the bow or affecting hit targets.
          if(ready && settle<1){
            positions[offset]=mix(positions[offset],q.x,settle);
            positions[offset+1]=mix(positions[offset+1],q.y,settle);
            positions[offset+2]=mix(positions[offset+2],q.z,settle);
          } else q.toArray(positions,offset);
        }
      }
      ready=true;
      geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
    }};
  }
  // The settled-ribbon profile is immutable. Do not rebuild and remeasure it
  // four times on every animation frame during the final drop.
  const groundShape=measured(Array.from({length:101},(_,i)=>{
    const u=i/100;
    return v(.9*u+.2*Math.sin(4*u),0,.38*(1-Math.cos(2*Math.PI*u)));
  }));
  const bands=[];
  for(const axis of ['x','z'])for(const side of [-1,1]){
    const extent=axis==='x'?1.375:1.15,top=axis==='x'?1.568:1.548;
    const curve=exteriorPath(extent,top,axis==='x'?1.323:1.078),table=measured(curve.getSpacedPoints(800));
    // Keep the portion beneath the base in place; released silk settles outside.
    const anchor=extent+.04;
    bands.push({axis,side,top,extent,table,anchor,sheet:sheet(.245,axis,128,true)});
  }
  const loops=[-1,1].map(side=>({side,sheet:sheet(.235,'x',100)}));
  const tails=[-1,1].map(side=>({side,sheet:sheet(.235,'z',100)}));
  const knot=sheet(.25,'x',60);
  function bowLoop(u,side,release){
    const a=v(.065,1.65,0),b=v(.77,1.83,0);
    const curve=u<=.5
      ?new THREE.CubicBezierCurve3(a,v(.30,2.03,-.06),v(.91,2.16,-.08),b)
      :new THREE.CubicBezierCurve3(b,v(.65,1.60,.04),v(.22,1.61,.06),a);
    const point=curve.getPoint(u<=.5?u*2:(u-.5)*2);
    point.x=side*mix(point.x,.19,release);
    point.y=mix(point.y,1.65,release);point.z*=1-release;
    return point;
  }
  function update(progress, forceReset=false){
    const untying=smooth(progress/.28);
    loops.forEach(({side,sheet})=>{
      sheet.mesh.visible=untying<.999;
      sheet.update(u=>bowLoop(u,side,untying),u=>Math.sin(u*Math.PI*2)*.22*(1-untying));
    });
    tails.forEach(({side,sheet})=>{
      const pull=smooth(progress/.35);
      const curve=new THREE.CubicBezierCurve3(v(side*.04,1.64,0),v(side*(.18+pull*.15),1.64+pull*.10,side*.4),v(side*.25,1.59+pull*.20,side*(.7+pull*.15)),v(side*.26,1.58+pull*.12,side*(1.01+pull*.05)));
      const feed=smooth((progress-.22)/.16);
      sheet.mesh.visible=feed<.999;
      // The tail pulls the last loop through the knot, then joins the peeling band.
      sheet.update(u=>curve.getPoint(feed+u*(1-feed)).add(v(0,0,side*pull*.16)),u=>.08*Math.sin(u*Math.PI));
    });
    knot.mesh.visible=progress<.28;
    knot.update(u=>v(Math.sin(u*Math.PI*2)*(.085-untying*.06),1.65+Math.cos(u*Math.PI*2)*.075,0));
    for(const band of bands){
      const {axis,side,table,anchor,sheet,top}=band;
      const delay=axis==='x'?.23:.37;
      const p=smooth((progress-delay)/(1-delay));
      const attached=mix(table.length,anchor,p),freeLength=table.length-attached;
      const root=atLength(table,attached),tan=atLength(table,Math.min(table.length,attached+.095)).sub(atLength(table,Math.max(0,attached-.095))).normalize();
      let free;
      if(freeLength>.0001){
        // The peel begins tangent to the contact surface and bends outward.
        // On top it curls up; around an edge it opens into a hanging arc.
        const angle=Math.atan2(tan.y,tan.x),flatten=smooth((p-.75)/.25);
        const groundScale=freeLength/groundShape.length;
        const points=[];
        for(let i=0;i<=100;i++){
          const u=i/100,a=angle-Math.PI*u;
          const r=freeLength/Math.PI;
          let x=root.x+r*(Math.sin(angle)-Math.sin(a));
          let y=root.y+r*(Math.cos(a)-Math.cos(angle));
          const floor=atLength(groundShape,u*groundShape.length).multiplyScalar(groundScale);
          x=mix(x,root.x+floor.x,flatten);
          y=mix(y,mix(root.y,.013,u)+Math.sin(u*Math.PI*3)**2*.022,flatten);
          // Guide the free satin smoothly around the overhanging lid and wall.
          // The old y/top threshold switched x/y constraints in a single frame,
          // making the band appear to catch just before it reached the floor.
          const edge=axis==='x'?1.438:1.213;
          const contact=smooth((top+.13-y)/.17);
          const wall=smooth((top+.025-root.y)/.16);
          if(x<edge && contact>0){
            const safeX=Math.max(x,edge);
            const safeY=Math.max(y,top+.006);
            x=mix(x,safeX,contact*wall);
            y=mix(y,safeY,contact*(1-wall));
          }
          points.push(v(x,Math.max(.009,y),floor.z*flatten));
        }
        free=measured(points);
      }
      sheet.update(u=>{
        const length=u*table.length;
        if(length<=attached||!free)return toWorld(atLength(table,length),axis,side);
        return toWorld(atLength(free,(length-attached)/freeLength*free.length),axis,side);
      },()=>0,forceReset||progress>=.999?1:.28);
    }
  }
  update(0);
  return {group,update,meshes};
}
