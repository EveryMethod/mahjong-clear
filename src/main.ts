import { startLevel, type Session, type TileSnapshot } from "./session";
import { faceName, tileFaceSvg } from "./tile-face";
import "./style.css";

const appElement = document.querySelector("#app");
if (!(appElement instanceof HTMLElement)) {
  throw new Error("missing #app");
}
const app: HTMLElement = appElement;

let session: Session = startLevel(1);

function tilt(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return (hash % 11) - 5;
}

function render(): void {
  const snap = session.snapshot();
  app.replaceChildren();

  const hud = document.createElement("header");
  hud.className = "hud";
  hud.innerHTML = "<h1>三只叠</h1><span class=\"level\">第 1 关</span>";
  app.append(hud);

  const board = document.createElement("div");
  board.className = "board";
  for (const tile of snap.tiles) {
    board.append(renderTile(tile));
  }
  app.append(board);

  const tray = document.createElement("div");
  tray.className = "tray";
  tray.setAttribute("aria-label", "槽");
  for (let index = 0; index < 7; index++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    const held = snap.tray[index];
    if (held) {
      slot.innerHTML = tileFaceSvg(held.face);
    }
    tray.append(slot);
  }
  app.append(tray);

  if (snap.status !== "playing") {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const card = document.createElement("div");
    card.className = "overlay-card";
    const message = document.createElement("p");
    message.textContent = snap.status === "won" ? "过关" : "槽满了";
    const again = document.createElement("button");
    again.type = "button";
    again.textContent = "再来一局";
    again.addEventListener("click", () => {
      session = startLevel(1);
      render();
    });
    card.append(message, again);
    overlay.append(card);
    app.append(overlay);
  }
}

function renderTile(tile: TileSnapshot): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.id = tile.id;
  button.setAttribute("aria-label", faceName(tile.face));
  button.className = tile.free ? "tile is-free" : "tile is-covered";
  button.style.left = `${tile.rect.x}px`;
  button.style.top = `${tile.rect.y}px`;
  button.style.zIndex = String(tile.z);
  button.style.transform = `rotate(${tilt(tile.id)}deg)`;
  button.innerHTML = tileFaceSvg(tile.face);
  button.addEventListener("click", () => {
    const accepted = session.pick(tile.id);
    if (!accepted && session.snapshot().status === "playing") {
      button.classList.remove("is-shake");
      void button.offsetWidth;
      button.classList.add("is-shake");
      return;
    }
    render();
  });
  return button;
}

render();
