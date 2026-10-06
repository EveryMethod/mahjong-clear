import { playClick, playFail, playMatch, unlockAudio } from "./audio";
import {
  loadProgress,
  recordWin,
  saveProgress,
  totalScore,
  type Progress,
} from "./save";
import {
  LEVEL_COUNT,
  startLevel,
  type Session,
  type TileSnapshot,
} from "./session";
import { faceName, tileFaceSvg } from "./tile-face";
import "./style.css";

const appElement = document.querySelector("#app");
if (!(appElement instanceof HTMLElement)) {
  throw new Error("missing #app");
}
const app: HTMLElement = appElement;

type Screen = "select" | "play" | "ending";

let progress: Progress = loadProgress();
let screen: Screen = "select";
let level = 1;
let session: Session = startLevel(1);
let showTutorial = false;

function tilt(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return (hash % 11) - 5;
}

function persist(): void {
  saveProgress(progress);
}

function openLevel(nextLevel: number): void {
  level = nextLevel;
  session = startLevel(nextLevel);
  screen = "play";
  showTutorial = nextLevel === 1 && !progress.seenTutorial;
  render();
}

function dismissTutorial(): void {
  showTutorial = false;
  progress = { ...progress, seenTutorial: true };
  persist();
  render();
}

function starText(count: number): string {
  if (count <= 0) {
    return "";
  }
  return "★".repeat(count);
}

function render(): void {
  app.replaceChildren();
  if (screen === "select") {
    renderSelect();
    return;
  }
  if (screen === "ending") {
    renderEnding();
    return;
  }
  renderPlay();
}

function renderSelect(): void {
  const header = document.createElement("header");
  header.className = "hud";
  header.innerHTML = `<h1>三只叠</h1><span class="level">总分 ${totalScore(progress)}</span>`;
  app.append(header);

  const grid = document.createElement("div");
  grid.className = "select-grid";
  for (let number = 1; number <= LEVEL_COUNT; number++) {
    const unlocked = number <= progress.unlocked;
    const button = document.createElement("button");
    button.type = "button";
    button.className = unlocked ? "level-card" : "level-card is-locked";
    button.disabled = !unlocked;
    const stars = progress.bestStars[number - 1];
    button.innerHTML = `<strong>${number}</strong><span>${starText(stars)}</span>`;
    if (unlocked) {
      button.addEventListener("click", () => openLevel(number));
    }
    grid.append(button);
  }
  app.append(grid);
}

function renderEnding(): void {
  const card = document.createElement("div");
  card.className = "overlay-card ending-card";
  card.innerHTML = `<p>通关</p><span>总分 ${totalScore(progress)}</span>`;
  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "返回选关";
  back.addEventListener("click", () => {
    screen = "select";
    render();
  });
  card.append(back);
  const wrap = document.createElement("div");
  wrap.className = "ending";
  wrap.append(card);
  app.append(wrap);
}

function renderPlay(): void {
  const snap = session.snapshot();

  const hud = document.createElement("header");
  hud.className = "hud play-hud";
  const title = document.createElement("button");
  title.type = "button";
  title.className = "title-btn";
  title.textContent = "三只叠";
  title.addEventListener("click", () => {
    screen = "select";
    render();
  });
  const meta = document.createElement("span");
  meta.className = "level";
  meta.textContent = `第 ${level} 关`;
  hud.append(title, meta);
  app.append(hud);

  const tools = document.createElement("div");
  tools.className = "tools";
  tools.append(
    toolButton("撤回", snap.undosLeft, () => {
      if (session.undo()) {
        render();
      }
    }, !snap.canUndo),
    toolButton("洗牌", snap.shufflesLeft, () => {
      if (session.shuffle()) {
        render();
      }
    }, snap.shufflesLeft === 0 || snap.tiles.length === 0 || snap.status !== "playing"),
    toolButton("重开", null, () => {
      session.restart();
      render();
    }, false),
    muteButton(),
  );
  app.append(tools);

  const board = document.createElement("div");
  board.className = "board";
  for (const tile of snap.tiles) {
    board.append(renderTile(tile, snap.status === "playing"));
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

  if (showTutorial) {
    app.append(tutorialOverlay());
  } else if (snap.status !== "playing") {
    app.append(resultOverlay(snap.status, snap.stars, snap.score));
  }
}

function toolButton(
  label: string,
  count: number | null,
  onClick: () => void,
  disabled: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tool";
  button.textContent = count === null ? label : `${label} ${count}`;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function muteButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tool";
  button.textContent = progress.muted ? "声音关" : "声音开";
  button.addEventListener("click", () => {
    progress = { ...progress, muted: !progress.muted };
    persist();
    render();
  });
  return button;
}

function tutorialOverlay(): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const card = document.createElement("div");
  card.className = "overlay-card tutorial-card";
  card.innerHTML =
    "<p>怎么玩</p><ul><li>只能点完全露出的牌</li><li>槽里三张相同会消</li><li>槽满失败</li></ul>";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "开始";
  close.addEventListener("click", dismissTutorial);
  card.append(close);
  overlay.append(card);
  return overlay;
}

function resultOverlay(
  status: "won" | "lost",
  stars: 1 | 2 | 3 | null,
  score: number | null,
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const card = document.createElement("div");
  card.className = "overlay-card";
  const message = document.createElement("p");
  message.textContent = status === "won" ? "过关" : "槽满了";
  card.append(message);
  if (status === "won" && stars !== null && score !== null) {
    const detail = document.createElement("div");
    detail.className = "result-detail";
    detail.textContent = `${starText(stars)}  ${score} 分`;
    card.append(detail);
  }
  const actions = document.createElement("div");
  actions.className = "overlay-actions";
  if (status === "lost") {
    actions.append(
      actionButton("重开", () => {
        session.restart();
        render();
      }),
    );
  } else if (level < LEVEL_COUNT) {
    actions.append(
      actionButton("下一关", () => {
        openLevel(level + 1);
      }),
    );
  } else {
    actions.append(
      actionButton("结束页", () => {
        screen = "ending";
        render();
      }),
    );
  }
  actions.append(
    actionButton("返回选关", () => {
      screen = "select";
      render();
    }),
  );
  card.append(actions);
  overlay.append(card);
  return overlay;
}

function actionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderTile(tile: TileSnapshot, playing: boolean): HTMLButtonElement {
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
    if (!playing) {
      return;
    }
    unlockAudio();
    const before = session.snapshot();
    const accepted = session.pick(tile.id);
    const after = session.snapshot();
    if (!accepted) {
      button.classList.remove("is-shake");
      void button.offsetWidth;
      button.classList.add("is-shake");
      return;
    }
    if (after.status === "lost") {
      playFail(progress.muted);
    } else if (after.tray.length < before.tray.length) {
      playMatch(progress.muted);
    } else {
      playClick(progress.muted);
    }
    if (after.status === "won" && after.stars !== null && after.score !== null) {
      progress = recordWin(progress, level, after.stars, after.score);
      persist();
    }
    render();
  });
  return button;
}

app.addEventListener(
  "pointerdown",
  () => {
    unlockAudio();
  },
  { once: true },
);

render();
