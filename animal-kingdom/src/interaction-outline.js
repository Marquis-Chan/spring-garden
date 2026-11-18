import * as T from 'three';

export function makeInteractionOutline(renderer,scene){
 const mask=new T.WebGLRenderTarget(1,1,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false});
 const opaque=new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide,toneMapped:false});
 const marked=new T.MeshBasicMaterial({color:0xff0000,side:T.DoubleSide,toneMapped:false});
 const focused=new T.MeshBasicMaterial({color:0xffff00,side:T.DoubleSide,toneMapped:false});
 const suggested=new T.MeshBasicMaterial({color:0xff00ff,side:T.DoubleSide,toneMapped:false});
 const pixels=new T.Vector2(1,1);
 const material=new T.ShaderMaterial({
  uniforms:{silhouette:{value:mask.texture},pixel:{value:pixels},night:{value:0},cue:{value:0}},
  transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:`varying vec2 screenUV;
   void main(){screenUV=uv;gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`uniform sampler2D silhouette;
   uniform vec2 pixel;
   uniform float night;
   uniform float cue;
   varying vec2 screenUV;
   void main(){
    float inside=texture2D(silhouette,screenUV).r;
    vec3 edge=vec3(0.);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2( 1., 0.)).rgb);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2(-1., 0.)).rgb);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2( 0., 1.)).rgb);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2( 0.,-1.)).rgb);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2( .71, .71)).rgb);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2(-.71, .71)).rgb);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2( .71,-.71)).rgb);
    edge=max(edge,texture2D(silhouette,screenUV+pixel*vec2(-.71,-.71)).rgb);
    float rim=max(0.,edge.r-inside);
    vec3 hue=mix(vec3(1.,.945,.744),vec3(.88,.98,1.),night*.45);
    gl_FragColor=vec4(hue,rim*(.43+night*.14+max(edge.g*.35,edge.b*cue)));
   }`
 });
 const pass=new T.Scene();
 pass.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
 const view=new T.Camera();
 const meshCache=new WeakMap();
 const selected=new Set(),hovered=new Set(),prompted=new Set(),saved=[];

 function collect(nodes,result){
  if(!nodes)return;
  if(Array.isArray(nodes)){
   for(const item of nodes)collect(item,result);
   return;
  }
  let meshes=meshCache.get(nodes);
  if(!meshes){
   meshes=[];nodes.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
   meshCache.set(nodes,meshes);
  }
  for(const mesh of meshes)result.add(mesh);
 }

 return {
  resize(width,height){
   const rate=.68;
   mask.setSize(Math.max(1,Math.round(width*rate)),Math.max(1,Math.round(height*rate)));
   pixels.set(rate*1.72/mask.width,rate*1.72/mask.height);
  },
  draw(camera,targets,hover,night,cue){
   if(!targets.length)return;
   selected.clear();hovered.clear();prompted.clear();
   for(const {kind,index,nodes} of targets){
    collect(nodes,selected);
    if(hover?.kind===kind&&hover?.index===index)collect(nodes,hovered);
   }
   if(cue)collect(cue.target.nodes,prompted);
   if(!selected.size)return;
   // 保存遮挡物的深度，只在当前可见的可点物外侧描边。
   const autoClear=renderer.autoClear,shadows=renderer.shadowMap.enabled;
   renderer.shadowMap.enabled=false;
   try{
    scene.traverseVisible(mesh=>{
     if(!mesh.isMesh)return;
     const original=mesh.material,layers=mesh.layers.mask;
     saved.push({mesh,original,layers});
     if(selected.has(mesh))mesh.material=hovered.has(mesh)?focused:prompted.has(mesh)?suggested:marked;
     else if(original.transparent)mesh.layers.mask=0;
     else mesh.material=opaque;
    });
    renderer.setRenderTarget(mask);
    renderer.render(scene,camera);
   }finally{
    for(const {mesh,original,layers} of saved){mesh.material=original;mesh.layers.mask=layers;}
    saved.length=0;
    renderer.shadowMap.enabled=shadows;
    renderer.setRenderTarget(null);
   }
   material.uniforms.night.value=night;
   material.uniforms.cue.value=cue?.strength??0;
   renderer.autoClear=false;
   try{renderer.render(pass,view);}
   finally{renderer.autoClear=autoClear;}
  }
 };
}
