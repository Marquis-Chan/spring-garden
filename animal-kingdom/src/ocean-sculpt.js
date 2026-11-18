import * as T from 'three';
import {poseWhale,poseSeahorse} from './ocean-state.js';

const smooth = T.MathUtils.smoothstep;
const vertexSkin = new T.MeshStandardMaterial({vertexColors:true,roughness:.76});
const seed = new T.SphereGeometry(1,20,14);
const mat = color => new T.MeshStandardMaterial({color,roughness:.72});
const on = (parent,geometry,material) => {
  const shape=new T.Mesh(geometry,material);
  parent.add(shape);
  return shape;
};
function oval(parent,material,position,scale) {
  const shape=on(parent,seed,material);
  shape.position.set(...position);shape.scale.set(...scale);
  return shape;
}
function hinge(parent,x,y,z) {
  const joint=new T.Group();joint.position.set(x,y,z);parent.add(joint);return joint;
}
function line(parent,points,radius,material) {
  return on(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),points.length*2,radius,7,false),material);
}

// 一条光滑的中心线贯穿身体，每段的厚度也沿曲线插值。海马的卷尾与胸腹在同一张表皮上。
function skin(parent,sections,rows,sides,paint) {
  const curve=new T.CatmullRomCurve3(sections.map(([x,y])=>new T.Vector3(x,y,0)),false,'catmullrom',.42);
  const radii=new T.CatmullRomCurve3(sections.map((s,i)=>new T.Vector3(s[2],s[3],i)),false,'catmullrom',.42);
  const xyz=[],rgb=[],faces=[],c=new T.Vector3(),r=new T.Vector3(),v=new T.Vector3();
  for(let row=0;row<=rows;row++){
    const t=row/rows;curve.getPoint(t,c);curve.getTangent(t,v);radii.getPoint(t,r);
    for(let i=0;i<sides;i++){
      const angle=i*2*Math.PI/sides,h=Math.cos(angle)*Math.max(.002,r.x);
      const x=c.x-v.y*h,y=c.y+v.x*h,z=Math.sin(angle)*Math.max(.002,r.y);
      xyz.push(x,y,z);const color=paint(x,y,z,t,angle);rgb.push(color.r,color.g,color.b);
      if(row<rows){
        const a=row*sides+i,b=row*sides+(i+1)%sides;
        faces.push(a,b,a+sides,b,b+sides,a+sides);
      }
    }
  }
  for(let i=1;i<sides-1;i++)faces.push(0,i+1,i,rows*sides,rows*sides+i,rows*sides+i+1);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
  geometry.setIndex(faces);geometry.computeVertexNormals();
  return on(parent,geometry,vertexSkin);
}

function eyes(parent,x,y,z,size) {
  const brown=mat('#65524b'),ink=mat('#1d2934'),glint=mat('#fff3d8');
  for(const side of [-1,1]){
    oval(parent,brown,[x,y,side*z],[size*1.23,size*.93,size*.63]);
    oval(parent,ink,[x+.003,y+.003,side*(z+size*.25)],[size,size*.85,size*.53]);
    oval(parent,glint,[x+size*.24,y+size*.30,side*(z+size*.70)],[size*.23,size*.21,size*.13]);
  }
}

// 截面沿伸展方向逐渐变薄，尾鳍的后缘留缺口，左右胸鳍各长在自己的肩上。
function fin(parent,rings,side,dark,light,name) {
  const points=[],colors=[],index=[],c=new T.Color(),top=new T.Color(dark),under=new T.Color(light);
  const sides=18;
  for(const [i,[x,y,z,chord,thick]] of rings.entries()){
    for(let j=0;j<sides;j++){
      const ang=j*Math.PI*2/sides,cy=Math.sin(ang);
      points.push(x+chord*Math.cos(ang),y+thick*cy,side*z);
      c.copy(under).lerp(top,smooth(cy,-.53,.51));colors.push(c.r,c.g,c.b);
      if(i+1<rings.length){
        const a=i*sides+j,b=i*sides+(j+1)%sides;
        if(side>0)index.push(a,b,a+sides,b,b+sides,a+sides);
        else index.push(a,a+sides,b,b,a+sides,b+sides);
      }
    }
  }
  const geom=new T.BufferGeometry();geom.setIndex(index);
  geom.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geom.setAttribute('color',new T.Float32BufferAttribute(colors,3));geom.computeVertexNormals();
  const mesh=on(parent,geom,vertexSkin);mesh.name=name;return mesh;
}

export function humpback(root){
  const whale=hinge(root,0,0,0),blue=new T.Color('#507891'),cream=new T.Color('#ced8d3'),tint=new T.Color();
  const hull=skin(whale,[
    [-1.32,-.053,.012,.024],[-1.21,-.057,.072,.088],[-.94,-.042,.132,.116],
    [-.64,.015,.218,.194],[-.37,.047,.304,.256],[-.08,.052,.372,.318],
    [.22,.039,.415,.364],[.51,.019,.421,.390],[.76,.007,.391,.397],
    [.96,-.013,.319,.366],[1.16,-.032,.245,.319],[1.32,-.040,.188,.282],
    [1.425,-.056,.119,.196],[1.477,-.059,.064,.121],[1.498,-.056,.012,.031]
  ],84,48,(x,y,z,t,angle)=>{
    const cy=Math.cos(angle);
    tint.copy(cream).lerp(blue,smooth(cy,-.51,.29));
    const throat=smooth(x,.34,.72)*(1-smooth(x,1.25,1.49))*(1-smooth(cy,-.39,-.08));
    return tint.multiplyScalar(1-.15*throat*smooth(Math.cos(angle*28+x*2),.1,.94));
  });
  hull.name='拱背与下颌相连的座头鲸';
  // 嘴线、眼窝落在实际表面，转向或摆动时不会浮离脸颊。
  const ray=new T.Raycaster(),rim=mat('#586c79');
  const outer=(x,y)=>{
    ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));
    return ray.intersectObject(hull,false)[0]?.point.z??0;
  };
  for(const side of [-1,1]){
    const pts=Array.from({length:17},(_,i)=>{
      const f=i/16,x=.70+.775*f,y=-.050-.064*Math.sin(f*Math.PI)+.013*f;
      return new T.Vector3(x,y,side*(outer(x,y)+.002));
    });
    line(whale,pts,.010,rim);
  }
  eyes(whale,.66,.011,outer(.66,.011),.046);
  const rear=hinge(whale,-1.27,-.053,0),shoulders=[];
  rear.name='鲸尾根';
  for(const side of [-1,1]){
    fin(rear,[[.018,0,0,.115,.035],[-.038,.014,.13,.205,.052],[-.13,.052,.31,.239,.055],
      [-.243,.119,.51,.182,.039],[-.36,.175,.66,.112,.024],[-.435,.200,.758,.015,.006]],
      side,'#53778c','#a4c4c6','有缺口的水平尾叶');
    const shoulder=hinge(whale,.30,-.074,side*.295);shoulders.push(shoulder);
    fin(shoulder,[[0,0,0,.118,.064],[-.034,-.052,.12,.148,.053],[-.12,-.146,.26,.144,.049],
      [-.26,-.277,.411,.118,.034],[-.384,-.384,.53,.083,.023],[-.458,-.445,.60,.013,.007]],
      side,'#698ca0','#d7e6de','浅腹长胸鳍');
  }
  skin(whale,[[-.60,.22,.004,.009],[-.515,.31,.035,.031],[-.50,.374,.036,.030],
    [-.45,.369,.055,.045],[-.35,.301,.075,.064],[-.29,.294,.01,.015]],16,16,()=>blue);
  const rest=hull.geometry.attributes.position.array.slice(),pos=hull.geometry.attributes.position;
  return a=>{
    const sweep=.10*a.sweep+.17*a.pose;
    for(let i=0;i<pos.count;i++){
      const x=rest[3*i];if(x>-.31)break;
      const u=Math.min(1,(-.31-x)/.96);
      pos.setY(i,rest[3*i+1]+sweep*u*u);
    }
    pos.needsUpdate=true;
    rear.position.y=-.053+sweep;rear.rotation.z=-sweep*1.9;
    shoulders.forEach((p,i)=>{p.rotation.x=(i?1:-1)*(.09*a.sweep+.24*a.pose);});
    poseWhale(a,whale.rotation);
  };
}

export function linedSeahorse(root) {
  const horse=hinge(root,0,0,0);
  const apricot=new T.Color('#edb664'),ivory=new T.Color('#ffe0a3'),umber=new T.Color('#b87848'),c=new T.Color();
  const spiral=[];
  for(let i=0;i<=15;i++){
    const t=i/15,ang=-2.13*Math.PI+t*1.93*Math.PI,r=.010+.137*t;
    spiral.push([-.105+r*Math.cos(ang),-.263+r*Math.sin(ang),.005+.046*t,.005+.035*t]);
  }
  const shape=skin(horse,[...spiral,[.05,-.18,.069,.060],[.027,-.083,.123,.096],
    [-.015,.020,.164,.108],[-.070,.132,.112,.086],[-.09,.231,.068,.059],
    [-.059,.321,.088,.077],[.028,.372,.105,.093],[.126,.342,.090,.079],
    [.192,.293,.052,.053],[.243,.265,.039,.043],[.302,.236,.035,.037],
    [.352,.213,.039,.042],[.366,.205,.036,.038]],92,32,(x,y,z,t,angle)=>{
      const back=smooth(Math.cos(angle),-.37,.93);
      c.copy(ivory).lerp(apricot,.25+.72*back).lerp(umber,.30*back);
      if(t>.54&&t<.79)c.multiplyScalar(1-.056*(.5+.5*Math.cos(y*69+z*8)));
      return c;
    });
  shape.name='长吻、拱颈和卷尾连成的海马';
  const lip=oval(horse,mat('#936344'),[.367,.204,0],[.014,.025,.028]);
  lip.name='海马吻端';
  eyes(horse,.083,.371,.082,.030);
  const crown=mat('#dba661');
  skin(horse,[[-.084,.375,.044,.039],[-.091,.426,.046,.042],[-.087,.470,.037,.039],
    [-.097,.493,.016,.017]],11,16,()=>apricot);
  for(const [x,y,z] of [[-.118,.481,.012],[-.062,.485,-.01]])oval(horse,crown,[x,y,z],[.011,.039,.014]);
  const dorsal=hinge(horse,-.162,.075,0);
  fin(dorsal,[[.011,.035,0,.057,.011],[-.003,.039,.045,.075,.011],[-.023,.043,.090,.083,.009],
    [-.031,.044,.117,.071,.005]],1,'#e7be80','#efd998','半透明背鳍').rotation.y=-Math.PI*.48;
  const rest=shape.geometry.attributes.position.array.slice(),vertices=shape.geometry.attributes.position;
  return a=>{
    const effort=a.pose*(1-.70*(a.touch??0));
    // 卷尾内圈轻轻松开，靠近腹部的尾根始终保持连续。
    for(let i=0;i<vertices.count;i++){
      const row=Math.floor(i/32)/92;if(row>.50)break;
      const reach=(1-smooth(row,0,.5))*effort,x=rest[i*3],y=rest[i*3+1];
      vertices.setXYZ(i,x-.13*reach,y-.095*reach,rest[i*3+2]);
    }
    vertices.needsUpdate=true;
    poseSeahorse(a,horse.rotation);
    dorsal.rotation.y=.46*Math.sin(a.phase*2.1);
  };
}
