import type { DealTile, Rank } from "./session";

const TILE_WIDTH = 56;
const TILE_HEIGHT = 74;
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6];

export const levelOneDeal: DealTile[] = RANKS.flatMap((rank, index) => [
  {
    id: `z0-${rank}`,
    face: { suit: "tong", rank },
    rect: { x: 16 + index * 48, y: 210, width: TILE_WIDTH, height: TILE_HEIGHT },
    z: 0,
  },
  {
    id: `z1-${rank}`,
    face: { suit: "tong", rank },
    rect: { x: 32 + index * 48, y: 155, width: TILE_WIDTH, height: TILE_HEIGHT },
    z: 1,
  },
  {
    id: `z2-${rank}`,
    face: { suit: "tong", rank },
    rect: { x: 48 + index * 48, y: 100, width: TILE_WIDTH, height: TILE_HEIGHT },
    z: 2,
  },
]);
