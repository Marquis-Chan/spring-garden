# 春日小花园

双击同目录的 **春日小花园.html**，用 Chrome 或 Edge 打开即可。整个游戏、原创 SVG 插画和真实动物录音都在这一个文件里，复制到另一台电脑也可断网游玩，无需安装或启动服务。

打开就是花园，没有入口文字、教学、分数或关卡。移动鼠标会出现小花光标和花瓣；滑过花朵会摇摆，滑过池塘会有涟漪，靠近动物稍停一会儿就会得到回应。点击草地会开花，按住鼠标在草地上移动也可以种花。冷却期间仍保留轻视觉反馈，动作和叫声不会排队堆积。

底部15个动物图案可直接叫来对应朋友。小鸟、三只不同配色的蝴蝶和鱼儿常驻；猫狗有独立前景来访位置，约24秒后淡出，也可再次叫来；大象、长颈鹿、猴子、孔雀、老虎、斑马、河马、犀牛、乌龟、企鹅轮流来访，同时最多两位主要访客。初始画面就有大象和长颈鹿。动物各有专属动作：大象喷水开花、孔雀开屏、长颈鹿低头、小狗摇尾抬爪追球、猴子大幅招手、折肘把香蕉送到嘴边、老虎观察蝴蝶、斑马抬一只前蹄、河马冒泡、犀牛逗蝴蝶、乌龟探头缓行、企鹅脚掌固定、肩部和鳍翅轻摆。

首次自动来访在游玩时钟约7秒，随后每15–25秒轮换（包含猫狗）；两个大型来访位置已满也会让最久未被孩子叫到的朋友离开，保持最多两位。点击召唤或互动后至少保护9秒，鼠标仍在访客身上或按住鼠标时暂缓自动替换。新访客约0.75秒走入，随后回应。香蕉叫猴子，池塘点击叫河马，西瓜叫乌龟；点花引导蝴蝶，连续种花也会轮流带出朋友。具体机制见 [新版设计说明.md](./新版设计说明.md)。

本次迭代重画了动物的身体比例和轮廓，四足动物采用自然体态。小鸟有起飞、连续拍翅、收脚飞行、减速落枝与收翅的过程；小狗的四条腿分关节运动，落地阶段脚掌接地、摆动阶段抬脚，走路时暂停抬爪招呼。老虎额头以SVG条纹画出三横一竖的王形纹，增加耳内浅色和脸颊纹。场景重新分区，花朵逐株留白；种花会寻找附近空位，空间已满时让现有花回应。

有雏菊、郁金香、向日葵、虞美人、绣球、铃兰六种花；苹果摘下一颗，树上就少一颗，篮子落定后多一颗；点篮子可倒出苹果，再点篮子一起收回，地面上的苹果也可单独捡起。香蕉会叫来猴子，西瓜会打开，草莓能吸引蝴蝶。点太阳／月亮或停留1.4秒可切换昼夜；白天大象喷水时出现彩虹，云朵缓慢移动，遮住太阳／月亮时花园平滑变暗；月牙和满月交替出现，五角星各自约1.8～2.8秒明暗闪烁；按住云朵可以拖动，松手后停住，直接点击则飘到日月前停住，再点停住的云恢复漂移，小惊喜也会随探索出现。

首次点击会允许浏览器开启声音。右上角只有声音和全屏两个图标；声音按钮可静音，第一次直接点击它会开启声音。录音保持自然音高，带淡入淡出，默认音量46%，十二个片段按有效叫声响度统一并留峰值余量，取消老虎额外降低系数。猫和孔雀保留参考音色；其他录音采用轻度谱减背景声、淡入淡出，原音高和时序保留。明确点击某只动物时优先单独播放它的声音，自动来访不打断正在播放的叫声。不循环播放背景音乐。

**Ctrl + Shift + P** 打开图标式家长设置并暂停花园。上方滑块是音量，下方时钟旁的滑块依次为不限时、5、10、15分钟；默认不限时。到时显示睡觉的小云朵，家长可点击播放图案继续。设置尽力保存在本地；无法存储也不影响游玩。

切到其他窗口或标签页时，动作、游玩时钟与声音暂停；返回不补播叫声或堆积访客。右键、拖动、滚轮不会弹出游戏内菜单或滚动页面。Esc可退出全屏。网页不能屏蔽 Windows 系统快捷键。

12种有叫声的动物使用有来源及许可的真实录音。孔雀已替换成Kinoton明确标注的雄性蓝孔雀录音；企鹅、斑马修正片段时长。鱼、蝴蝶和乌龟只给视觉回应，没有编造叫声、合成鸣叫或语音播报。[素材来源.md](./素材来源.md) 和 `assets/credits.json` 保存作者、来源、许可证与选用片段；这些信息也嵌入成品 HTML。另有 [叫声核对.html](./叫声核对.html) 供家长逐一试听相同的素材与播放器，文字只出现在此独立核对页。

当前开放春季晴朗草地的白天和夜晚。预留三条独立配置轴：`time`（白天/夜晚）、`season`（四季）、`scene`（晴朗草地/下雨草地/海底）。太阳／月亮用于昼夜切换；四季、下雨草地和海底仍留待后续。

本轮策划与交互取舍见 [新一轮体验策划.md](./新一轮体验策划.md)。猫狗不在场时也保留回来的空间，种花不会挡住它们；三只蝴蝶分批起飞，空花点击会引导正在飞的蝴蝶转向，都休息时选最近可达的一只，花上已有蝴蝶时它会展开翅膀回应。河马变大，大象在右侧遇到河马时可以转向左边的花浇水。

源码在 `index.template.html`、`styles.css`、`wildlife.css` 和 `src/`，素材在 `assets/`。`src/wildlife.js` 是本轮使用的自然体态动物绘制模块。运行时不依赖这些旁边的文件；只有重新构建时需要。

```powershell
node spring-garden/tools/build.mjs
node --test spring-garden/tests/logic.test.cjs spring-garden/tests/motion.test.cjs spring-garden/tests/nature.test.cjs
node spring-garden/tests/nature-browser.cjs
node spring-garden/tests/nature-browser.cjs --edge
node spring-garden/tests/living-garden.cjs
node spring-garden/tests/living-garden.cjs --edge
node spring-garden/tests/pet-return.cjs
node spring-garden/tests/moving-flower.cjs
node spring-garden/tests/slow-butterfly.cjs
node spring-garden/tests/sound-levels.cjs
node spring-garden/tests/elephant-replacement.cjs
node spring-garden/tests/five-point-stars.cjs
node spring-garden/tests/cloud-control.cjs
node spring-garden/tests/cloud-control.cjs --edge
node spring-garden/tests/animal-review.cjs
node spring-garden/tests/browser-check.cjs
node spring-garden/tests/browser-check.cjs --edge
node spring-garden/tests/layout-check.cjs
node spring-garden/tests/causal-check.cjs
node spring-garden/tests/causal-check.cjs --edge
node spring-garden/tests/motion-stress.cjs
node spring-garden/tests/audio-audit.cjs
node spring-garden/tests/encounter-check.cjs
node spring-garden/tests/interaction-regressions.cjs
node spring-garden/tests/soak-check.cjs
node spring-garden/tools/build-audio-review.mjs
```

浏览器测试使用本机 Chrome/Edge 和本环境的 Playwright 路径，其他开发机需调整测试工具路径。实际验证结果在 `verification/`。单文件约2.10 MiB。本版以横屏电脑为主，竖向窗口保持全景完整并留白，不裁掉动物图案。

这一轮继续用 HTML，重构了动作与物品状态。大象鼻子从固定根部弯曲抬起，鼻尖、开口和皱纹随形态改变；水在抬鼻后从开口朝前喷出，落到花上，再收水放下鼻子。猫/老虎的尾纹、大象/长颈鹿/斑马的尾尖、脚趾和蹄纹都跟随所属部位。苹果与树冠一起轻晃，小鸟收翅时羽毛线也一起收起。

蝴蝶缩为花圃里合适的比例，点花后沿预先检查的路线飞过去，脚与吸蜜口停在花瓣上，停留后再换近处的花。飞行每帧检查动物与水果位置，提前保留猫狗活动范围及访客空地；目标花被替换时重新找花。飞行、喷水、落果、篮子内容与花园时钟共同暂停。`src/motion.js` 管理苹果状态与路径，仍内嵌进唯一成品 HTML。

飞行途中重新点花会记住最新指定花株。如果当下无法安全改变路线，蝴蝶先完成当前落点，再继续飞到指定的花；点击花朵边上的留白也使用同一规则。

本轮逐只动作、喷水与昼夜交互说明见 [动物动作与昼夜说明.md](./动物动作与昼夜说明.md)。孔雀改为逐羽展开和轻颤；水流到达后才溅起水花，涟漪限定在真实水面中。夜间蝴蝶减少自主换花，鼠标留下暖色光点，操作没有新增文字。
