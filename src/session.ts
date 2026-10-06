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
};

export type Session = {
  pick: (tileId: string) => boolean;
  snapshot: () => Snapshot;
};

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

const LEVEL_ONE_SEED = 20261006;
const TILE_WIDTH = 56;
const TILE_HEIGHT = 74;
const PILE_AREA = { x: 16, y: 64, width: 328, height: 280 };

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
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

function playOrder(rng: () => number): Face[] {
  const ranks = shuffle([1, 2, 3, 4, 5, 6] as Rank[], rng);
  return ranks.flatMap((rank) => [
    { suit: "tong", rank },
    { suit: "tong", rank },
    { suit: "tong", rank },
  ]);
}

function scatterRect(rng: () => number, aroundX: number, aroundY: number): Rect {
  const dist = 16 + rng() * 64;
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

function dealLevelOne(): DealTile[] {
  const rng = mulberry32(LEVEL_ONE_SEED);
  const order = playOrder(rng);
  const count = order.length;
  const tiles: DealTile[] = [];
  let centerX = PILE_AREA.x + PILE_AREA.width / 2 - TILE_WIDTH / 2;
  let centerY = PILE_AREA.y + PILE_AREA.height / 2 - TILE_HEIGHT / 2;

  for (let pickIndex = count - 1; pickIndex >= 0; pickIndex--) {
    const z = count - 1 - pickIndex;
    let rect = scatterRect(rng, centerX, centerY);
    const placedHigh = tiles.filter((tile) => tile.z >= count - 4);
    if (z >= count - 4) {
      let attempts = 0;
      while (
        placedHigh.some((tile) => rectsOverlap(rect, tile.rect)) &&
        attempts < 24
      ) {
        rect = scatterRect(rng, centerX, centerY);
        attempts += 1;
      }
      if (placedHigh.some((tile) => rectsOverlap(rect, tile.rect))) {
        const slot = z - (count - 4);
        const offsets = [
          { x: -48, y: -52 },
          { x: 48, y: -52 },
          { x: -48, y: 52 },
          { x: 48, y: 52 },
        ];
        const originX = PILE_AREA.x + PILE_AREA.width / 2 - TILE_WIDTH / 2;
        const originY = PILE_AREA.y + 36;
        rect = {
          x: clamp(
            originX + offsets[slot].x,
            PILE_AREA.x,
            PILE_AREA.x + PILE_AREA.width - TILE_WIDTH,
          ),
          y: clamp(
            originY + offsets[slot].y,
            PILE_AREA.y,
            PILE_AREA.y + PILE_AREA.height - TILE_HEIGHT,
          ),
          width: TILE_WIDTH,
          height: TILE_HEIGHT,
        };
      }
    }
    tiles.push({
      id: `t${pickIndex}`,
      face: order[pickIndex],
      rect,
      z,
    });
    centerX = tiles.reduce((sum, tile) => sum + tile.rect.x, 0) / tiles.length;
    centerY = tiles.reduce((sum, tile) => sum + tile.rect.y, 0) / tiles.length;
  }

  centerPile(tiles);
  return tiles;
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

export function startLevel(level: number): Session {
  if (level !== 1) {
    throw new Error(`unsupported level ${level}`);
  }
  return startWithDeal(dealLevelOne());
}

export function startWithDeal(deal: readonly DealTile[]): Session {
  const tiles = deal.map((tile) => ({
    ...tile,
    rect: { ...tile.rect },
    face: { ...tile.face },
  }));
  const tray: TrayTile[] = [];
  let status: SessionStatus = "playing";

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
      tiles.splice(index, 1);
      tray.push({ id: candidate.id, face: candidate.face });
      clearMatches(tray);
      if (tiles.length === 0 && tray.length === 0) {
        status = "won";
      } else if (tray.length >= 7) {
        status = "lost";
      }
      return true;
    },
    snapshot() {
      return {
        tiles: tiles.map((tile) => ({
          ...tile,
          rect: { ...tile.rect },
          free: isFree(tile, tiles),
        })),
        tray: tray.map((item) => ({ ...item, face: { ...item.face } })),
        status,
      };
    },
  };
}
