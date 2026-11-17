const arrivalDelay = 7.6;
const flightTime = 10.4;
const passes = [
  { direction: 1, altitude: .18, count: 3, rest: 24 },
  { direction: -1, altitude: .21, count: 2, rest: 29 },
  { direction: 1, altitude: .16, count: 2, rest: 26 },
  { direction: -1, altitude: .19, count: 3, rest: 32 }
];

export function createSkyFlight() {
  let clock = -arrivalDelay;
  let route = 0;
  return {
    step(seconds, canFly) {
      if (!canFly) {
        // 飞到一半遇到天黑，回来以后也从视野外重新开始。
        if (clock >= 0) clock = -arrivalDelay;
        return null;
      }
      clock += seconds;
      while (clock >= flightTime) {
        clock -= flightTime + passes[route].rest;
        route = (route + 1) % passes.length;
      }
      if (clock < 0) return null;
      const { direction, altitude, count } = passes[route];
      return { direction, altitude, count, age: clock, progress: clock / flightTime };
    }
  };
}
