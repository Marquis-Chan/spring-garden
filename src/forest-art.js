(function () {
  'use strict';
  const G = window.SpringGarden;
  const stroke = (d, color = '#8c7860', width = 1.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
  const anchor = (name, x, y) => `<circle data-anchor="${name}" cx="${x}" cy="${y}" r=".1" opacity="0" pointer-events="none"/>`;
  const eye = (x, y, size = 2.6) => `<ellipse cx="${x}" cy="${y}" rx="${size}" ry="${size * 1.12}" fill="#384640"/><circle cx="${x + .6}" cy="${y - .8}" r=".65" fill="#fff8e9"/>`;
  const bearLeg = (x, y, kneeX, kneeY, footX, footY, side, front) => {
    const shade = side === 'far' ? '#59615a' : '#687168';
    return `<g class="leg bear-leg ${side} ${front ? 'leg-front' : 'leg-back'}${front && side === 'near' ? ' paw' : ''}" data-hip-x="${x}" data-hip-y="${y}" style="--joint-x:${x}px;--joint-y:${y}px"><path class="limb" d="M${x} ${y}L${kneeX} ${kneeY}L${footX} ${footY}" fill="none" stroke="${shade}" stroke-width="18"/><g class="foot" transform="translate(${footX} ${footY})"><path d="M-8-6q10-7 20-1l6 7q-10 5-26 1z" fill="${shade}" stroke="#4e5a50" stroke-width="1.5"/><path d="M5-1l2 3m3-4 2 3m3-3 2 3" fill="none" stroke="#d7cfb8" stroke-width="1.15"/>${front && side === 'near' ? anchor('palm', 0, 0) : ''}${anchor(front ? `front-${side}-foot` : `back-${side}-foot`, 0, 0)}</g></g>`;
  };

  function owl() {
    return `<g class="owl-pose">
      <g class="owl-tail"><path d="M86 146l-3 23 13-5 6 8 6-8 12 4-5-23" fill="#a18369" stroke="#826c57" stroke-width="1.8"/>${stroke('M94 150l-1 15m8-15v15m9-15 2 14', '#c1a486', 1.2)}</g>
      <g class="wing-flight owl-wing-back" style="--wing-x:125px;--wing-y:100px"><path d="M124 103Q157 81 179 31l2 16 12-8-4 21 9-3-9 21 5 2q-21 27-64 39z" fill="#aa8c72" stroke="#816d58" stroke-width="2"/>${stroke('M131 101l46-52m-38 44 43-31m-35 37 31-13', '#cfb496', 2)}${stroke('M169 52l8 4m-16 9 12 5m-21 8 15 6', '#8e735b', 2.3)}</g>
      <g class="owl-chest"><path d="M75 75q23-15 48 1 28 19 23 52-2 29-22 38-25 10-48-4-17-12-20-35-2-33 19-52z" fill="#c0a185" stroke="#8c735b" stroke-width="2.4"/><path d="M84 87q21-6 35 6 17 20 13 47-6 27-30 27-24-1-31-26-5-31 13-54z" fill="#ddc7a9"/><g class="owl-barring" fill="none" stroke="#aa8b69" stroke-width="1.45"><path d="M85 108l5 4m12-6 3 5m10-3 6 3M79 122l5 3m13-5 4 5m13-4 5 3M81 136l6 3m11-4 3 4m12-4 6 3M90 149l5 3m13-2 5 2"/><path d="M91 106v12m15-12v13m-19 4v10m14-11v10m13-10v11m-15 5v10" stroke="#b69a79" stroke-width=".8"/></g></g>
      <g class="wing-folded owl-folded-left"><path d="M74 86q-22 4-18 40 4 24 18 30l11-39q4-23-11-31z" fill="#a7896e" stroke="#876e57" stroke-width="1.8"/>${stroke('M65 108l12 4m-15 11 11 4m-8 9 6 4M78 103l-12 40', '#d0b696', 1.5)}</g>
      <g class="wing-folded owl-folded-right"><path d="M124 85q24 8 23 39-2 24-19 32l-9-35q-7-25 5-36z" fill="#ad8d70" stroke="#876e57" stroke-width="1.8"/>${stroke('M131 107l10 5m-12 8 12 5m-13 7 10 4M126 100l11 42', '#d6bc9c', 1.5)}</g>
      <g class="wing-flight owl-wing-front" style="--wing-x:75px;--wing-y:99px"><path d="M79 104Q42 86 20 30l-1 17-12-9 4 21-9-2 10 23-7 1q24 27 69 41z" fill="#ba997a" stroke="#876e57" stroke-width="2"/>${stroke('M74 102L23 46m45 52L16 64m48 43L20 82', '#debf99', 1.7)}${stroke('M30 53l-8 4m19 9-13 6m22 8-15 6', '#92745a', 2.5)}</g>
      <g class="head owl-head"><g class="owl-tufts"><path d="M62 53l-6-26 18 10 10 14m34 0 11-15 17-9-5 31" fill="#a8896d" stroke="#826b56" stroke-width="1.9"/>${stroke('M64 38l4 12m68-14-4 14', '#ddc7a8', 1.4)}</g><path d="M60 61q3-26 38-26 40-1 45 28 6 29-15 41-23 10-47-1-25-12-21-42z" fill="#bc9c7b" stroke="#8a7057" stroke-width="2.2"/><path d="M98 49q-18-17-29 7-11 27 17 38 9-1 14-14 5 14 16 15 28-14 13-41-10-19-29-4z" fill="#e3d0b0"/><path d="M64 67q1-16 17-20m43 0q13 4 16 19" fill="none" stroke="#96775c" stroke-width="2"/>
        <g class="owl-open"><ellipse cx="83" cy="69" rx="10" ry="11" fill="#d9bb6e" stroke="#a89054" stroke-width="1"/><ellipse cx="118" cy="69" rx="10" ry="11" fill="#d9bb6e" stroke="#a89054" stroke-width="1"/>${eye(84, 69, 4.2)}${eye(117, 69, 4.2)}</g>
        <g class="owl-closed">${stroke('M74 71q9 8 18-1m17 0q10 9 19 1', '#79664d', 2.1)}${stroke('M76 73l-2 3m16-4 2 3m19-2-2 3m17-2 2 3', '#988363', 1.2)}</g>
        <path d="M99 78l8 0-4 14z" fill="#9f8a66" stroke="#85734f" stroke-width="1.2"/>${stroke('M100 43l3 10m-24-11 2 4m40-5-2 5M69 90l6 3m48-1 6-3', '#9c7d5d', 1.6)}${anchor('mouth',104,92)}
      </g>
      <g class="bird-feet owl-feet"><path d="M87 164l-2 10m29-9 1 9" fill="none" stroke="#b39973" stroke-width="5"/>${stroke('M85 174l-10 3m10-3-1 6m1-6 9 3m21-3-8 4m8-4 2 6m-2-6 10 3', '#8a7b60', 2.1)}${anchor('perch-feet',100,177)}${anchor('left-foot',85,176)}${anchor('right-foot',115,176)}</g>
    </g>`;
  }

  function bear() {
    return `<g class="bear-pose">
      <g class="tail" style="--tail-x:42px;--tail-y:124px"><path d="M45 120q-15-3-19 6 0 10 16 8" fill="#606b60" stroke="#4e5a50" stroke-width="2"/></g>
      ${bearLeg(65,130,65,151,64,173,'far',false)}${bearLeg(148,128,149,151,157,173,'far',true)}
      <g class="bear-torso"><path d="M34 108q2-36 46-37 31-5 61 17 22 14 15 51-4 13-31 16-48 9-85-9-13-17-6-38z" fill="#687168" stroke="#4e5a50" stroke-width="2.5"/><path d="M45 93q10-14 34-13m-38 31q-3 15 4 23" fill="none" stroke="#829080" stroke-width="3" opacity=".65"/>${stroke('M66 86l-3 6m17-11-2 5m21-4 2 5M46 131l3 7m26 4 2 6m28-4-1 6', '#535f53', 1.4)}</g>
      <g class="bear-chest"><path d="M123 87q29 4 29 38l-7 26q-22 2-32-13-12-23 10-51z" fill="#727c70"/><path class="chest-crescent" d="M116 109q8 7 15 8l15-10-4 12-12 8-12-10z" fill="#f0e4c9"/><path d="M119 108l5 3m19-3-5 4" fill="none" stroke="#fff4de" stroke-width="1.2"/></g>
      ${bearLeg(49,138,45,156,48,175,'near',false)}${bearLeg(134,130,135,153,143,175,'near',true)}
      <g class="head bear-head"><g class="bear-ears"><circle cx="130" cy="62" r="15" fill="#697568" stroke="#4e5a50" stroke-width="2"/><circle cx="167" cy="64" r="14" fill="#697568" stroke="#4e5a50" stroke-width="2"/><circle cx="130" cy="63" r="8" fill="#9eaa92"/><circle cx="167" cy="65" r="7.3" fill="#9eaa92"/></g><path d="M121 77q4-28 29-26 26 2 31 28l5 20q-2 25-28 24-34-4-37-46z" fill="#74806f" stroke="#4e5a50" stroke-width="2.3"/><path d="M151 94q22-11 36 4 8 14-11 19-21 1-28-12z" fill="#b9b69b" stroke="#888e76" stroke-width="1.4"/><path d="M175 94q9-3 12 4 0 7-9 7-6-5-3-11z" fill="#3f4d42"/>${eye(145,82,2.8)}${eye(169,83,2.3)}${stroke('M173 105l-2 7-9 1', '#5e6756', 1.5)}${stroke('M136 76l5-2m21 0 6 2M123 93l3 7m8 7 4 3', '#94a08a', 1.3)}${anchor('mouth',167,111)}</g>
      ${anchor('ground-feet',99,176)}
    </g>`;
  }

  function sloth() {
    return `<g class="sloth-pose">
      <g class="sloth-support"><path d="M22 42Q94 31 178 42" fill="none" stroke="#8b7658" stroke-width="12"/><path d="M24 38q72-7 153 0" fill="none" stroke="#b19a71" stroke-width="3"/>${stroke('M43 39l9 2m25-6 12 3m36-1 9 3m22 0 13 2', '#735f46', 1.5)}</g>
      <g class="sloth-hind far" data-claws="3"><path d="M75 120Q44 103 44 78L41 43" fill="none" stroke="#958876" stroke-width="18"/><path d="M35 44C28 35 30 27 35 29q4 2-1 7M42 43C36 34 39 25 43 28q4 2-1 7M49 43C44 35 48 27 52 29q3 2-1 6" fill="none" stroke="#eee3cc" stroke-width="3"/><path d="M42 65l5 5m-1 15 5 5" fill="none" stroke="#baab91" stroke-width="1.5"/></g>
      <g class="sloth-front far" data-claws="2"><path d="M127 106q-4-21 4-35l6-27" fill="none" stroke="#9c8f78" stroke-width="17"/><path d="M132 44C126 35 128 26 134 27q4 2-1 8M141 43C137 34 139 26 146 28q4 3-1 8" fill="none" stroke="#ece1ca" stroke-width="3.5"/>${stroke('M128 78l4 4m-5 10 4 4','#c1b093',1.4)}</g>
      <g class="sloth-trunk"><path d="M67 87q16-23 46-13 31 10 33 40 6 26-20 40-25 13-57-6-27-21-2-61z" fill="#b3a58a" stroke="#8e806a" stroke-width="2.3"/><path d="M79 87q-24 26-8 51 23 22 51 11" fill="none" stroke="#cabc9f" stroke-width="8" opacity=".65"/><g fill="none" stroke="#8e826c" stroke-width="1.3"><path d="M70 99l-4 7m14-19-2 7m17-13 2 7m15-4 4 7m-39 19-3 6m16-12-1 6m15-9 3 7m-5 12 4 7m-30-8 1 7m12 5 3 7m22-14 5 5m-1 11 6 2"/></g><path d="M62 111l-7 5 5 6-2 7 7 2m60 14 8 2 1-7 7-3-4-7" fill="#b3a58a" stroke="#8e806a" stroke-width="1.2"/></g>
      <g class="sloth-hind near" data-claws="3"><path d="M93 128q22-17 17-44l-3-40" fill="none" stroke="#b1a184" stroke-width="19"/><path d="M102 44C95 34 97 26 103 27q4 2-1 8M110 43C103 34 106 25 113 28q4 2-1 7M118 44C113 35 117 28 123 31q3 2-2 6" fill="none" stroke="#f3e9d5" stroke-width="3"/>${stroke('M108 62l4 4m-3 12 4 4m-3 10 4 4','#8e826c',1.3)}</g>
      <g class="head sloth-head"><path d="M125 89q9-12 29-4 26 7 25 29-5 25-29 24-29-3-31-26z" fill="#c5b89a" stroke="#92866e" stroke-width="2"/><path d="M132 99q9-14 22-7 18 7 16 24-14 17-32 6-11-10-6-23z" fill="#e2d3b5"/><path d="M135 99q7-5 12 1m8 4q8-1 12 5" fill="none" stroke="#af987b" stroke-width="5"/><g class="sloth-eyes">${eye(141,101,2)}${eye(162,107,2)}</g><path d="M146 109q9-4 13 3-4 7-11 3z" fill="#786f59"/>${stroke('M151 115l-1 5m0 0 8 2','#91816a',1.2)}${stroke('M128 98l-4 4m48 6 5 4m-37 17 4 4m18-4-2 4','#a39478',1.3)}${anchor('mouth',161,116)}</g>
      <g class="sloth-reach" data-claws="2" data-hip-x="143" data-hip-y="103" style="--joint-x:143px;--joint-y:103px"><path class="sloth-arm" d="M143 103Q161 85 155 68L155 43" fill="none" stroke="#beaf91" stroke-width="16"/><path d="M148 87l-5 6m14-21-5 5m5-21-4 4" fill="none" stroke="#958870" stroke-width="1.3"/><g class="sloth-hand"><path d="M151 43C144 33 145 24 152 25q5 2-1 9M159 43C154 33 158 24 165 27q4 3-2 8" fill="none" stroke="#f3ead6" stroke-width="3.7"/>${anchor('hand',155,39)}</g></g>
      ${anchor('branch-support',100,39)}
    </g>`;
  }

  function bee() {
    return `<g class="bee-pose">
      <g class="bee-wing-side bee-wing-far" style="--wing-x:105px;--wing-y:93px"><path class="bee-forewing" d="M106 94Q97 58 119 35q13-7 13 12-4 27-26 47z" fill="#e8e9d9" fill-opacity=".75" stroke="#a7b6a5" stroke-width="1.6"/><path class="bee-hindwing" d="M103 95q28-36 43-24 5 18-38 33z" fill="#e4e7d3" fill-opacity=".72" stroke="#a7b6a5" stroke-width="1.4"/>${stroke('M107 89l17-44m-13 32 17-10m-21 28 32-18','#bac6b1',.85)}</g>
      <g class="bee-legs bee-legs-far" fill="none" stroke="#766d4d" stroke-width="2.5"><g class="bee-hindleg"><path d="M77 115l-6 19 8 9"/><g class="bee-pollen" fill="#d8ae59" stroke="#b48d49" stroke-width=".8"><ellipse cx="73" cy="133" rx="4.6" ry="6"/></g></g><path d="M101 114l5 17 13 4M120 110l13 15 15 4"/></g>
      <g class="bee-abdomen"><path d="M48 103q10-19 39-18l23 9-1 24-27 10q-27-1-38-18z" fill="#dbba70" stroke="#aa8e55" stroke-width="2"/><path d="M57 93q-2 17 5 29l10 3q-8-20-7-36m14-3q-1 19 8 41l9-4q-8-23-7-36m10 4q0 14 6 30l7-4-2-23" fill="#726e4d"/><path d="M47 104l-7 5 8 4" fill="#726e4d"/>${stroke('M52 99l4-3m14-2 5-1m17 3 5 1','#f0dcaa',1.2)}</g>
      <g class="bee-thorax"><ellipse cx="113" cy="103" rx="19" ry="20" fill="#a89a65" stroke="#82774f" stroke-width="1.7"/><path d="M101 91l2-4m5 3 1-5m6 5 2-4m6 8 3-3M105 119l2 3m5-2 2 4" fill="none" stroke="#dbcca0" stroke-width="2"/></g>
      <g class="bee-wing-side bee-wing-near" style="--wing-x:109px;--wing-y:95px"><path class="bee-forewing" d="M110 96Q71 78 62 39q0-20 14-10 31 25 34 67z" fill="#eef0df" fill-opacity=".8" stroke="#a4b4a1" stroke-width="1.6"/><path class="bee-hindwing" d="M107 99Q73 77 56 90q-7 15 49 20z" fill="#e6e9d5" fill-opacity=".78" stroke="#a4b4a1" stroke-width="1.5"/>${stroke('M106 92L71 37m26 43L69 56m34 43L63 94','#b6c2ad',.9)}</g>
      <g class="bee-legs bee-legs-near" fill="none" stroke="#867a50" stroke-width="2.6"><g class="bee-hindleg"><path d="M95 114l-7 17 10 8 7-1"/><g class="bee-pollen" fill="#e4bc62" stroke="#bf984f" stroke-width=".8"><ellipse cx="90" cy="131" rx="5.5" ry="7"/><path d="M87 128l3 1m-2 4 4-1" stroke="#f3d892"/></g></g><path d="M113 119l3 15 12 4M126 112l12 13 17 2"/>${anchor('feet',102,139)}</g>
      <g class="head bee-head"><path d="M132 91q21-11 28 8 4 18-12 23-18-2-20-14z" fill="#a79762" stroke="#82774f" stroke-width="1.8"/><ellipse cx="149" cy="101" rx="5.5" ry="8" transform="rotate(-14 149 101)" fill="#4b5745"/><ellipse cx="150" cy="97" rx="1.2" ry="2" fill="#cbd5bb"/><g class="bee-antennae">${stroke('M140 91q-7-15-17-14m29 13q1-17 9-20','#6c7250',2)}<circle cx="123" cy="77" r="2" fill="#6c7250"/><circle cx="161" cy="70" r="2" fill="#6c7250"/></g><path class="bee-proboscis" d="M155 111q8 10 2 18" fill="none" stroke="#918153" stroke-width="1.5"/>${anchor('mouth',158,108)}</g>
    </g>`;
  }

  function squirrel() {
    return `<g class="squirrel-pose">
      <g class="tail squirrel-tail" style="--tail-x:79px;--tail-y:148px"><path d="M80 151q-32-8-44-33-18-33-5-59 6-18 23-17 25 5 27 35-1 21-14 18-11-2-10-18-12 10-1 27 16 19 29 30z" fill="#a39a77" stroke="#7e7c5d" stroke-width="2.3"/><path d="M49 52q15 1 18 19m-29 7q-4 36 35 59" fill="none" stroke="#c6b99a" stroke-width="6" opacity=".65"/><g fill="none" stroke="#7f8060" stroke-width="1.25"><path d="M35 62l5-4m-9 18 6-3m-5 19 6-2m1 20 5-4m4 15 6-5m8 16 5-6m-2-82 3 5m7 8-4 3m6 11-4 3"/></g><path d="M29 94l-5-3 3 9-2 4 6 4m7 15-1 5 7 3m24 17 8 4" fill="#a39a77" stroke="#7e7c5d" stroke-width="1.2"/></g>
      <g class="squirrel-hind far"><path d="M117 146q19 20 7 31l-16-1" fill="none" stroke="#979172" stroke-width="12"/>${stroke('M116 175l5 3m-10-3 4 3','#706e53',1)}</g>
      <g class="squirrel-trunk"><path d="M83 133q3-33 26-39 26-4 34 24 6 29-17 50-32 15-43-11z" fill="#a49b78" stroke="#7e7c5d" stroke-width="2.1"/><path d="M114 109q18-2 19 21-2 29-18 34-20-6-18-20z" fill="#bd8f69"/><path d="M111 118q-9 24-1 39" fill="none" stroke="#cfaa84" stroke-width="3"/>${stroke('M90 127l4 4m-9 11 4 4m5 7 3 5m11-53 1 5m24 34-4 4','#858060',1.25)}</g>
      <g class="squirrel-hind near"><path d="M95 144q-17 8-8 27l18 6 11-1" fill="none" stroke="#a79d78" stroke-width="16"/><path d="M104 174l3 4m3-5 3 4m2-4 4 2" fill="none" stroke="#777556" stroke-width="1.15"/>${anchor('feet',112,177)}</g>
      <g class="head squirrel-head"><path d="M111 91l-3-20q10-7 14 11m11 8 6-21q12 0 10 19" fill="#a89c79" stroke="#7e7c5d" stroke-width="1.7"/><path d="M113 77l3 10m29-12-3 12" fill="none" stroke="#c8b295" stroke-width="3"/><path d="M104 99q5-22 24-17 19 3 24 23l14 6q-2 13-21 13-28 2-41-25z" fill="#b2a381" stroke="#7e7c5d" stroke-width="2"/><path d="M136 109q13-8 24 4-3 12-17 10" fill="#dcc9a7"/>${eye(134,99,3.2)}<ellipse cx="160" cy="110" rx="4.3" ry="3.1" fill="#5a6250"/>${stroke('M150 117l7-3m-12 1 3 6M144 112l-17 0m18 5-17 5','#8d8466',1)}${stroke('M117 91l4-3m-11 13 3 4','#cfc2a3',1.3)}${anchor('mouth',144,115)}</g>
      <g class="squirrel-arm"><path d="M120 120q-8 12 6 14l7-5" fill="none" stroke="#a79b77" stroke-width="9"/><path d="M125 129l8-3m-6 6 9-3m-5 5 7-3" fill="none" stroke="#897d5d" stroke-width="1.2"/>${anchor('palm',126,130)}</g>
    </g>`;
  }

  function woodpecker() {
    return `<g class="woodpecker-pose">
      <g class="woodpecker-tail"><path d="M109 131l33 12 29 27-17 0-10-8 5 12-17-5-21-20z" fill="#52635b" stroke="#40534c" stroke-width="1.8"/>${stroke('M116 141l38 25m-27-26 39 27','#899588',1.2)}${anchor('tail-support',171,170)}</g>
      <g class="woodpecker-feet far"><path d="M130 121l20 0 15-9m-15 9 20 3m-20-3 15 8" fill="none" stroke="#9b9477" stroke-width="3"/></g>
      <g class="woodpecker-trunk"><path d="M100 79q-23 34-8 64 17 30 37 9 18-18 12-45l-10-33z" fill="#53675e" stroke="#40564c" stroke-width="2.2"/><path d="M119 86q17 11 18 33 1 22-15 36l-14-17q-7-22 11-52z" fill="#e4dfc5"/><path d="M109 142q9 6 23-3l-4 16q-13 15-21-2z" fill="#bd7c6f"/>${stroke('M117 115l6 5m-8 7 7 3m-5 7 6 2','#c2bba0',1.1)}</g>
      <g class="woodpecker-wing"><path d="M102 87q-23 12-11 49l13 14 18-20 2-32z" fill="#4b6058" stroke="#3e534a" stroke-width="1.8"/><path d="M98 93q-9 9-5 23l12 0q7-7 7-15z" fill="#e8e3c9"/><g fill="#dedec7"><ellipse cx="102" cy="123" rx="4.4" ry="2" transform="rotate(-28 102 123)"/><ellipse cx="100" cy="132" rx="3.6" ry="1.8" transform="rotate(-28 100 132)"/><ellipse cx="108" cy="128" rx="3.7" ry="1.8" transform="rotate(-28 108 128)"/><ellipse cx="107" cy="138" rx="3.2" ry="1.6" transform="rotate(-28 107 138)"/><ellipse cx="113" cy="120" rx="3.2" ry="1.6" transform="rotate(-28 113 120)"/></g>${stroke('M118 105l-12 29','#788e7d',1)}</g>
      <g class="woodpecker-feet near"><path d="M126 134l25-5" fill="none" stroke="#a19a7c" stroke-width="4"/><path d="M151 129l18-12 5 1m-23 11 21-2 3 2m-24 0 18 9 4-2m-22-7 12 12 4-1" fill="none" stroke="#8d896c" stroke-width="2.2"/>${anchor('feet',151,129)}</g>
      <g class="head woodpecker-head"><path d="M102 77q-2-25 19-30 20-5 30 14l-1 15q-13 16-34 17z" fill="#e8e1c7" stroke="#5d6c5b" stroke-width="1.9"/><path d="M103 64q2-21 25-19 15 2 20 15l-21-4-17 11z" fill="#4c6158"/><path d="M102 64l10-6 2 13-11 7z" fill="#ba7b6d"/><path d="M120 76l24-3 1 11-18 1-7 9-8-3z" fill="#4e6357"/>${eye(135,64,2.4)}<path d="M149 61l22 5-22 8z" fill="#9da288" stroke="#758674" stroke-width="1.3"/>${stroke('M151 66h18','#c1c3a8',1)}${stroke('M116 60l8-1m-6 11 5 1','#bebda2',1.1)}${anchor('beak',171,66)}${anchor('mouth',153,70)}</g>
    </g>`;
  }

  function toucan() {
    return `<g class="toucan-pose"><path class="toucan-tail" d="M82 120L53 166Q68 173 84 166l26-42" fill="#425953" stroke="#344b43" stroke-width="2"/>
      <g class="wing-flight toucan-wing-back"><path d="M110 110Q155 93 172 44l8 9-5 17 13-3-9 17 10-1q-23 34-72 43" fill="#526b60" stroke="#344b43" stroke-width="2"/>${stroke('M122 112L172 59m-45 61 52-38','#94a888',2)}</g>
      <path d="M78 82Q60 101 68 134Q80 162 112 153Q135 140 132 112L126 86Z" fill="#475c51" stroke="#344b43" stroke-width="2"/><path d="M101 92q-7 29 12 51l17-13-1-30" fill="#efddaa"/>
      <g class="wing-folded"><path d="M87 93Q65 105 77 143l18 8 22-28Q115 101 87 93" fill="#4e685b" stroke="#344b43" stroke-width="2"/>${stroke('M91 111l-4 30m11-25-1 27m10-24-5 25','#829b7c',1.5)}</g>
      <g class="wing-flight toucan-wing-front"><path d="M85 111Q42 94 23 44l-9 8 5 16-13-3 10 18-11-1q25 36 72 47Z" fill="#536d5e" stroke="#344b43" stroke-width="2"/>${stroke('M75 115L22 58m45 64L16 82','#94a888',2)}</g>
      <g class="head toucan-head"><path d="M89 54q20-19 42 0l3 35q-9 23-31 19-26-14-14-54Z" fill="#43594d" stroke="#344b43" stroke-width="2"/><path d="M109 74q10-16 24-4l-1 27q-10 15-23 8" fill="#efdea3"/>
      <path d="M129 57Q160 36 194 54Q198 74 172 85L129 82Z" fill="#a3c18b" stroke="#6a936e" stroke-width="2"/><path d="M131 59Q165 40 187 53L151 67 129 69Z" fill="#e5d187"/><path d="M153 70l27-13 11 2q-4 12-19 18Z" fill="#dfa580"/><path d="M185 51q13 10 8 21l-13 8 3-17Z" fill="#94777c"/>${stroke('M130 77q32 1 61-10','#638665',1.5)}<g class="toucan-open"><circle cx="117" cy="65" r="7" fill="#a2c6bc"/>${eye(118,65,2.7)}</g><g class="toucan-closed">${stroke('M112 67q6 4 12-1','#344b43',2)}</g>${anchor('beak',193,68)}${anchor('mouth',136,82)}</g>
      <g class="toucan-feet"><path d="M89 150l-2 22m27-22 1 22" fill="none" stroke="#819b9c" stroke-width="5"/>${stroke('M87 172l-11 6m11-6-1 7m1-7 10 5m18-5-9 6m9-6 2 7m-2-7 11 5','#627e80',2)}${anchor('left-foot',87,177)}${anchor('right-foot',115,177)}</g></g>`;
  }
  const models = { owl, bear, sloth, bee, squirrel, woodpecker, toucan };
  function animal(id) {
    if (!Object.prototype.hasOwnProperty.call(models, id)) return '';
    return `<g class="creature-art forest-creature-art" data-kind="${id}"><g class="animal-motion"><g class="facing"><g class="body" stroke-linecap="round" stroke-linejoin="round">${models[id]()}</g></g></g></g>`;
  }
  // Coordinates are in the host's 0 0 200 200 SVG viewBox. Transform each hidden
  // anchor's center through getScreenCTM() and the scene's inverse matrix.
  G.forestArt = { animal };
})();
