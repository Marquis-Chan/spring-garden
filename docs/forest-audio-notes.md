# 当前说明 · 2026-10-19

现在使用 17 项录音，亚洲黑熊已加入，详见 `assets/forest-credits.json`。角鸮与啄木鸟短片段组合为原速多次回应，分别约 3.06 秒和 3.05 秒；音源未更换。完整处理改动见 `THIRD_PARTY_NOTICES.md` 的 2026-10-19 节。下文是首次新增三项森林声音时的历史调查记录，其中“熊保持无声”等旧状态不再表示当前版本。

# 树林音频来源与交付

2026-10-05 更新：已加入真实亚洲黑熊进食叫声，并将猴子替换为黄胸卷尾猴的真实进食短叫；两个来源均为柏林自然博物馆 Tierstimmenarchiv，CC-BY-SA-3.0-DE。新录音的物种、原件哈希、加工与响度记录见 [原有声音清单](../assets/credits.json) 与 [森林声音清单](../assets/forest-credits.json)。当前森林 manifest 为 owl、woodpecker、bee、bear 四项，连同后来加入的公狮子录音，全部合计 17 项；熊原始档案注明背景鸟声，未宣称完全无杂音。下方为 2026-10-04 的历史核查记录，其中“熊保持安静”已被本次核验结果取代。

核查日期：2026-10-04。只收录下载成功、许可明确、有真实录音说明的素材。

| 游戏 ID | 可用声音 | 物种与原录音地点 | 许可 | 处理后实测 |
|---|---|---|---|---|
| owl | 0.90 秒红角鸮叫声 | Otus sunia；印度 Kerala、Parambikulam；2006 年 12 月 | 原作者 Raghu 释出公有领域（PD-self，并非自行改写为 CC0） | 有效叫声 RMS -18.00 dBFS；峰值 -6.63 dBFS |
| woodpecker | 0.85 秒大斑啄木鸟鼓击 | Dendrocopos major；德国 50.973805 N, 6.882097 E；2010-03-16 | T.Voekler / Teacoolish，CC BY-SA 3.0；此截取处理后的 WAV 同许可 | 有效鼓击 RMS -18.61 dBFS；峰值 -2.00 dBFS |
| bee | 3.00 秒蜂场振翅环境声 | 原作者只确认 honey bees，未指定种；新西兰 Auckland、Waitakere Ranges；2016 年夏 | kiwimana，CC0 1.0 | 有效段 RMS -28.00 dBFS；全段 RMS -30.38 dBFS；峰值 -12.69 dBFS |

## 来源与身份边界

- [红角鸮来源页](https://commons.wikimedia.org/wiki/File:Otus_sunia.ogg)：原作者作品，标题与说明都标注 Oriental scops owl，元数据注明 Parambikulam、Kerala。可用于夜间角鸮回应，不把鸣叫解释成开心、人类交流或取食提示。
- [大斑啄木鸟来源页](https://commons.wikimedia.org/wiki/File:Great_Spotted_Woodpecker_drum.ogg)：原作者标注 Dendrocopos major、日期与德国坐标。这是鼓击机械声，不能标为声带叫声；可用于树干啄击动作。录音本身并非亚洲实录，manifest 明确保留德国地点。游戏模型应采用大斑啄木鸟身份，不能改借给其他啄木鸟。
- [蜜蜂来源页](https://freesound.org/people/kiwimana/sounds/341639/)：真实蜂群回巢环境录音；本站原 WAV 需登录，交付保留公开高质量 MP3 预览，不宣称下载了原始 WAV。游戏只可将其作为通用真实蜂振翅环境声，不能标注 Apis cerana，也不能说这是亚洲蜂叫声。模型若标 Apis cerana，应在音源说明中同时保留“蜂场振翅录音，未鉴定种”。

## 保持无叫声的动物

- 亚洲黑熊 Ursus thibetanus：本轮 Commons、Freesound 与公开研究来源没有找到可确认该种、许可可复用且适合当前轻柔互动的短录音；不借用美洲黑熊、棕熊、虎或人工拟声。
- 赤腹松鼠 Callosciurus erythraeus：Commons 的 [Single squirrel Taiwan](https://commons.wikimedia.org/wiki/File:Single_squirrel_Taiwan.ogg)、Squirrels2024Taiwan 01 和 Three Squirrels chirping，原作者均只写“Most probably Callosciurus erythraeus”。身份有保留，未纳入游戏声音 manifest。
- 二趾树懒：未找到合适的真实、物种明确且许可可复用短声，保留安静的视觉回应。没有用合成或人类模仿替代。
- Apis cerana 精确种录音：公开研究 [PeerJ 14696](https://peerj.com/articles/14696/) 指向 [Zenodo 7302404](https://zenodo.org/records/7302404)，但存档音频 Restricted，仅编辑／审稿人可请求，未下载或绕过访问限制。蜂群防御警戒研究也不适合平静采花语境。

## 可复查的处理

三个来源文件全部留在 assets/audio/forest/raw/，SHA256 写入 assets/forest-credits.json。网页证据留在 research/forest-audio-*-source.html。只做单声道／32 kHz 解码、原时间轴短截取、直流偏置移除、线性增益与 16 ms 淡入淡出；角鸮另有保守频谱降噪与 45 Hz 以下隆隆声衰减。不生成、不变调、不变速，不额外制造鼓击。啄木鸟的瞬时鼓击峰值优先保持 -2 dBFS 上限，因此有效段 -18.61 dBFS，比目标轻 0.61 dB，不进行非线性压缩。

research/forest-audio-process.py 复现处理；research/forest-audio-verification.json 记录量测与成品校验和。网页信息与波形已核查，未声称完成基于试听的主观音质审查；部署前应由父任务使用授权的游戏音频试听路径确认听感。

manifest 只有 owl、woodpecker、bee 三项，缺失 bear、squirrel、sloth 表示该物种当前保持安静；禁止以空占位文件或另一个物种声音填补。
