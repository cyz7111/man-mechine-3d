const root = document.documentElement;
const stage = document.querySelector("#stage");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const metricX = document.querySelector("#metricX");
const metricY = document.querySelector("#metricY");
const metricRotate = document.querySelector("#metricRotate");
const resetButton = document.querySelector("#resetButton");

const state = {
  active: false,
  x: 0,
  y: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setInteraction(nextX, nextY, active = true) {
  state.active = active;
  state.x = clamp(nextX, -1, 1);
  state.y = clamp(nextY, -1, 1);

  const rotateX = state.y * -18;
  const rotateY = state.x * 24;
  const mouseX = (state.x + 1) * 50;
  const mouseY = (state.y + 1) * 50;

  root.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
  root.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
  root.style.setProperty("--mx", `${mouseX.toFixed(2)}%`);
  root.style.setProperty("--my", `${mouseY.toFixed(2)}%`);

  statusDot.classList.toggle("is-active", state.active);
  statusText.textContent = state.active ? "正在追踪输入" : "等待输入";
  metricX.textContent = state.x.toFixed(2);
  metricY.textContent = state.y.toFixed(2);
  metricRotate.textContent = `${Math.round(Math.hypot(rotateX, rotateY))} deg`;
}

function handlePointerMove(event) {
  const rect = stage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

  setInteraction(x, y);
}

function reset() {
  setInteraction(0, 0, false);
}

stage.addEventListener("pointermove", handlePointerMove);
stage.addEventListener("pointerleave", reset);
resetButton.addEventListener("click", reset);

reset();
