export type Suit = "tong" | "tiao" | "wan";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Face = {
  suit: Suit;
  rank: Rank;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DealTile = {
  id: string;
  face: Face;
  rect: Rect;
  z: number;
};

export type TrayTile = {
  id: string;
  face: Face;
};

export type SessionStatus = "playing" | "won" | "lost";

export type TileSnapshot = DealTile & {
  free: boolean;
};

export type Snapshot = {
  tiles: TileSnapshot[];
  tray: TrayTile[];
  status: SessionStatus;
  undosLeft: number;
  shufflesLeft: number;
  canUndo: boolean;
  stars: 1 | 2 | 3 | null;
  score: number | null;
};

export type Session = {
  pick: (tileId: string) => boolean;
  undo: () => boolean;
  shuffle: () => boolean;
  restart: () => void;
  snapshot: () => Snapshot;
};

export const LEVEL_COUNT = 12;

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function isFree(tile: DealTile, others: readonly DealTile[]): boolean {
  return !others.some(
    (other) =>
      other.id !== tile.id && other.z > tile.z && rectsOverlap(tile.rect, other.rect),
  );
}

function sameFace(a: Face, b: Face): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function clearMatches(tray: TrayTile[]): void {
  for (const item of [...tray]) {
    const matches = tray.filter((other) => sameFace(other.face, item.face));
    if (matches.length < 3) {
      continue;
    }
    let remaining = 3;
    for (let i = tray.length - 1; i >= 0 && remaining > 0; i--) {
      if (sameFace(tray[i].face, item.face)) {
        tray.splice(i, 1);
        remaining -= 1;
      }
    }
  }
}

const TILE_WIDTH = 56;
const TILE_HEIGHT = 74;
const PILE_AREA = { x: 16, y: 64, width: 328, height: 280 };
const LEVEL_ONE_SEED = 20261006;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleList<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seedFor(level: number): number {
  return LEVEL_ONE_SEED + (level - 1) * 7919;
}

function typeCount(level: number): number {
  return level === 12 ? 18 : 5 + level;
}

function minFreeFor(level: number): number {
  return level === 1 ? 4 : 1;
}

function scatterSpan(level: number): number {
  return 64 - (level - 1) * 3;
}

function typesForLevel(level: number): Face[] {
  const count = typeCount(level);
  const types: Face[] = [];
  for (let index = 0; index < count; index++) {
    if (index < 9) {
      types.push({ suit: "tong", rank: (index + 1) as Rank });
    } else {
      types.push({ suit: "tiao", rank: (index - 8) as Rank });
    }
  }
  return types;
}

function playOrder(types: readonly Face[], rng: () => number): Face[] {
  return shuffleList(types, rng).flatMap((face) => [face, face, face]);
}

function scatterRect(
  rng: () => number,
  aroundX: number,
  aroundY: number,
  span: number,
): Rect {
  const dist = 16 + rng() * span;
  const angle = rng() * Math.PI * 2;
  return {
    x: clamp(
      aroundX + Math.cos(angle) * dist,
      PILE_AREA.x,
      PILE_AREA.x + PILE_AREA.width - TILE_WIDTH,
    ),
    y: clamp(
      aroundY + Math.sin(angle) * dist,
      PILE_AREA.y,
      PILE_AREA.y + PILE_AREA.height - TILE_HEIGHT,
    ),
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
  };
}

function centerPile(tiles: DealTile[]): void {
  const minX = Math.min(...tiles.map((tile) => tile.rect.x));
  const maxX = Math.max(...tiles.map((tile) => tile.rect.x + tile.rect.width));
  const minY = Math.min(...tiles.map((tile) => tile.rect.y));
  const maxY = Math.max(...tiles.map((tile) => tile.rect.y + tile.rect.height));
  const shiftX = clamp(
    PILE_AREA.x + PILE_AREA.width / 2 - (minX + maxX) / 2,
    PILE_AREA.x - minX,
    PILE_AREA.x + PILE_AREA.width - maxX,
  );
  const shiftY = clamp(
    PILE_AREA.y + PILE_AREA.height / 2 - (minY + maxY) / 2,
    PILE_AREA.y - minY,
    PILE_AREA.y + PILE_AREA.height - maxY,
  );
  for (const tile of tiles) {
    tile.rect.x += shiftX;
    tile.rect.y += shiftY;
  }
}

function layoutPile(
  order: readonly { id: string; face: Face }[],
  rng: () => number,
  minFree: number,
  span: number,
): DealTile[] {
  const count = order.length;
  const tiles: DealTile[] = [];
  let centerX = PILE_AREA.x + PILE_AREA.width / 2 - TILE_WIDTH / 2;
  let centerY = PILE_AREA.y + PILE_AREA.height / 2 - TILE_HEIGHT / 2;
  const topCount = Math.min(minFree, count);

  for (let pickIndex = count - 1; pickIndex >= 0; pickIndex--) {
    const z = count - 1 - pickIndex;
    let rect = scatterRect(rng, centerX, centerY, span);
    const placedHigh = tiles.filter((tile) => tile.z >= count - topCount);
    if (z >= count - topCount) {
      let attempts = 0;
      while (
        placedHigh.some((tile) => rectsOverlap(rect, tile.rect)) &&
        attempts < 24
      ) {
        rect = scatterRect(rng, centerX, centerY, span);
        attempts += 1;
      }
      if (placedHigh.some((tile) => rectsOverlap(rect, tile.rect))) {
        const slot = z - (count - topCount);
        const col = slot % 2 === 0 ? -52 : 52;
        const row = Math.floor(slot / 2);
        const originX = PILE_AREA.x + PILE_AREA.width / 2 - TILE_WIDTH / 2;
        const originY = PILE_AREA.y + 28;
        rect = {
          x: clamp(
            originX + col,
            PILE_AREA.x,
            PILE_AREA.x + PILE_AREA.width - TILE_WIDTH,
          ),
          y: clamp(
            originY + row * 80,
            PILE_AREA.y,
            PILE_AREA.y + PILE_AREA.height - TILE_HEIGHT,
          ),
          width: TILE_WIDTH,
          height: TILE_HEIGHT,
        };
      }
    }
    tiles.push({
      id: order[pickIndex].id,
      face: order[pickIndex].face,
      rect,
      z,
    });
    centerX = tiles.reduce((sum, tile) => sum + tile.rect.x, 0) / tiles.length;
    centerY = tiles.reduce((sum, tile) => sum + tile.rect.y, 0) / tiles.length;
  }

  centerPile(tiles);
  return tiles;
}

function dealLevel(level: number): DealTile[] {
  const rng = mulberry32(seedFor(level));
  const order = playOrder(typesForLevel(level), rng).map((face, index) => ({
    id: `t${index}`,
    face,
  }));
  return layoutPile(order, rng, minFreeFor(level), scatterSpan(level));
}

function cloneDeal(tiles: readonly DealTile[]): DealTile[] {
  return tiles.map((tile) => ({
    ...tile,
    rect: { ...tile.rect },
    face: { ...tile.face },
  }));
}

function cloneTray(tray: readonly TrayTile[]): TrayTile[] {
  return tray.map((item) => ({ ...item, face: { ...item.face } }));
}

function sequenceWithTray(
  board: readonly DealTile[],
  tray: readonly TrayTile[],
): DealTile[] {
  const bag = [...board];
  const simulated = cloneTray(tray);
  const order: DealTile[] = [];

  const countOf = (face: Face) =>
    simulated.filter((item) => sameFace(item.face, face)).length;

  const wouldFill = (face: Face) => {
    const next = cloneTray(simulated);
    next.push({ id: "preview", face });
    clearMatches(next);
    return next.length >= 7;
  };

  while (bag.length > 0) {
    let index = bag.findIndex((tile) => countOf(tile.face) === 2);
    if (index < 0) {
      index = bag.findIndex((tile) => countOf(tile.face) === 1);
    }
    if (index < 0) {
      index = bag.findIndex((tile) => !wouldFill(tile.face));
    }
    if (index < 0) {
      index = 0;
    }
    const [chosen] = bag.splice(index, 1);
    order.push(chosen);
    simulated.push({ id: chosen.id, face: chosen.face });
    clearMatches(simulated);
  }
  return order;
}

function relayoutRemaining(
  board: readonly DealTile[],
  tray: readonly TrayTile[],
  seed: number,
): DealTile[] {
  const rng = mulberry32(seed);
  const order = sequenceWithTray(board, tray).map((tile) => ({
    id: tile.id,
    face: tile.face,
  }));
  return layoutPile(order, rng, 1, 40);
}

type HistoryFrame = {
  tiles: DealTile[];
  tray: TrayTile[];
  status: SessionStatus;
  matches: number;
};

export function startLevel(level: number): Session {
  if (level < 1 || level > LEVEL_COUNT) {
    throw new Error(`unsupported level ${level}`);
  }
  return startWithDeal(dealLevel(level), { seed: seedFor(level) });
}

export function startWithDeal(
  deal: readonly DealTile[],
  options: { seed?: number } = {},
): Session {
  const original = cloneDeal(deal);
  const seed = options.seed ?? 1;
  let tiles = cloneDeal(original);
  let tray: TrayTile[] = [];
  let status: SessionStatus = "playing";
  let undosLeft = 3;
  let shufflesLeft = 1;
  let undoUsed = false;
  let shuffleUsed = false;
  let matches = 0;
  const history: HistoryFrame[] = [];

  function capture(): HistoryFrame {
    return {
      tiles: cloneDeal(tiles),
      tray: cloneTray(tray),
      status,
      matches,
    };
  }

  function restore(frame: HistoryFrame): void {
    tiles = cloneDeal(frame.tiles);
    tray = cloneTray(frame.tray);
    status = frame.status;
    matches = frame.matches;
  }

  function grade(): { stars: 1 | 2 | 3; score: number } | null {
    if (status !== "won") {
      return null;
    }
    const stars: 1 | 2 | 3 = shuffleUsed ? 1 : undoUsed ? 2 : 3;
    const score = matches * 100 + undosLeft * 50 + (shuffleUsed ? 0 : 200);
    return { stars, score };
  }

  return {
    pick(tileId) {
      if (status !== "playing") {
        return false;
      }
      const index = tiles.findIndex((tile) => tile.id === tileId);
      if (index === -1) {
        return false;
      }
      const candidate = tiles[index];
      if (!isFree(candidate, tiles)) {
        return false;
      }
      history.push(capture());
      tiles.splice(index, 1);
      tray.push({ id: candidate.id, face: candidate.face });
      const before = tray.length;
      clearMatches(tray);
      if (tray.length < before) {
        matches += 1;
      }
      if (tiles.length === 0 && tray.length === 0) {
        status = "won";
      } else if (tray.length >= 7) {
        status = "lost";
      }
      return true;
    },
    undo() {
      if (undosLeft <= 0 || history.length === 0 || status === "won") {
        return false;
      }
      const frame = history.pop();
      if (!frame) {
        return false;
      }
      restore(frame);
      undosLeft -= 1;
      undoUsed = true;
      return true;
    },
    shuffle() {
      if (shufflesLeft <= 0 || tiles.length === 0 || status !== "playing") {
        return false;
      }
      tiles = relayoutRemaining(tiles, tray, seed + 17_411 + tiles.length);
      shufflesLeft -= 1;
      shuffleUsed = true;
      return true;
    },
    restart() {
      tiles = cloneDeal(original);
      tray = [];
      status = "playing";
      undosLeft = 3;
      shufflesLeft = 1;
      undoUsed = false;
      shuffleUsed = false;
      matches = 0;
      history.length = 0;
    },
    snapshot() {
      const result = grade();
      return {
        tiles: tiles.map((tile) => ({
          ...tile,
          rect: { ...tile.rect },
          free: isFree(tile, tiles),
        })),
        tray: cloneTray(tray),
        status,
        undosLeft,
        shufflesLeft,
        canUndo: undosLeft > 0 && history.length > 0 && status !== "won",
        stars: result?.stars ?? null,
        score: result?.score ?? null,
      };
    },
  };
}
