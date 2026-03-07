const canvas = document.getElementById("canvas");
const ambientAudio = document.getElementById("ambient-audio");
const statusOverlay = document.getElementById("status");
const statusTitle = document.getElementById("status-title");
const statusDetail = document.getElementById("status-detail");
const statusProgress = document.getElementById("status-progress");
const statusMeterFill = document.getElementById("status-meter-fill");
const statusProgressLabel = document.getElementById("status-progress-label");
const statusNotice = document.getElementById("status-notice");
const toolbar = document.getElementById("immersive-toolbar");
const rotateGate = document.getElementById("rotate-gate");
const fullscreenToggle = document.getElementById("fullscreen-toggle");
const soundToggle = document.getElementById("sound-toggle");
const rotateLaunch = document.getElementById("rotate-launch");
const GODOT_CONFIG = window.__GODOT_CONFIG;
const THREADS_ENABLED = false;
const TOOLBAR_HIDE_DELAY_MS = 2600;
const LOADING_STEPS = [
  { max: 5, detail: "Preparing the entry sequence." },
  { max: 25, detail: "Streaming world architecture." },
  { max: 50, detail: "Binding sigils and shaders." },
  { max: 75, detail: "Aligning motion and collision." },
  { max: 100, detail: "Opening the temple gates." },
];

let initializing = true;
let statusMode = "";
let toolbarHideTimer = 0;
let audioEnabled = true;

const trackedAudioContexts = new Set();

function focusCanvas() {
  canvas?.focus();
}

function setStatusCopy(title, detail) {
  if (statusTitle) {
    statusTitle.textContent = title;
  }

  if (statusDetail) {
    statusDetail.textContent = detail;
  }
}

function setProgressPercent(percent) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  statusOverlay?.style.setProperty("--status-progress", `${clampedPercent}%`);

  if (statusProgressLabel) {
    statusProgressLabel.textContent = clampedPercent === 0
      ? "SYNC"
      : `${clampedPercent}%`;
  }

  if (statusMeterFill) {
    statusMeterFill.style.width = `${clampedPercent}%`;
  }
}

function getLoadingDetail(percent) {
  return LOADING_STEPS.find((step) => percent <= step.max)?.detail
    ?? LOADING_STEPS[LOADING_STEPS.length - 1].detail;
}

function updateLoadingProgress(current, total) {
  if (current > 0 && total > 0) {
    statusProgress.value = current;
    statusProgress.max = total;
    const percent = Math.round((current / total) * 100);
    setProgressPercent(percent);
    setStatusCopy("Opening the Temple", getLoadingDetail(percent));
    return;
  }

  statusProgress.removeAttribute("value");
  statusProgress.removeAttribute("max");
  setProgressPercent(0);
  setStatusCopy("Opening the Temple", "Preparing the entry sequence.");
}

function installAudioContextTracker(name) {
  const OriginalAudioContext = window[name];

  if (
    typeof OriginalAudioContext !== "function" ||
    OriginalAudioContext.__coreSapianTracked
  ) {
    return;
  }

  class TrackedAudioContext extends OriginalAudioContext {
    constructor(...args) {
      super(...args);
      registerAudioContext(this);
    }
  }

  Object.setPrototypeOf(TrackedAudioContext, OriginalAudioContext);
  TrackedAudioContext.__coreSapianTracked = true;
  window[name] = TrackedAudioContext;
}

function registerAudioContext(context) {
  trackedAudioContexts.add(context);
  context.addEventListener?.("statechange", updateSoundToggle);

  if (!audioEnabled) {
    void suspendAudioContext(context);
  }

  updateSoundToggle();
}

async function resumeAudioContext(context) {
  if (!context || context.state === "closed" || context.state === "running") {
    return;
  }

  try {
    await context.resume();
  } catch (error) {
    console.warn("Audio context resume failed:", error);
  }
}

async function suspendAudioContext(context) {
  if (!context || context.state === "closed" || context.state === "suspended") {
    return;
  }

  try {
    await context.suspend();
  } catch (error) {
    console.warn("Audio context suspend failed:", error);
  }
}

async function playAmbientAudio() {
  if (!ambientAudio || !audioEnabled) {
    return;
  }

  try {
    ambientAudio.volume = 0.45;

    if (ambientAudio.paused) {
      await ambientAudio.play();
    }
  } catch (error) {
    console.warn("Ambient audio start failed:", error);
  }
}

function pauseAmbientAudio() {
  ambientAudio?.pause();
}

function hasRunningAudioContext() {
  return [...trackedAudioContexts].some((context) => context.state === "running");
}

function isSoundActive() {
  return Boolean((ambientAudio && !ambientAudio.paused) || hasRunningAudioContext());
}

function updateSoundToggle() {
  if (!soundToggle) {
    return;
  }

  soundToggle.textContent = !audioEnabled
    ? "Sound Off"
    : isSoundActive()
      ? "Sound On"
      : "Sound";
  soundToggle.setAttribute("aria-pressed", String(audioEnabled));
}

async function attemptUserAudioActivation() {
  if (!audioEnabled) {
    updateSoundToggle();
    return;
  }

  await Promise.allSettled(
    [...trackedAudioContexts].map((context) => resumeAudioContext(context)),
  );
  await playAmbientAudio();
  updateSoundToggle();
}

async function setAudioEnabled(nextEnabled) {
  audioEnabled = nextEnabled;

  if (audioEnabled) {
    await attemptUserAudioActivation();
    return;
  }

  pauseAmbientAudio();
  await Promise.allSettled(
    [...trackedAudioContexts].map((context) => suspendAudioContext(context)),
  );
  updateSoundToggle();
}

async function handleSoundToggle() {
  if (!audioEnabled || !isSoundActive()) {
    await setAudioEnabled(true);
  } else {
    await setAudioEnabled(false);
  }

  showToolbar();
  focusCanvas();
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

function clearToolbarHideTimer() {
  if (toolbarHideTimer !== 0) {
    window.clearTimeout(toolbarHideTimer);
    toolbarHideTimer = 0;
  }
}

function hideToolbar() {
  if (!toolbar) {
    return;
  }

  if (rotateGate && !rotateGate.hidden) {
    scheduleToolbarHide();
    return;
  }

  if (toolbar.matches(":hover") || toolbar.matches(":focus-within")) {
    scheduleToolbarHide();
    return;
  }

  toolbar.classList.add("shell__toolbar--hidden");
}

function scheduleToolbarHide() {
  if (!toolbar) {
    return;
  }

  clearToolbarHideTimer();
  toolbarHideTimer = window.setTimeout(hideToolbar, TOOLBAR_HIDE_DELAY_MS);
}

function showToolbar() {
  if (!toolbar) {
    return;
  }

  toolbar.classList.remove("shell__toolbar--hidden");
  scheduleToolbarHide();
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

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await requestFullscreenLandscape();
    }
  } catch (error) {
    console.warn("Fullscreen toggle failed:", error);
  }

  updateFullscreenToggle();
  showToolbar();
  void attemptUserAudioActivation();
}

function updateFullscreenToggle() {
  if (!fullscreenToggle) {
    return;
  }

  fullscreenToggle.textContent = document.fullscreenElement
    ? "Exit Fullscreen"
    : "Fullscreen";
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

  statusOverlay.dataset.mode = mode;
  statusOverlay.hidden = false;
  statusProgress.hidden = mode !== "progress";
  statusNotice.hidden = mode !== "notice";
  statusMode = mode;
  showToolbar();
}

function setStatusNotice(text) {
  statusNotice.replaceChildren();

  for (const line of String(text).split("\n")) {
    statusNotice.append(document.createTextNode(line), document.createElement("br"));
  }
}

function displayFailureNotice(error) {
  console.error(error);
  setStatusCopy("Launch Interrupted", "The temple could not finish loading.");
  setProgressPercent(0);
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
  setStatusCopy("Opening the Temple", "Preparing the entry sequence.");
  setProgressPercent(0);

  try {
    await engine.startGame({
      onProgress(current, total) {
        updateLoadingProgress(current, total);
      },
    });
    setStatusMode("hidden");
    focusCanvas();
    scheduleToolbarHide();
  } catch (error) {
    displayFailureNotice(error);
  }
}

function handleToolbarActivity() {
  showToolbar();
}

function handlePrimaryInteraction() {
  showToolbar();
  focusCanvas();
  void attemptUserAudioActivation();
}

installAudioContextTracker("AudioContext");

if (window.webkitAudioContext && window.webkitAudioContext !== window.AudioContext) {
  installAudioContextTracker("webkitAudioContext");
}

ambientAudio?.addEventListener("play", updateSoundToggle);
ambientAudio?.addEventListener("pause", updateSoundToggle);
ambientAudio?.addEventListener("ended", updateSoundToggle);

fullscreenToggle?.addEventListener("click", toggleFullscreen);
soundToggle?.addEventListener("click", handleSoundToggle);
rotateLaunch?.addEventListener("click", async () => {
  await requestFullscreenLandscape();
  void attemptUserAudioActivation();
});

canvas?.addEventListener("pointerdown", handlePrimaryInteraction);
canvas?.addEventListener("click", handlePrimaryInteraction);
statusOverlay?.addEventListener("pointerdown", handlePrimaryInteraction);
statusOverlay?.addEventListener("click", handlePrimaryInteraction);

toolbar?.addEventListener("mouseenter", showToolbar);
toolbar?.addEventListener("mouseleave", scheduleToolbarHide);
toolbar?.addEventListener("focusin", showToolbar);
toolbar?.addEventListener("focusout", scheduleToolbarHide);

window.addEventListener("resize", updateOrientationGate);
window.addEventListener("orientationchange", updateOrientationGate);
document.addEventListener("visibilitychange", updateOrientationGate);
document.addEventListener("pointermove", handleToolbarActivity, { passive: true });
document.addEventListener("pointerdown", handleToolbarActivity, { passive: true });
document.addEventListener("touchstart", handleToolbarActivity, { passive: true });
document.addEventListener("keydown", handlePrimaryInteraction);
document.addEventListener("fullscreenchange", updateFullscreenToggle);

updateOrientationGate();
updateFullscreenToggle();
updateSoundToggle();
showToolbar();
startGame();
