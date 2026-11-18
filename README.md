# 春日小花园 · 动物王国

**中文** · [English](README.en.md)

春日小花园 v0.5.2 把原来的动物互动小游戏重做成一座可以慢慢逛的 3D 动物王国。它为喜欢动物的幼儿和一起陪玩的家长而做：没有分数或闯关要求，孩子可以点动物、拖动地图，想去哪里就去哪里。

**[在线玩](https://marquis-chan.github.io/spring-garden/)** · **[下载离线版](https://github.com/Marquis-Chan/spring-garden/releases/latest/download/spring-garden.html)** · [发布记录](https://github.com/Marquis-Chan/spring-garden/releases)

## 这次可以玩什么

- 拖动连续的大地图，走近十处场景：池塘、林缘、果园、草原、河岸、亚洲树林、雨林、海岸、冰岸和海底。

- 看池塘里的小蝌蚪找青蛙，到果园点小兔子，或在雨林看巨嘴鸟和树懒抢同一颗果实。

- 点太阳或月亮切换昼夜。动物会休息，白天偶尔还有一群鸟从天空飞过。

离线版是一个 HTML 文件。下载后用支持 WebGL 2 的现代浏览器打开；若 3D 无法启动，可使用启用了硬件加速的 Chrome 或 Edge。首次点按后允许声音，无需安装或注册。

企鹅湾可以点潮池请出螃蟹、点海藻让银鱼换群；北极熊会从冰洞探头走出来。

## 经典版

[在线玩经典版](https://marquis-chan.github.io/spring-garden/classic/) · [经典版 v0.2.1 离线下载](https://github.com/Marquis-Chan/spring-garden/releases/tag/v0.2.1)。原来的 2D 小花园和源码继续保存在同一仓库。

## 构建与许可

新版的源码、录音、测试和构建工具在 [animal-kingdom/](animal-kingdom/)。使用 Node.js 24：

```sh
cd animal-kingdom
npm ci --ignore-scripts
npm test
npm run build
```

构建生成 `animal-kingdom/动物王国.html`。

原创代码和美术使用 [MIT 许可](LICENSE)。录音保留各自的许可；其中幼鸭叫声只允许非商业使用。来源和改动见[新版素材署名](animal-kingdom/THIRD_PARTY_NOTICES.md)。
