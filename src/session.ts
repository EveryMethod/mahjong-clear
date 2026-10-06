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
