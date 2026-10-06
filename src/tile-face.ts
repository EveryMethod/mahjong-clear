import type { Face } from "./session";

const RANK_NAMES = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
const SUIT_NAMES = { tong: "筒", tiao: "条", wan: "万" } as const;

export function faceName(face: Face): string {
  return `${RANK_NAMES[face.rank - 1]}${SUIT_NAMES[face.suit]}`;
}

type Dot = { cx: number; cy: number; r: number };
type Stick = { x: number; y: number };

function tongDots(rank: Face["rank"]): Dot[] {
  switch (rank) {
    case 1:
      return [{ cx: 28, cy: 37, r: 12 }];
    case 2:
      return [
        { cx: 28, cy: 24, r: 8 },
        { cx: 28, cy: 50, r: 8 },
      ];
    case 3:
      return [
        { cx: 28, cy: 20, r: 7 },
        { cx: 28, cy: 37, r: 7 },
        { cx: 28, cy: 54, r: 7 },
      ];
    case 4:
      return [
        { cx: 18, cy: 26, r: 7 },
        { cx: 38, cy: 26, r: 7 },
        { cx: 18, cy: 48, r: 7 },
        { cx: 38, cy: 48, r: 7 },
      ];
    case 5:
      return [
        { cx: 18, cy: 24, r: 6.5 },
        { cx: 38, cy: 24, r: 6.5 },
        { cx: 28, cy: 37, r: 6.5 },
        { cx: 18, cy: 50, r: 6.5 },
        { cx: 38, cy: 50, r: 6.5 },
      ];
    case 6:
      return [
        { cx: 18, cy: 20, r: 6 },
        { cx: 38, cy: 20, r: 6 },
        { cx: 18, cy: 37, r: 6 },
        { cx: 38, cy: 37, r: 6 },
        { cx: 18, cy: 54, r: 6 },
        { cx: 38, cy: 54, r: 6 },
      ];
    case 7:
      return [
        { cx: 18, cy: 18, r: 5.5 },
        { cx: 38, cy: 18, r: 5.5 },
        { cx: 18, cy: 37, r: 5.5 },
        { cx: 28, cy: 37, r: 5.5 },
        { cx: 38, cy: 37, r: 5.5 },
        { cx: 18, cy: 56, r: 5.5 },
        { cx: 38, cy: 56, r: 5.5 },
      ];
    case 8:
      return [
        { cx: 18, cy: 16, r: 5 },
        { cx: 38, cy: 16, r: 5 },
        { cx: 18, cy: 30, r: 5 },
        { cx: 38, cy: 30, r: 5 },
        { cx: 18, cy: 44, r: 5 },
        { cx: 38, cy: 44, r: 5 },
        { cx: 18, cy: 58, r: 5 },
        { cx: 38, cy: 58, r: 5 },
      ];
    case 9:
      return [
        { cx: 16, cy: 18, r: 5 },
        { cx: 28, cy: 18, r: 5 },
        { cx: 40, cy: 18, r: 5 },
        { cx: 16, cy: 37, r: 5 },
        { cx: 28, cy: 37, r: 5 },
        { cx: 40, cy: 37, r: 5 },
        { cx: 16, cy: 56, r: 5 },
        { cx: 28, cy: 56, r: 5 },
        { cx: 40, cy: 56, r: 5 },
      ];
  }
}

function tiaoSticks(rank: Face["rank"]): Stick[] {
  const cols = rank <= 3 ? 1 : rank <= 6 ? 2 : 3;
  const rows = Math.ceil(rank / cols);
  const sticks: Stick[] = [];
  let placed = 0;
  for (let row = 0; row < rows && placed < rank; row++) {
    const inRow = Math.min(cols, rank - placed);
    for (let col = 0; col < inRow; col++) {
      const x = 28 - ((inRow - 1) * 10) / 2 + col * 10;
      const y = 16 + row * (48 / Math.max(rows, 1));
      sticks.push({ x, y });
      placed += 1;
    }
  }
  return sticks;
}

function circleSvg(dot: Dot, fill: string): string {
  return `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${fill}" stroke="#0a3d2c" stroke-width="1"/>
    <circle cx="${dot.cx}" cy="${dot.cy}" r="${Math.max(2, dot.r * 0.38)}" fill="#f4fff8" opacity="0.35"/>`;
}

function stickSvg(stick: Stick): string {
  return `<rect x="${stick.x - 3.2}" y="${stick.y}" width="6.4" height="18" rx="3"
      fill="#2f8a45" stroke="#1b5c2c" stroke-width="0.8"/>
    <line x1="${stick.x - 1.6}" y1="${stick.y + 5}" x2="${stick.x + 1.6}" y2="${stick.y + 5}"
      stroke="#d7f5de" stroke-width="1" opacity="0.7"/>`;
}

function faceArt(face: Face): string {
  if (face.suit === "tiao") {
    return tiaoSticks(face.rank).map(stickSvg).join("");
  }
  const fill = face.rank === 5 ? "#b42318" : "#1c7a52";
  return tongDots(face.rank)
    .map((dot) => circleSvg(dot, fill))
    .join("");
}

export function tileFaceSvg(face: Face): string {
  return `<svg viewBox="0 0 56 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1" y="1" width="54" height="72" rx="7" fill="#fbf6ea" stroke="#c9b48a" stroke-width="1.5"/>
    <rect x="4.5" y="4.5" width="47" height="65" rx="4" fill="none" stroke="#ead9b3" stroke-width="1"/>
    ${faceArt(face)}
  </svg>`;
}
