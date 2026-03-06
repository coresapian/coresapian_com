const canvas = document.getElementById("canvas");
const statusOverlay = document.getElementById("status");
const statusProgress = document.getElementById("status-progress");
const statusNotice = document.getElementById("status-notice");
const rotateGate = document.getElementById("rotate-gate");
const fullscreenLaunch = document.getElementById("fullscreen-launch");
const rotateLaunch = document.getElementById("rotate-launch");
const GODOT_CONFIG = window.__GODOT_CONFIG;
const THREADS_ENABLED = false;

let initializing = true;
let statusMode = "";

function focusCanvas() {
  canvas?.focus();
}

function isHandheldDevice() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const userAgentDataMobile = navigator.userAgentData?.mobile === true;

  const isIPhone = /\biPhone\b/i.test(ua);
  const isIPod = /\biPod\b/i.test(ua);
  const isIPad = /\biPad\b/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  const isAndroidHandheld = /\bAndroid\b/i.test(ua) && (/\bMobile\b/i.test(ua) || hasCoarsePointer);

  return userAgentDataMobile || isIPhone || isIPod || isIPad || isAndroidHandheld;
}

function isLandscape() {
  return window.innerWidth >= window.innerHeight;
}

function updateOrientationGate() {
  const shouldBlock = isHandheldDevice() && !isLandscape();
  rotateGate.hidden = !shouldBlock;
  document.body.classList.toggle("orientation-blocked", shouldBlock);
}

async function requestFullscreenLandscape() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.warn("Fullscreen request failed:", error);
  }

  try {
    if (isHandheldDevice() && screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (error) {
    console.warn("Orientation lock failed:", error);
  }

  focusCanvas();
}

function setStatusMode(mode) {
  if (statusMode === mode || !initializing) {
    return;
  }

  if (mode === "hidden") {
    statusOverlay.hidden = true;
    initializing = false;
    return;
  }

  statusOverlay.hidden = false;
  statusProgress.hidden = mode !== "progress";
  statusNotice.hidden = mode !== "notice";
  statusMode = mode;
}

function setStatusNotice(text) {
  statusNotice.replaceChildren();

  for (const line of String(text).split("\n")) {
    statusNotice.append(document.createTextNode(line), document.createElement("br"));
  }
}

function displayFailureNotice(error) {
  console.error(error);
  if (error instanceof Error) {
    setStatusNotice(error.message);
  } else if (typeof error === "string") {
    setStatusNotice(error);
  } else {
    setStatusNotice("An unknown error occurred.");
  }
  setStatusMode("notice");
  initializing = false;
}

async function startGame() {
  if (!GODOT_CONFIG) {
    displayFailureNotice("Missing Godot web configuration.");
    return;
  }

  const missing = Engine.getMissingFeatures({ threads: THREADS_ENABLED });
  if (missing.length !== 0) {
    const message = "Error\nThe following features required to run Godot projects on the Web are missing:\n";
    displayFailureNotice(message + missing.join("\n"));
    return;
  }

  const engine = new Engine(GODOT_CONFIG);
  setStatusMode("progress");

  try {
    await engine.startGame({
      onProgress(current, total) {
        if (current > 0 && total > 0) {
          statusProgress.value = current;
          statusProgress.max = total;
        } else {
          statusProgress.removeAttribute("value");
          statusProgress.removeAttribute("max");
        }
      },
    });
    setStatusMode("hidden");
    focusCanvas();
  } catch (error) {
    displayFailureNotice(error);
  }
}

fullscreenLaunch.addEventListener("click", requestFullscreenLandscape);
rotateLaunch.addEventListener("click", requestFullscreenLandscape);
canvas?.addEventListener("pointerdown", focusCanvas);
canvas?.addEventListener("click", focusCanvas);

window.addEventListener("resize", updateOrientationGate);
window.addEventListener("orientationchange", updateOrientationGate);
document.addEventListener("visibilitychange", updateOrientationGate);

updateOrientationGate();
startGame();
