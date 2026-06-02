const root = document.documentElement;
const listenButton = document.querySelector("#listenButton");
const stopButton = document.querySelector("#stopButton");
const commandForm = document.querySelector("#commandForm");
const commandInput = document.querySelector("#commandInput");
const statusText = document.querySelector("#statusText");
const commandText = document.querySelector("#commandText");
const colorText = document.querySelector("#colorText");
const scaleText = document.querySelector("#scaleText");
const motionText = document.querySelector("#motionText");
const countText = document.querySelector("#countText");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const colors = {
  blue: {
    label: "Blue",
    color: "#3f7cff",
    glow: "rgba(63, 124, 255, 0.42)",
  },
  green: {
    label: "Green",
    color: "#37c98f",
    glow: "rgba(55, 201, 143, 0.42)",
  },
  red: {
    label: "Red",
    color: "#ff635c",
    glow: "rgba(255, 99, 92, 0.42)",
  },
  yellow: {
    label: "Yellow",
    color: "#ffc44d",
    glow: "rgba(255, 196, 77, 0.42)",
  }
};

const state = {
  color: "blue",
  scale: 1,
  opacity: 1,
  spinning: false,
  listening: false,
  count: 0,
  lastCommand: "-",
  status: "等待命令",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function render() {
  const currentColor = colors[state.color];

  root.style.setProperty("--machine-color", currentColor.color);
  root.style.setProperty("--machine-glow", currentColor.glow);
  root.style.setProperty("--scale", state.scale.toFixed(2));
  root.style.setProperty("--spin-state", state.spinning ? "running" : "paused");
  root.style.setProperty("--opacity", state.opacity.toFixed(2));
  statusText.textContent = state.status;
  commandText.textContent = state.lastCommand;
  colorText.textContent = currentColor.label;
  scaleText.textContent = state.scale.toFixed(2);
  
  motionText.textContent = state.spinning ? "Running" : "Paused";
  countText.textContent = String(state.count);
  listenButton.disabled = state.listening || !recognition;
  stopButton.disabled = !state.listening || !recognition;
}

function setColor(color) {
  state.color = color;
  state.status = `颜色切换为 ${colors[color].label}`;
}

function resetScene() {
  state.color = "blue";
  state.scale = 1;
  state.spinning = false;
  state.status = "已复位";
  state.opacity = 1;
}

function parseCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();

  if (!command) return false;

  state.count += 1;
  state.lastCommand = rawCommand.trim();

  if (command.includes("蓝") || command.includes("blue")) {
    setColor("blue");
  } else if (command.includes("绿") || command.includes("green")) {
    setColor("green");
  } else if (command.includes("红") || command.includes("red")) {
    setColor("red");
  } else if (command.includes("黄") || command.includes("yellow")) {
    setColor("yellow");
  } else if (command.includes("旋转") || command.includes("rotate") || command.includes("run")) {
    state.spinning = true;
    state.status = "开始旋转";
  } else if (command.includes("暂停") || command.includes("停止") || command.includes("pause")) {
    state.spinning = false;
    state.status = "已暂停";
  } else if (command.includes("放大") || command.includes("大") || command.includes("bigger")) {
    state.scale = clamp(state.scale + 0.15, 0.7, 1.6);
    state.status = "已放大";
  } else if (command.includes("缩小") || command.includes("小") || command.includes("smaller")) {
    state.scale = clamp(state.scale - 0.15, 0.7, 1.6);
    state.status = "已缩小";
  } else if (command.includes("隐藏") || command.includes("hide")) {
    state.opacity = 0.28;
    state.status = "已隐藏";
  } else if (command.includes("显示") || command.includes("show")) {
    state.opacity = 1;
    state.status = "已显示";
  } else if (command.includes("复位") || command.includes("reset")) {
    resetScene();
  } else {
    state.status = "未识别命令";
  }

  render();
  return true;
}

function startListening() {
  if (!recognition) {
    state.status = "当前浏览器不支持语音识别";
    render();
    return;
  }

  state.listening = true;
  state.status = "正在听写";
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.start();
  render();
}

function stopListening() {
  if (!recognition) return;

  recognition.stop();
  state.listening = false;
  state.status = "已停止听写";
  render();
}

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    parseCommand(button.dataset.command);
  });
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (parseCommand(commandInput.value)) {
    commandInput.value = "";
  }
});

listenButton.addEventListener("click", startListening);
stopButton.addEventListener("click", stopListening);

if (recognition) {
  recognition.addEventListener("result", (event) => {
    const result = event.results[0][0].transcript;
    parseCommand(result);
  });

  recognition.addEventListener("end", () => {
    state.listening = false;
    if (state.status === "正在听写") {
      state.status = "等待命令";
    }
    render();
  });

  recognition.addEventListener("error", (event) => {
    state.listening = false;
    state.status = `语音错误：${event.error}`;
    render();
  });
} else {
  state.status = "当前浏览器不支持语音识别，可使用按钮或文本命令";
}

render();

