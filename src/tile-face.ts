import type { Face } from "./session";

const RANK_NAMES = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
const SUIT_NAMES = { tong: "筒", tiao: "条", wan: "万" } as const;

export function faceName(face: Face): string {
  return `${RANK_NAMES[face.rank - 1]}${SUIT_NAMES[face.suit]}`;
}

type Dot = { cx: number; cy: number; r: number };

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
    default:
      return [];
  }
}

function circleSvg(dot: Dot, fill: string): string {
  return `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${fill}" stroke="#0a3d2c" stroke-width="1"/>
    <circle cx="${dot.cx}" cy="${dot.cy}" r="${Math.max(2, dot.r * 0.38)}" fill="#f4fff8" opacity="0.35"/>`;
}

export function tileFaceSvg(face: Face): string {
  const fill = face.rank === 5 ? "#b42318" : "#1c7a52";
  const dots = tongDots(face.rank)
    .map((dot) => circleSvg(dot, fill))
    .join("");

  return `<svg viewBox="0 0 56 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1" y="1" width="54" height="72" rx="7" fill="#fbf6ea" stroke="#c9b48a" stroke-width="1.5"/>
    <rect x="4.5" y="4.5" width="47" height="65" rx="4" fill="none" stroke="#ead9b3" stroke-width="1"/>
    ${dots}
  </svg>`;
}
