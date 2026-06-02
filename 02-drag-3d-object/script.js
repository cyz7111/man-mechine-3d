const root = document.documentElement;
const stage = document.querySelector("#stage");
const object = document.querySelector("#object");
const target = document.querySelector("#target");
const resetButton = document.querySelector("#resetButton");
const stateText = document.querySelector("#stateText");
const positionText = document.querySelector("#positionText");
const distanceText = document.querySelector("#distanceText");
const dragCountText = document.querySelector("#dragCountText");
const timeText = document.querySelector("#timeText");

const state = {
  dragging: false,
  hit: false,
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  pointerStartX: 0,
  pointerStartY: 0,
  dragCount: 0,
  dragStartedAt: 0,
  elapsedMs: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBounds() {
  const stageRect = stage.getBoundingClientRect();
  const objectRect = object.getBoundingClientRect();
  const maxX = (stageRect.width - objectRect.width) / 2;
  const maxY = (stageRect.height - objectRect.height) / 2;

  return { maxX, maxY };
}

function updateHitState() {
  const objectRect = object.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  state.hit =
    objectRect.left >= targetRect.left &&
    objectRect.right <= targetRect.right &&
    objectRect.top >= targetRect.top &&
    objectRect.bottom <= targetRect.bottom;

  target.classList.toggle("is-hit", state.hit);
  object.classList.toggle("is-hit", state.hit);
}

function render(options = {}) {
  root.style.setProperty("--x", `${state.x.toFixed(2)}px`);
  root.style.setProperty("--y", `${state.y.toFixed(2)}px`);
  root.style.setProperty("--tilt-x", `${(-16 - state.y * 0.02).toFixed(2)}deg`);
  root.style.setProperty("--tilt-y", `${(24 + state.x * 0.025).toFixed(2)}deg`);

  if (!options.skipHitCheck) {
    updateHitState();
  }

  const distance = Math.round(Math.hypot(state.x, state.y));
  const elapsed = state.dragging
    ? state.elapsedMs + performance.now() - state.dragStartedAt
    : state.elapsedMs;

  stateText.textContent = state.hit ? "命中目标" : state.dragging ? "正在拖拽" : "等待拖拽";
  positionText.textContent = `${Math.round(state.x)}, ${Math.round(state.y)}`;
  distanceText.textContent = `${distance} px`;
  dragCountText.textContent = String(state.dragCount);
  timeText.textContent = `${(elapsed / 1000).toFixed(2)}s`;
}

function startDrag(event) {
  event.preventDefault();
  state.dragging = true;
  state.dragCount += 1;
  state.startX = state.x;
  state.startY = state.y;
  state.pointerStartX = event.clientX;
  state.pointerStartY = event.clientY;
  state.dragStartedAt = performance.now();

  object.classList.add("is-dragging");
  object.setPointerCapture(event.pointerId);
  render();
}

function moveDrag(event) {
  if (!state.dragging) return;
  event.preventDefault();

  const { maxX, maxY } = getBounds();
  const nextX = state.startX + event.clientX - state.pointerStartX;
  const nextY = state.startY + event.clientY - state.pointerStartY;

  state.x = clamp(nextX, -maxX, maxX);
  state.y = clamp(nextY, -maxY, maxY);
  render();
}

function endDrag(event) {
  if (!state.dragging) return;
  event.preventDefault();

  state.dragging = false;
  state.elapsedMs += performance.now() - state.dragStartedAt;
  state.dragStartedAt = 0;

  object.classList.remove("is-dragging");

  if (event.pointerId !== undefined && object.hasPointerCapture(event.pointerId)) {
    object.releasePointerCapture(event.pointerId);
  }

  render();
}

function reset() {
  state.dragging = false;
  state.hit = false;
  state.x = 0;
  state.y = 0;
  state.startX = 0;
  state.startY = 0;
  state.pointerStartX = 0;
  state.pointerStartY = 0;
  state.dragCount = 0;
  state.dragStartedAt = 0;
  state.elapsedMs = 0;

  object.classList.remove("is-dragging");
  object.classList.remove("is-hit");
  target.classList.remove("is-hit");
  render({ skipHitCheck: true });
}

object.addEventListener("pointerdown", startDrag);
window.addEventListener("pointermove", moveDrag);
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
object.addEventListener("lostpointercapture", endDrag);
resetButton.addEventListener("click", reset);
window.addEventListener("resize", render);

reset();
