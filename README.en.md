# Spring Garden · Animal Kingdom

[中文](README.md) · **English**

Spring Garden v0.5.5 rebuilds the original animal game as a quiet 3D world for young children and their families. Tap an animal or drag the map and explore at your own pace. There are no scores or levels to beat.

**[Play online](https://marquis-chan.github.io/spring-garden/)** · **[Download for offline play](https://github.com/Marquis-Chan/spring-garden/releases/latest/download/spring-garden.html)** · [Release history](https://github.com/Marquis-Chan/spring-garden/releases)

## What to explore

- Drag a continuous map and visit twelve habitats: the pond, grove, orchard, savanna, riverbank, Asian woodland, rainforest, coast, ice shore, ocean, eucalyptus grove and bamboo grove.

- Watch tadpoles find the frog, tap the orchard rabbits, or see a toucan and a sloth reach for the same berry.

- Tap the sun or moon to change the time of day. Animals rest, and small flocks occasionally cross the daytime sky.

The offline edition is a single HTML file. Open it in a modern browser with WebGL 2 support. Try Chrome or Edge with hardware acceleration enabled if 3D does not start. Sound becomes available after the first interaction; no installation or account is needed.

Meet crabs and silver fish in the penguin tidepool, or invite a polar bear out of its ice cave.

v0.5.5 refines panda feeding, savanna movement, day/night transitions and cameras, with updated scarlet macaw, hedgehog, mallard and polar bear recordings.

## Classic edition

[Play the classic edition](https://marquis-chan.github.io/spring-garden/classic/) · [Download classic v0.2.1](https://github.com/Marquis-Chan/spring-garden/releases/tag/v0.2.1). The original 2D game and its source remain in this repository.

## Build and licensing

The new source, audio, tests and build tools are in [animal-kingdom/](animal-kingdom/). With Node.js 24:

```sh
cd animal-kingdom
npm ci --ignore-scripts
npm test
npm run build
```

The build produces `animal-kingdom/动物王国.html`.

Original code and art are [MIT licensed](LICENSE). Recordings retain their individual licenses; source credits are maintained separately. Consult the current asset list; historical releases retain their original terms. See the [Animal Kingdom audio credits](animal-kingdom/THIRD_PARTY_NOTICES.md).
