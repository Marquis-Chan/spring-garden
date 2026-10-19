# 春日小花园｜给 2 岁宝宝的动物互动小游戏

**中文** · [English](README.en.md)

最初做这个小花园，是想让一个 **2 岁左右、喜欢动物的孩子**，有一片可以点点、听听、随意探索的小天地。现在把它免费开源，也分享给正在找宝宝动物游戏、幼儿小游戏和亲子陪玩小工具的家长。

没有分数、闯关或识字任务。点一下动物，看它动一动、听听声音；陪孩子摘苹果、看小狗捡球、让大象喷水，白天和夜晚都能慢慢逛。

**[🌿 直接在线玩](https://marquis-chan.github.io/spring-garden/)** · **[⬇ 下载离线版（单个 HTML 文件，约 4.2 MB）](https://github.com/Marquis-Chan/spring-garden/releases/latest/download/spring-garden.html)** · [所有版本](https://github.com/Marquis-Chan/spring-garden/releases) · [反馈问题或想法](https://github.com/Marquis-Chan/spring-garden/issues)

![春日小花园实际游戏画面：苹果树、小鸟、河马与动物图案](docs/preview.png)

## 下载后怎么玩

1. 点击上面的下载链接，保存 `spring-garden.html`。
2. 在电脑上双击文件，用 Chrome、Edge 或其他现代浏览器打开。
3. 第一次点击后开启声音，家长陪着孩子一起探索。

**不需要安装，不需要注册；下载后可以离线玩，没有广告。** 代码、插画和声音都装在这个文件里。手机和平板能否直接打开本地 HTML，取决于系统和浏览器；目前建议先用电脑浏览器体验。

## 小花园里有什么

- 草地和一片合并后的树林，23 类动物形象；猴子、树懒、巨嘴鸟与原树林动物在同一页，水池也有鱼。
- 点动物看互动，点动物图案邀请它；点叶拱门在草地与树林之间往返。
- 摘苹果、倒出再捡回；小狗捡球、大象喷水、蜜蜂采蜜，还有动物取食和休息。
- 点太阳或月亮切换昼夜，拖动云朵；17 项真实动物及自然录音，部分动物保持安静。短录音以原速多次短叫回应，狗声更清楚，老虎恢复叫声。
- 右上角可关闭声音、切换全屏；电脑上按 **Ctrl + Shift + P** 打开家长设置，可调音量和游玩时长。

这是一个持续完善的小作品，欢迎家长分享实际使用感受。它的出发点是陪孩子玩乐和探索，不宣称特定的早教效果。

## 想改进它？

欢迎 Fork、提交 Issue 或 Pull Request：改善触摸体验、调整动物动作、增加场景，或者做一个更适合自己孩子的版本。引入新录音或图片时，请一并保留来源和许可说明。

源码版下载：仓库右上方 **Code → Download ZIP**。解压后直接打开 `春日小花园.html` 就能玩；改动源码后，在装有 Node.js 的环境中执行：

```sh
node tools/build.mjs
node --test tests/*.test.cjs
node tests/release-audit.cjs
```

代码在 `src/`，插画与界面在 `index.template.html` 和 CSS 文件中，声音与署名在 `assets/`。更详细的玩法和开发记录见 [开发说明](DEVELOPMENT.md)。

推送到 `main` 后，GitHub Actions 会重新构建、核验并自动更新网页版。离线下载包随 Releases 发布。

## 开源许可与感谢

原创代码、SVG 插画和文档采用 [MIT 许可](LICENSE)，允许使用、修改和分享，请保留许可声明。**第三方动物录音各自保留原许可**，包括 CC0、CC BY、CC BY-SA 和公有领域声明；复用或修改录音时，请查看 [录音署名与许可](THIRD_PARTY_NOTICES.md)。单文件游戏也保留了许可及录音署名信息。

感谢分享动物与自然录音的作者。希望这个小花园能给更多喜欢动物的孩子带来一点快乐。

关键词：春日小花园、2 岁宝宝游戏、幼儿动物游戏、动物互动小游戏、亲子游戏、离线小游戏、免费开源；toddler game, animal game for kids, offline HTML5 game, interactive storybook.
