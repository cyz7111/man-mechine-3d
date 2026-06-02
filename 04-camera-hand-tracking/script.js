const root = document.documentElement;
const stage = document.querySelector("#stage");
const video = document.querySelector("#cameraVideo");
const canvas = document.querySelector("#trackingCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const resetButton = document.querySelector("#resetButton");
const pointerToggle = document.querySelector("#pointerToggle");
const statusText = document.querySelector("#statusText");
const xText = document.querySelector("#xText");
const yText = document.querySelector("#yText");
const confidenceText = document.querySelector("#confidenceText");
const modeText = document.querySelector("#modeText");

const state = {
  x: 0,
  y: 0,
  confidence: 0,
  cameraActive: false,
  pointerMode: false,
  animationId: 0,
  stream: null,
  previousFrame: null,
  status: "等待输入",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(current, next, amount) {
  return current + (next - current) * amount;
}

function render() {
  root.style.setProperty("--x", state.x.toFixed(3));
  root.style.setProperty("--y", state.y.toFixed(3));
  root.style.setProperty("--confidence", state.confidence.toFixed(3));

  statusText.textContent = state.status;
  xText.textContent = state.x.toFixed(2);
  yText.textContent = state.y.toFixed(2);
  confidenceText.textContent = `${Math.round(state.confidence * 100)}%`;
  modeText.textContent = state.pointerMode ? "Pointer" : state.cameraActive ? "Camera" : "Idle";
  startButton.disabled = state.cameraActive;
  stopButton.disabled = !state.cameraActive;
}

function setTracking(nextX, nextY, nextConfidence, options = {}) {
  const positionSmoothing = options.positionSmoothing ?? 0.24;
  const confidenceSmoothing = options.confidenceSmoothing ?? 0.18;

  state.x = lerp(state.x, clamp(nextX, -1, 1), positionSmoothing);
  state.y = lerp(state.y, clamp(nextY, -1, 1), positionSmoothing);
  state.confidence = lerp(state.confidence, clamp(nextConfidence, 0, 1), confidenceSmoothing);
  render();
}

function resetTracking() {
  state.x = 0;
  state.y = 0;
  state.confidence = 0;
  state.previousFrame = null;
  state.status = state.cameraActive ? "摄像头已启动" : "等待输入";
  render();
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    state.status = "当前浏览器不支持摄像头";
    render();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    state.stream = stream;
    video.srcObject = stream;
    await video.play();

    state.cameraActive = true;
    state.pointerMode = false;
    pointerToggle.checked = false;
    state.status = "摄像头已启动";
    state.previousFrame = null;
    trackFrame();
    render();
  } catch (error) {
    state.status = `摄像头错误：${error.name}`;
    render();
  }
}

function stopCamera() {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = 0;
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  video.srcObject = null;
  state.cameraActive = false;
  state.previousFrame = null;
  state.status = "摄像头已停止";
  render();
}

function trackFrame() {
  if (!state.cameraActive || state.pointerMode) return;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  const previous = state.previousFrame;

  let totalMotion = 0;
  let weightedX = 0;
  let weightedY = 0;

  if (previous) {
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const index = (y * canvas.width + x) * 4;
        const currentBrightness = data[index] + data[index + 1] + data[index + 2];
        const previousBrightness = previous[index] + previous[index + 1] + previous[index + 2];
        const diff = Math.abs(currentBrightness - previousBrightness);

        if (diff > 48) {
          totalMotion += diff;
          weightedX += x * diff;
          weightedY += y * diff;
        }
      }
    }
  }

  state.previousFrame = new Uint8ClampedArray(data);

  if (totalMotion > 0) {
    const centerX = weightedX / totalMotion;
    const centerY = weightedY / totalMotion;
    const normalizedX = (centerX / canvas.width) * 2 - 1;
    const normalizedY = (centerY / canvas.height) * 2 - 1;
    const confidence = clamp(totalMotion / 520000, 0, 1);

    state.status = confidence > 0.16 ? "追踪到移动" : "等待明显移动";
    setTracking(normalizedX * -1, normalizedY, confidence);
  } else {
    state.confidence = lerp(state.confidence, 0, 0.08);
    state.status = "等待明显移动";
    render();
  }

  state.animationId = requestAnimationFrame(trackFrame);
}

function handlePointerMove(event) {
  if (!state.pointerMode) return;

  const rect = stage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

  state.status = "指针模拟中";
  setTracking(x, y, 1, {
    positionSmoothing: 0.55,
    confidenceSmoothing: 0.7,
  });
}

pointerToggle.addEventListener("change", () => {
  state.pointerMode = pointerToggle.checked;

  if (state.pointerMode) {
    state.status = "指针模拟已开启";
    if (state.cameraActive && state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = 0;
    }
  } else {
    state.status = state.cameraActive ? "摄像头已启动" : "等待输入";
    if (state.cameraActive) {
      state.previousFrame = null;
      trackFrame();
    }
  }

  render();
});

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);
resetButton.addEventListener("click", resetTracking);
stage.addEventListener("pointermove", handlePointerMove);
window.addEventListener("beforeunload", stopCamera);

render();
