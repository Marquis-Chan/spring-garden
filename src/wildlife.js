(function(){
 'use strict';const G=window.SpringGarden;
 const eye=(x,y,r=2.6)=>`<g class="eyes"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*1.12}" fill="#374b46"/><circle cx="${x+.7}" cy="${y-.9}" r=".8" fill="#fffdf0"/></g>`;
 const line=(d,c='#8c7860',w=1.8)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
 const leg=(x,y,length,color,side,front=false,detail='')=>`<g class="leg ${side} ${front?'leg-front':'leg-back'}${front&&side==='near'?' paw':''}" style="--joint-x:${x}px;--joint-y:${y}px"><path d="M${x} ${y}l${front?2:-3} ${length-10}q-3 12 7 12h9" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"/>${detail==='hoof'?line(`M${x-2} ${y+length+2}h18`,'#7a806b',4):detail==='toe'?line(`M${x+4} ${y+length-2}v4m5-4v4m5-4v4`,'#d7dbcc',1.6):detail==='stripe'?line(`M${x-3} ${y+length-15}h10m-10 10h10`,'#606e60',3):''}</g>`;
 const dogLeg=(x,y,color,side,front=false)=>{const p=G.core.dogLegPose(.32,x,y,front);return `<g class="leg dog-leg ${side} ${front?'leg-front':'leg-back'}${front&&side==='near'?' paw':''}" data-hip-x="${x}" data-hip-y="${y}" style="--joint-x:${x}px;--joint-y:${y}px"><path class="limb" d="M${x} ${y}L${p.knee.x} ${p.knee.y}L${p.foot.x} ${p.foot.y}" fill="none" stroke="${color}" stroke-width="9"/><g class="foot" transform="translate(${p.foot.x} ${p.foot.y})"><path d="M-2-2q5-7 12-2l3 5H-2z" fill="${color}"/><path d="M6 0v2m4-2v2" stroke="#a47e58" stroke-width=".8"/></g></g>`};
 function animal(id){let a='';
  if(id==='cat')a=`
   <g class="tail" style="--tail-x:43px;--tail-y:118px"><path class="tail-shape" d="M43 118q-33-6-25-41 5-24 20-29" fill="none" stroke="#cc935e" stroke-width="12" stroke-linecap="round"/>
   <g class="tail-markings">${line('M22 72l10 4m-5-19 9 5','#a8734e',4)}</g></g>
   ${leg(63,135,39,'#c78e5e','far')}${leg(136,135,39,'#c78e5e','far',true)}
   <g class="spine"><path d="M39 116q4-34 52-30 38-4 55 20l2 37q-61 15-104-2z" fill="#e6b17a" stroke="#b88558" stroke-width="2.5"/><path d="M54 139q40 11 78-1" stroke="#f8d7a6" stroke-width="10" fill="none"/>
   ${line('M66 92l-3 20m21-24 0 18m18-17 6 17m-60 21 14 2','#c88d56',4)}</g>
   ${leg(53,139,36,'#e6b17a','near')}${leg(130,139,36,'#e6b17a','near',true)}
   <g class="head"><path d="M129 94l-3-39 22 15 15-16 13 36" fill="#e4ac72" stroke="#b88558" stroke-width="2.5"/><path d="M132 63l2 18 11-7m21-12-9 13 14 5" fill="#ddb09e"/><path d="M126 87q10-21 30-12 23 6 25 29-2 27-27 28-30-3-28-45" fill="#e9b783" stroke="#b88558" stroke-width="2.5"/><path d="M149 102q21-5 24 11-7 16-26 6" fill="#fae5c5"/>${eye(145,95)}${eye(166,98,2.2)}<path d="M159 110l7-2-3 5z" fill="#b77c73"/>
   ${line('M162 113v6m0-1q-4 5-9 2m10-1 5 3','#866650',1.4)}${line('M146 111l-24-1m23 7-23 5m48-7 20-2m-20 9 20 4','#9e795a',1.2)}${line('M149 77l1 9m10-7-2 8','#bd8555',3)}</g>`;
  if(id==='dog')a=`
   <path class="tail" d="M45 113q-20-1-25-21l-8-17" fill="none" stroke="#a87951" stroke-width="12" stroke-linecap="round"/>
   ${dogLeg(64,134,'#aa7954','far')}${dogLeg(139,132,'#aa7954','far',true)}
   <path d="M39 115q-2-34 49-32 38-9 61 27l-4 35q-49 13-102-6z" fill="#cf9a65" stroke="#a87951" stroke-width="2.5"/><path d="M116 101q-8 40 22 43" stroke="#f4e7ce" stroke-width="20" fill="none"/>
   ${dogLeg(51,139,'#cf9a65','near')}${dogLeg(133,134,'#e6be90','near',true)}
   <g class="head"><path d="M121 86q-7-32 21-35 29-1 31 31l20 13-4 18-29 2q-25-4-39-29" fill="#ddb17e" stroke="#a87951" stroke-width="2.5"/><path d="M129 56q-30-13-27 27 5 24 15 18 14-5 16-36" class="ears" fill="#8a6248" stroke="#775941" stroke-width="2.3"/><path d="M151 53q-12 8-5 31l9 5 6-34" fill="#f9e9d0"/><path d="M162 90q13 2 22 12l-1 9-23-1" fill="#f6e7cf"/>${eye(160,80,2.8)}<ellipse cx="188" cy="99" rx="6" ry="5" fill="#4b4b41"/>${line('M171 108q9 4 15-2','#7e694e',1.8)}<path class="tongue" d="M175 111l8-1q0 12-5 12-5-1-3-11" fill="#d9a099"/></g>`;
  if(id==='elephant')a=`
   <g class="tail" style="--tail-x:39px;--tail-y:111px"><path class="tail-shape" d="M39 111q-17 4-18 24" fill="none" stroke="#829a92" stroke-width="4"/><path d="M18 132l-2 9 7-3" fill="#71867e"/></g>
   ${leg(56,133,39,'#879f97','far',false,'toe')}${leg(129,133,38,'#879f97','far',true,'toe')}
   <path d="M33 111q-7-50 50-49 41-4 69 29l-2 52q-52 28-110-2z" fill="#a9beb4" stroke="#7f9b90" stroke-width="2.8"/>
   ${leg(46,136,40,'#a9beb4','near',false,'toe')}${leg(120,137,39,'#a9beb4','near',true,'toe')}
   <g class="head"><path d="M115 72q26-33 55-2 16 21 11 40l-18 18-44-14" fill="#b6c9c0" stroke="#7f9b90" stroke-width="2.8"/><g class="ears"><path d="M137 79q-40-32-49-3-16 30 9 61 21 16 38-13z" fill="#9bb2a7" stroke="#7f9b90" stroke-width="2.5"/><path d="M119 87q-23-18-22 8 0 23 18 27" fill="#c6b8a7" opacity=".7"/></g>${eye(157,87,2.8)}<g class="trunk"><path class="trunk-skin" d="M176 98q18 19 12 50-1 19-19 21-11 1-16-10 1-8 7-8 7 10 13 0 2-17-10-32" fill="#b6c9c0" stroke="#7f9b90" stroke-width="2.8"/>
   <path class="trunk-wrinkles" d="M177 126l9 2m-7 9 7 1m-10 11 9 2" fill="none" stroke="#90a89c" stroke-width="1.7"/><circle data-anchor="trunk-inner" cx="165" cy="160" r=".1" opacity="0"/><ellipse data-anchor="trunk-tip" cx="157" cy="155" rx="3.5" ry="2.2" fill="#73948a" transform="rotate(-30 157 155)"/></g><path d="M164 113q1 21 16 17" fill="none" stroke="#fff0cc" stroke-width="6" stroke-linecap="round"/></g>`;
  if(id==='giraffe')a=`
   <g class="tail" style="--tail-x:41px;--tail-y:111px"><path class="tail-shape" d="M41 111q-18 4-19 17" fill="none" stroke="#ac8a59" stroke-width="3"/><path d="M19 125l-3 12 8-4" fill="#816c4b"/></g>
   ${leg(56,117,57,'#c7a065','far',false,'hoof')}${leg(105,118,56,'#c7a065','far',true,'hoof')}
   <path d="M38 109q12-22 48-17l27 9 27 14q-41 23-100 10z" fill="#e5bf74" stroke="#b18e58" stroke-width="2.4"/>
   ${leg(44,124,50,'#e5bf74','near',false,'hoof')}${leg(116,122,53,'#e5bf74','near',true,'hoof')}
   <g fill="#ae8550"><path d="M49 103l12-4 5 11-8 8-12-6m27-14 14-2 7 12-10 10-12-5m25-8 10 3-1 13-14 1"/></g>
   <g class="browsing-neck"><path d="M108 112l22-74 21 7-12 71" fill="#e5bf74" stroke="#b18e58" stroke-width="2.4"/><path d="M123 73l10-1 1 12-13 4m10-36 10 3-3 10-10-1" fill="#ae8550"/><g class="head"><path d="M130 35l-3-15m16 18 3-16" stroke="#b79257" stroke-width="4"/><circle cx="127" cy="19" r="3.8" fill="#806948"/><circle cx="146" cy="21" r="3.8" fill="#806948"/><path d="M125 35q-18-16-24-3 8 10 22 12m24-6q18-7 18-17-15-2-22 15" fill="#e5bf74" stroke="#b18e58" stroke-width="2"/><path d="M120 37q13-14 30 1l18 11q14 14-5 21l-27-5-13-16" fill="#edce8d" stroke="#b18e58" stroke-width="2.4"/><path d="M151 54q25-7 25 5-2 13-26 5" fill="#f1dab0"/>${eye(142,43,2.2)}<ellipse cx="167" cy="58" rx="2" ry="1.5" fill="#9c8056"/></g></g>`;
  if(id==='monkey')a=`
   <path class="tail" d="M69 138q-45 18-42-23 2-24 22-12 7 10-3 15" fill="none" stroke="#94704f" stroke-width="7" stroke-linecap="round"/>
   <path d="M92 104q-24 14-18 44l-12 25 19 3 12-29m24-3 18 22 19 5" stroke="#9e7c55" stroke-width="12" fill="none" stroke-linecap="round"/>
   <ellipse cx="104" cy="116" rx="28" ry="37" fill="#b49165" stroke="#896b4b" stroke-width="2.5"/><ellipse cx="108" cy="123" rx="15" ry="24" fill="#dfc49a"/>
   <path d="M87 101q-24 13-27 42l5 13" stroke="#b49165" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="65" cy="158" rx="7" ry="8" fill="#ccb18b"/>
   <g class="paw" style="--joint-x:122px;--joint-y:100px"><path d="M123 100q26 14 28 42l-3 12" stroke="#b49165" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="147" cy="156" rx="7" ry="8" fill="#ccb18b"/></g>
   <g class="head"><circle cx="79" cy="68" r="12" fill="#ba946d" stroke="#896b4b" stroke-width="2"/><circle cx="132" cy="68" r="12" fill="#ba946d" stroke="#896b4b" stroke-width="2"/><path d="M76 57q7-30 34-21 35 6 25 43-8 23-30 21-29-2-29-43" fill="#9e7c55" stroke="#896b4b" stroke-width="2.5"/><path d="M91 53q12-13 19 2 17-13 20 9l-5 19q-24 18-39-1z" fill="#e1caa5"/>${eye(100,64,2.5)}${eye(118,65,2.5)}<ellipse cx="113" cy="79" rx="11" ry="7" fill="#ccb18b"/>${line('M111 77l4 0m-9 10q7 4 13-1','#806c51',1.4)}</g>`;
  if(id==='peacock'){
   let fan='';for(let i=0;i<19;i++){const angle=-64+i*128/18;fan+=`<g class="train-feather" data-angle="${angle}" data-order="${i}" transform="rotate(${angle} 100 139)"><path d="M100 141Q89 93 94 30q6-23 12 0 5 61-6 111" fill="${i%2?'#689f86':'#82b59a'}" stroke="#4d8774" stroke-width="1.2"/><path d="M100 139V31m0 8-5 12m5-2 5 12m-5 2-5 12m5-2 5 12m-5 2-4 12m4-2 4 12" fill="none" stroke="#aec7a1" stroke-width=".7"/><ellipse cx="100" cy="43" rx="6.4" ry="10" fill="#dec68a"/><ellipse cx="100" cy="43" rx="4.3" ry="7.4" fill="#5d99a5"/><ellipse cx="100" cy="44" rx="2.5" ry="4.4" fill="#305e77"/><path d="M97 38q4-3 6 0" fill="none" stroke="#b3d5c5" stroke-width="1"/></g>`}
   a=`<g class="resting-train"><path d="M103 139Q63 138 8 157q30 15 89-6" fill="#75a28a" stroke="#518675" stroke-width="2"/>${Array.from({length:5},(_,i)=>`<ellipse cx="${23+i*15}" cy="${158-i*2}" rx="6" ry="3.8" fill="#cebd82"/><ellipse cx="${23+i*15}" cy="${158-i*2}" rx="3.5" ry="2.2" fill="#4d8394"/>`).join('')}</g><g class="fan">${fan}</g><path d="M94 150l-5 28m19-29 4 29" stroke="#a69f73" stroke-width="4"/>${line('M83 180h14m11 0h14','#9a9062',2)}<ellipse cx="100" cy="134" rx="22" ry="29" fill="#4e9397" stroke="#3b7885" stroke-width="2"/><path d="M103 128q-14-37-4-59l10-13 13 7q-15 16-9 41l1 29" fill="#529da9" stroke="#3b7885" stroke-width="2"/><g class="head"><path d="M106 61q-10-18 9-24 18-3 20 11-2 13-22 15" fill="#4f99a5" stroke="#3b7885" stroke-width="2"/><path d="M129 49l16 4-14 7" fill="#c8b379"/>${eye(123,47,2)}<path d="M111 38l-6-17m11 15 1-18m4 20 8-17" stroke="#659c95" stroke-width="2"/><circle cx="105" cy="21" r="3" fill="#6199a2"/><circle cx="117" cy="18" r="3" fill="#6199a2"/><circle cx="129" cy="21" r="3" fill="#6199a2"/></g><path d="M88 118q-20 23 5 39" fill="#79aca4" stroke="#4f8c8b" stroke-width="2"/>`;
  }
  if(id==='tiger')a=`
   <g class="tail" style="--tail-x:41px;--tail-y:114px"><path class="tail-shape" d="M41 114q-29-1-26-33l3-12" fill="none" stroke="#d49c58" stroke-width="11" stroke-linecap="round"/><g class="tail-markings">${line('M15 80l9 2m-9 11 8 2','#655d46',4)}</g></g>
   ${leg(58,133,40,'#b88851','far')}${leg(140,132,42,'#b88851','far',true)}
   <path d="M34 111q-3-34 55-34 42 0 59 28l2 38q-45 14-110-1z" fill="#e4ad65" stroke="#b6864c" stroke-width="2.5"/><path d="M48 139q45 12 84 0" fill="none" stroke="#f7e7c7" stroke-width="12"/>
   ${leg(45,137,38,'#e4ad65','near')}${leg(131,134,40,'#e4ad65','near',true)}
   <g fill="#675e47"><path d="M49 85l10 6 4 24-10-10m24-26 8 5-2 31-8-17m29-14 11 10 0 22-8-11m-77 11 15 9-8 8m58-2 12 4-12 9m18-9 14 4-13 9"/></g>
   <g class="head"><circle cx="135" cy="59" r="12" fill="#be8d54" stroke="#9c7748" stroke-width="2"/><circle cx="167" cy="64" r="11" fill="#be8d54" stroke="#9c7748" stroke-width="2"/><circle cx="135" cy="59" r="6" fill="#f2d4ae"/><circle cx="167" cy="64" r="5" fill="#f2d4ae"/><path d="M128 77q5-25 30-15 27 9 23 32-2 24-29 27-28-4-24-44" fill="#e7b472" stroke="#b6864c" stroke-width="2.5"/><path d="M142 94q10-6 17 2 12-3 16 9-5 17-21 14-17 1-19-13z" fill="#f8ead0"/>${eye(144,86,2.6)}${eye(168,90,2.4)}<path d="M155 101l8 0-4 6z" fill="#876b56"/>${line('M158 106v7m0 0-8 3m8-3 6 4','#7c6650',1.5)}<path class="forehead-stripes" d="M146 66q8-1 17 3M146 72l16 3M143 79q10-1 21 3M155 67l-2 13" fill="none" stroke="#675e47" stroke-width="2.8"/>${line('M132 80l8 3m36-1-6 4m-41 7 10 3m38 5-8 0','#675e47',3.8)}${line('M141 107l-18 0m19 7-19 6m48-5 19 0','#a08560',1.1)}</g>`;
  if(id==='zebra')a=`
   <g class="tail" style="--tail-x:37px;--tail-y:112px"><path class="tail-shape" d="M37 112q-21 9-18 29" stroke="#777f70" stroke-width="3" fill="none"/><path d="M16 136l-2 12 8-4" fill="#647161"/></g>
   ${leg(54,134,41,'#bab8a1','far',false,'stripe')}${leg(130,132,44,'#bab8a1','far',true,'stripe')}
   <path d="M34 111q-2-34 55-31l32 10 13-38 25 10-12 79q-58 16-111-2z" fill="#f8f0da" stroke="#aaad96" stroke-width="2.5"/>
   ${leg(42,138,39,'#f1ead2','near',false,'stripe')}${leg(121,136,40,'#f1ead2','near',true,'stripe')}
   <path d="M131 52q-13 21-13 45" stroke="#626f62" stroke-width="9" fill="none"/>
   <g fill="none" stroke="#606e60" stroke-width="5"><path d="M43 96q15 17 5 41m17-52q13 18 7 56m14-58q11 20 7 57m16-52q16 14 10 49m10-67 23 8m-18-23 20 8"/></g>
   <g class="head"><path d="M143 57l-6-27q13-5 16 22m6 6 11-26q11 6-1 29" fill="#f2ead3" stroke="#aaad96" stroke-width="2"/><path d="M133 62q10-16 24-4l30 27q11 15-2 25l-18-2-34-29" fill="#f8f0da" stroke="#aaad96" stroke-width="2.5"/><path d="M169 89q17-7 24 6 0 16-20 15" fill="#aeb3a0"/>${eye(155,68,2.3)}${line('M144 59l7 9m-14 2 11 6m8 3 10 10','#606e60',3)}<ellipse cx="183" cy="99" rx="2" ry="1.5" fill="#637460"/></g>`;
  if(id==='hippo')a=`
   ${leg(49,139,30,'#998d9e','far')}${leg(131,139,29,'#998d9e','far',true)}
   <path d="M25 118q-3-51 67-52 50 2 63 44l-2 34q-59 28-119-1z" fill="#b9acb6" stroke="#948a98" stroke-width="2.8"/>
   ${leg(40,139,34,'#b9acb6','near')}${leg(120,139,34,'#b9acb6','near',true)}
   <g class="head"><circle cx="125" cy="75" r="8" fill="#b9acb6" stroke="#948a98" stroke-width="2"/><circle cx="161" cy="76" r="8" fill="#b9acb6" stroke="#948a98" stroke-width="2"/><path d="M116 97q3-26 28-21 38 0 38 37l8 20q-15 30-61 11-28-12-13-47" fill="#c6b8c0" stroke="#948a98" stroke-width="2.7"/><ellipse cx="157" cy="126" rx="37" ry="20" fill="#cebdc5" stroke="#aa9aa7" stroke-width="2"/>${eye(140,90,2.4)}${eye(167,92,2.2)}<ellipse cx="150" cy="119" rx="3" ry="2" fill="#8a798c"/><ellipse cx="176" cy="119" rx="3" ry="2" fill="#8a798c"/><g class="hippo-jaw"><path d="M129 133q31 14 59-3-3 25-30 22-24-1-29-19" fill="#baa7b4" stroke="#948a98" stroke-width="2"/><path d="M136 135q21 6 40 0" fill="none" stroke="#958292" stroke-width="2"/><circle data-anchor="mouth" cx="178" cy="136" r=".1" opacity="0"/></g></g>`;
  if(id==='rhino')a=`
   <path class="tail" d="M36 109q-17 1-18 15" stroke="#8e9f8e" stroke-width="3" fill="none"/>
   ${leg(54,137,34,'#91a38f','far')}${leg(132,138,32,'#91a38f','far',true)}
   <path d="M28 116q-1-43 51-47 42-7 73 31l-5 42q-54 23-111-1z" fill="#b1bfaa" stroke="#879e84" stroke-width="2.7"/>
   ${leg(41,141,34,'#b1bfaa','near')}${leg(121,141,33,'#b1bfaa','near',true)}
   ${line('M71 73q-10 34 2 69m31-64q-9 37 5 65','#90a88d',2.5)}
   <g class="head"><path d="M118 94l-8-24q13-11 18 14m24 9 12-24q14 8 3 29" fill="#afbea6" stroke="#879e84" stroke-width="2"/><path d="M114 104q14-22 39-8l33 29q12 22-8 26l-46-10q-30-7-18-37" fill="#bdc9b4" stroke="#879e84" stroke-width="2.7"/><path d="M166 123q12-12 17-41 10 19 6 48" fill="#e2dac0" stroke="#b2b395" stroke-width="2"/><path d="M149 111l10-17 6 24" fill="#dfd6b9" stroke="#b2b395" stroke-width="1.8"/>${eye(134,111,2.7)}<ellipse cx="179" cy="139" rx="2.5" ry="1.8" fill="#80957b"/>${line('M150 144l23 3','#90a28b',1.6)}</g>`;
  if(id==='turtle')a=`
   <g class="feet" fill="#7fa879" stroke="#60885f" stroke-width="2"><path class="leg near leg-back" style="--joint-x:59px;--joint-y:136px" d="M59 136q-26 10-27 22 19 8 34-13z"/><path class="leg near leg-front" style="--joint-x:115px;--joint-y:137px" d="M115 137q17 4 25 20-18 10-32-10z"/><path d="M60 105l-24 6 15 10m68-16 13 13-14 8"/></g>
   <g class="head"><path d="M132 125q34-18 49 3 8 17-10 24-27 7-43-13" fill="#92b380" stroke="#68895e" stroke-width="2.2"/>${eye(165,129,2.4)}${line('M166 141l10-2','#66875c',1.3)}<ellipse cx="179" cy="135" rx="1.6" ry="1" fill="#6e925f"/></g><path d="M40 128l-23 6 22 9" fill="#7fa879"/><path d="M33 133q-1-47 60-47 49-1 50 48-59 20-110-1" fill="#a1ae72" stroke="#68895e" stroke-width="3"/>
   <path d="M88 90l-22 19 2 25 23 12 23-15-3-25zM39 113l27-4m-30 27 32-2m23 12v11m23-26 26 7m-29-31 23-9" stroke="#d1cd93" stroke-width="3" fill="none"/>
   `;
  if(id==='penguin')a=`
   <g class="penguin-feet"><path d="M79 164l-17 13q16 10 31-3m25-10 18 13q-15 10-29-3" fill="#d2b076" stroke="#b29662" stroke-width="1.5"/>
   </g><g class="penguin-upper"><g class="wings" fill="#526d74" stroke="#405e67" stroke-width="2"><path class="flipper-left" d="M72 91q-20 10-24 49 11 13 22-18"/><path class="flipper-right" d="M129 90q22 16 22 49-10 12-20-18"/></g>
   <path d="M67 131q-6-47 10-76 10-28 34-25 32 4 28 43 12 31 2 71-11 39-44 35-25-2-30-48" fill="#586f75" stroke="#405e67" stroke-width="2.4"/><path d="M80 77q9-19 21-5 18-9 24 12 21 66-24 82-39-11-21-89" fill="#faf2dc"/>
   <g class="head"><path d="M94 50q9-14 25-6l5 20-25 7" fill="#687e82"/>${eye(113,51,2.4)}<path d="M124 55l23 10-25 6z" fill="#d5b172" stroke="#b79961" stroke-width="1.2"/></g></g>`;
  if(id==='bird')a=`
   <g class="bird-pose"><g class="wing-back wing-flight"><path d="M98 101Q59 79 43 39l17 9 1-23 12 20 8-21q24 38 28 72" fill="#779eaa" stroke="#5d8594" stroke-width="2"/></g>
   <path class="tail" d="M77 117L22 137l7-18-12-7 56-6" fill="#658a9b" stroke="#5d8594" stroke-width="2"/>
   <path d="M58 108q4-26 34-29l26-19q31-10 45 12 10 22-8 43-25 33-65 23-31-5-32-30" fill="#9cbcc2" stroke="#5d8594" stroke-width="2.3"/><path d="M105 107q17-1 29-14 22 17-2 33-16 14-37 5" fill="#e1d8bc"/>
   <g class="wing-folded"><path d="M89 94q-33 5-23 26 13 23 42 4l13-20q-19 5-32-10" fill="#789fad" stroke="#5d8594" stroke-width="2"/>
   ${line('M77 109l22 10m-14-14 24 6','#a9c1c1',1.4)}</g>
   <g class="wing-front wing-flight"><path d="M103 101Q72 88 35 38l20 6-3-21 15 13 2-24 14 25 9-19q17 36 24 78z" fill="#82aab5" stroke="#5d8594" stroke-width="2"/>${line('M105 95L64 38m33 51L42 43m65 43L84 34','#bfd0cd',1.5)}</g>
   <g class="head"><path d="M125 71q5-14 20-8 7 3 11 11" fill="#bed0cc"/>${eye(145,79,2.5)}<path d="M162 86l25 8-25 8" fill="#d9ba7b" stroke="#ae9b69" stroke-width="1.4"/></g>
   <g class="bird-feet">${line('M92 134l-5 15m28-16 1 15m-35 3 13-3 4 3m12-1 10-2 6 3','#ad9670',2)}</g></g>`;
  if(id==='fish')a=`
   <path class="tail" d="M65 107L22 77l5 26-5 27 45-12" fill="#d5a47b" stroke="#b88967" stroke-width="2"/>
   <path d="M70 91q47-48 99 6 23 17 0 29-47 43-99-4z" fill="#ecc58e" stroke="#b88967" stroke-width="2"/><path d="M87 84q17-34 50-12l4 10m-59 48 27 22 26-13" fill="#d9b277" stroke="#b88967" stroke-width="1.6"/>
   <path class="wings" d="M110 105q-21-5-19 23 20-1 32-15" fill="#d8a176" stroke="#b88967" stroke-width="1.3"/><path class="gill" d="M139 92q-10 18 0 37" fill="none" stroke="#c7a16d" stroke-width="2"/>${eye(159,103,3)}<g class="fish-mouth"><path d="M173 119l7-3" stroke="#b0825f" stroke-width="1.4"/><circle data-anchor="mouth" cx="180" cy="117" r=".1" opacity="0"/></g>${line('M84 97l5 6m5-10 4 6m-9 13 5 5m10-19 4 6','#dbb681',1.1)}`;
  if(id==='butterfly')a=`
   <g class="butterfly-pose"><g class="wings" stroke="#ac8798" stroke-width="2"><path d="M97 107Q32 26 32 75q-3 28 36 42-43-7-28 25 29 28 57-17" fill="#e0b3c3"/><path d="M103 107q65-81 65-32 3 28-36 42 43-7 28 25-29 28-57-17" fill="#e7c1cf"/>
   <path d="M95 102L48 57m48 54L43 87m53 33-38 20m47-38 47-45m-48 54 53-24m-53 33 38 20" fill="none" stroke="#c39aa9" stroke-width="1"/>
   <ellipse cx="60" cy="79" rx="9" ry="14" fill="#efd9aa"/><ellipse cx="140" cy="79" rx="9" ry="14" fill="#efd9aa"/><ellipse cx="64" cy="136" rx="6" ry="7" fill="#b1bacb"/><ellipse cx="136" cy="136" rx="6" ry="7" fill="#b1bacb"/></g>
   ${line('M97 88q-9-20-16-17m22 17q9-20 16-17','#767c70',1.8)}<ellipse cx="100" cy="112" rx="3" ry="25" fill="#6e776b"/><circle cx="100" cy="87" r="4" fill="#6e776b"/><path class="butterfly-feet" d="M98 124l-7 10 9 5m3-17 7 12-10 5" fill="none" stroke="#76816e" stroke-width="1.2"/><path class="proboscis" d="M101 92q23 38-1 47" fill="none" stroke="#8d856c" stroke-width="1"/><circle data-anchor="butterfly-feet" cx="100" cy="139" r=".1" opacity="0"/></g>`;
  return `<g class="creature-art" data-kind="${id}"><g class="animal-motion"><g class="facing"><g class="body" stroke-linecap="round" stroke-linejoin="round">${a}</g></g></g></g>`;
 }
 G.art.animal=animal;
})();
