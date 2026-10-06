import { expect, test } from "vitest";
import { startLevel, startWithDeal } from "./session";
import type { DealTile, Face } from "./session";

const tong1: Face = { suit: "tong", rank: 1 };
const tong2: Face = { suit: "tong", rank: 2 };
const tong3: Face = { suit: "tong", rank: 3 };
const tong4: Face = { suit: "tong", rank: 4 };

function freeTile(id: string, face: Face, x: number): DealTile {
  return tile(id, face, { x, y: 0, width: 10, height: 10 }, 0);
}

function tile(
  id: string,
  face: Face,
  rect: DealTile["rect"],
  z: number,
): DealTile {
  return { id, face, rect, z };
}

test("picking a free tile moves it to the tray", () => {
  const session = startWithDeal([
    tile("a", tong1, { x: 0, y: 0, width: 10, height: 10 }, 0),
  ]);

  expect(session.pick("a")).toBe(true);

  const snap = session.snapshot();
  expect(snap.tiles).toEqual([]);
  expect(snap.tray).toEqual([{ id: "a", face: tong1 }]);
  expect(snap.status).toBe("playing");
});

test("snapshot marks a covered tile as not free", () => {
  const session = startWithDeal([
    tile("bottom", tong1, { x: 0, y: 0, width: 10, height: 10 }, 0),
    tile("top", tong2, { x: 5, y: 5, width: 10, height: 10 }, 1),
  ]);

  const snap = session.snapshot();
  expect(snap.tiles.find((item) => item.id === "bottom")?.free).toBe(false);
  expect(snap.tiles.find((item) => item.id === "top")?.free).toBe(true);
});

test("picking a free tile that covers another leaves the lower tile", () => {
  const session = startWithDeal([
    tile("bottom", tong1, { x: 0, y: 0, width: 10, height: 10 }, 0),
    tile("top", tong2, { x: 5, y: 5, width: 10, height: 10 }, 1),
  ]);

  expect(session.pick("top")).toBe(true);

  const snap = session.snapshot();
  expect(snap.tray).toEqual([{ id: "top", face: tong2 }]);
  expect(snap.tiles).toEqual([
    {
      id: "bottom",
      face: tong1,
      rect: { x: 0, y: 0, width: 10, height: 10 },
      z: 0,
      free: true,
    },
  ]);
});

test("picking a covered tile is rejected", () => {
  const session = startWithDeal([
    tile("bottom", tong1, { x: 0, y: 0, width: 10, height: 10 }, 0),
    tile("top", { suit: "tong", rank: 2 }, { x: 5, y: 5, width: 10, height: 10 }, 1),
  ]);

  expect(session.pick("bottom")).toBe(false);

  const snap = session.snapshot();
  expect(snap.tiles.map((item) => item.id).sort()).toEqual(["bottom", "top"]);
  expect(snap.tray).toEqual([]);
});

test("three matching faces anywhere in the tray clear", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("a3", tong1, 40),
    freeTile("b1", tong2, 60),
    freeTile("b2", tong2, 80),
  ]);

  expect(session.pick("a1")).toBe(true);
  expect(session.pick("b1")).toBe(true);
  expect(session.pick("a2")).toBe(true);
  expect(session.pick("b2")).toBe(true);
  expect(session.pick("a3")).toBe(true);

  expect(session.snapshot().tray).toEqual([
    { id: "b1", face: tong2 },
    { id: "b2", face: tong2 },
  ]);
});

test("a seventh tile that completes a match does not lose", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("a3", tong1, 40),
    freeTile("b1", tong2, 60),
    freeTile("b2", tong2, 80),
    freeTile("c1", tong3, 100),
    freeTile("c2", tong3, 120),
  ]);

  for (const id of ["a1", "a2", "b1", "b2", "c1", "c2", "a3"]) {
    expect(session.pick(id)).toBe(true);
  }

  const snap = session.snapshot();
  expect(snap.status).toBe("playing");
  expect(snap.tray).toHaveLength(4);
});

test("a full tray after resolving matches is a loss", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("b1", tong2, 40),
    freeTile("b2", tong2, 60),
    freeTile("c1", tong3, 80),
    freeTile("c2", tong3, 100),
    freeTile("d1", tong4, 120),
  ]);

  for (const id of ["a1", "a2", "b1", "b2", "c1", "c2", "d1"]) {
    expect(session.pick(id)).toBe(true);
  }

  expect(session.snapshot().status).toBe("lost");
  expect(session.snapshot().tray).toHaveLength(7);
});

test("clearing the board and tray is a win", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("a3", tong1, 40),
  ]);

  expect(session.pick("a1")).toBe(true);
  expect(session.pick("a2")).toBe(true);
  expect(session.pick("a3")).toBe(true);

  const snap = session.snapshot();
  expect(snap.status).toBe("won");
  expect(snap.tiles).toEqual([]);
  expect(snap.tray).toEqual([]);
});

function faceKey(face: Face): string {
  return `${face.suit}-${face.rank}`;
}

function layoutOf(session: ReturnType<typeof startLevel>) {
  return session
    .snapshot()
    .tiles.map((tile) => ({
      id: tile.id,
      face: tile.face,
      rect: tile.rect,
      z: tile.z,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function winByHighestZ(session: ReturnType<typeof startWithDeal>): boolean {
  for (;;) {
    const snap = session.snapshot();
    if (snap.status === "won") {
      return true;
    }
    if (snap.status === "lost") {
      return false;
    }
    const free = snap.tiles
      .filter((tile) => tile.free)
      .sort((a, b) => b.z - a.z);
    if (free.length === 0 || !session.pick(free[0].id)) {
      return false;
    }
  }
}

function canWinFrom(deal: DealTile[]): boolean {
  return winByHighestZ(startWithDeal(deal));
}

function countsOf(tiles: { face: Face }[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const key = faceKey(tile.face);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort();
}

test("level 1 deals three of each tong 1-6", () => {
  const tiles = startLevel(1).snapshot().tiles;
  expect(tiles).toHaveLength(18);

  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const key = faceKey(tile.face);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  expect([...counts.entries()].sort()).toEqual([
    ["tong-1", 3],
    ["tong-2", 3],
    ["tong-3", 3],
    ["tong-4", 3],
    ["tong-5", 3],
    ["tong-6", 3],
  ]);
});

test("level 1 uses a fixed seed", () => {
  expect(layoutOf(startLevel(1))).toEqual(layoutOf(startLevel(1)));
});

test("level 1 starts with at least four free tiles and is solvable", () => {
  const session = startLevel(1);
  const snap = session.snapshot();
  expect(snap.tiles.filter((tile) => tile.free).length).toBeGreaterThanOrEqual(4);
  expect(canWinFrom(snap.tiles)).toBe(true);
});

test("level 1 tiles sit between the hud and the tray", () => {
  for (const tile of startLevel(1).snapshot().tiles) {
    expect(tile.rect.x).toBeGreaterThanOrEqual(16);
    expect(tile.rect.y).toBeGreaterThanOrEqual(64);
    expect(tile.rect.x + tile.rect.width).toBeLessThanOrEqual(344);
    expect(tile.rect.y + tile.rect.height).toBeLessThanOrEqual(344);
  }
});

test("undo is unavailable at the start of a round", () => {
  const session = startLevel(1);
  expect(session.snapshot().canUndo).toBe(false);
  expect(session.undo()).toBe(false);
});

test("undo restores the previous hand including a match", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("a3", tong1, 40),
    freeTile("b1", tong2, 60),
  ]);
  session.pick("a1");
  session.pick("a2");
  session.pick("a3");
  expect(session.snapshot().tray).toEqual([]);
  expect(session.undo()).toBe(true);
  expect(session.snapshot().tray).toEqual([
    { id: "a1", face: tong1 },
    { id: "a2", face: tong1 },
  ]);
  expect(session.snapshot().undosLeft).toBe(2);
});

test("undo is limited to three uses", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("b1", tong2, 40),
    freeTile("b2", tong2, 60),
    freeTile("c1", tong3, 80),
  ]);
  session.pick("a1");
  session.pick("a2");
  session.pick("b1");
  session.pick("b2");
  expect(session.undo()).toBe(true);
  expect(session.undo()).toBe(true);
  expect(session.undo()).toBe(true);
  expect(session.undo()).toBe(false);
  expect(session.snapshot().undosLeft).toBe(0);
});

test("restart restores the same deal and refills tools", () => {
  const first = layoutOf(startLevel(1));
  const session = startLevel(1);
  const free = session.snapshot().tiles.find((tile) => tile.free);
  expect(free).toBeDefined();
  session.pick(free!.id);
  session.undo();
  session.restart();
  const snap = session.snapshot();
  expect(layoutOf(session)).toEqual(first);
  expect(snap.undosLeft).toBe(3);
  expect(snap.shufflesLeft).toBe(1);
  expect(snap.tray).toEqual([]);
});

test("shuffle keeps the tray and remains solvable", () => {
  const session = startLevel(1);
  const free = session.snapshot().tiles.find((tile) => tile.free);
  expect(free).toBeDefined();
  session.pick(free!.id);
  const tray = session.snapshot().tray;
  const remaining = session.snapshot().tiles.length;
  expect(session.shuffle()).toBe(true);
  const snap = session.snapshot();
  expect(snap.tray).toEqual(tray);
  expect(snap.tiles).toHaveLength(remaining);
  expect(snap.shufflesLeft).toBe(0);
  expect(session.shuffle()).toBe(false);
  expect(winByHighestZ(session)).toBe(true);
});

test("a perfect clear is three stars", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("a3", tong1, 40),
  ]);
  session.pick("a1");
  session.pick("a2");
  session.pick("a3");
  const snap = session.snapshot();
  expect(snap.stars).toBe(3);
  expect(snap.score).toBe(450);
});

test("using undo without shuffle is two stars", () => {
  const session = startWithDeal([
    freeTile("a1", tong1, 0),
    freeTile("a2", tong1, 20),
    freeTile("a3", tong1, 40),
  ]);
  session.pick("a1");
  session.undo();
  session.pick("a1");
  session.pick("a2");
  session.pick("a3");
  expect(session.snapshot().stars).toBe(2);
  expect(session.snapshot().score).toBe(400);
});

test("using shuffle is one star", () => {
  const session = startLevel(1);
  expect(session.shuffle()).toBe(true);
  expect(winByHighestZ(session)).toBe(true);
  expect(session.snapshot().stars).toBe(1);
  expect(session.snapshot().score).toBe(6 * 100 + 3 * 50);
});

test("level 4 deals nine tong faces", () => {
  const tiles = startLevel(4).snapshot().tiles;
  expect(tiles).toHaveLength(27);
  expect(tiles.every((tile) => tile.face.suit === "tong")).toBe(true);
  expect(countsOf(tiles).every(([, count]) => count === 3)).toBe(true);
  expect(countsOf(tiles)).toHaveLength(9);
  expect(winByHighestZ(startLevel(4))).toBe(true);
});

test("level 5 introduces tiao", () => {
  const tiles = startLevel(5).snapshot().tiles;
  expect(tiles).toHaveLength(30);
  expect(countsOf(tiles)).toHaveLength(10);
  expect(countsOf(tiles).every(([, count]) => count === 3)).toBe(true);
  expect(tiles.some((tile) => tile.face.suit === "tiao" && tile.face.rank === 1)).toBe(
    true,
  );
  expect(winByHighestZ(startLevel(5))).toBe(true);
});

test("level 12 deals 18 types and no wan", () => {
  const tiles = startLevel(12).snapshot().tiles;
  expect(tiles).toHaveLength(54);
  expect(countsOf(tiles)).toHaveLength(18);
  expect(countsOf(tiles).every(([, count]) => count === 3)).toBe(true);
  expect(tiles.some((tile) => tile.face.suit === "wan")).toBe(false);
  expect(tiles.filter((tile) => tile.free).length).toBeGreaterThanOrEqual(1);
  expect(winByHighestZ(startLevel(12))).toBe(true);
});
