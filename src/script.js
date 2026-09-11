const TAU = Math.PI * 2;
const POINTER_ANGLE = -Math.PI / 2;

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const radius = canvas.width / 2;

const entryForm = document.getElementById("entry-form");
const entryInput = document.getElementById("entry-name");
const entryList = document.getElementById("entry-list");
const spinBtn = document.getElementById("spin-btn");
const resultEl = document.getElementById("result");

const modal = document.getElementById("probability-modal");
const modalCloseBtn = document.getElementById("close-modal");
const weightForm = document.getElementById("weight-form");
const weightFields = document.getElementById("weight-fields");
const modalBody = document.querySelector(".modal-body");
const modalHeader = document.querySelector(".modal-header");

let cfgPopupWindow = null;

let currentRotation = 0;
let isSpinning = false;
let currentSlices = [];

const palette = [
  "#2563eb",
  "#9333ea",
  "#f97316",
  "#14b8a6",
  "#facc15",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#22c55e",
  "#a855f7",
];
let paletteIndex = 0;

const state = {
  entries: [
    { label: "Sky", weight: 0.25, color: nextColor() },
    { label: "River", weight: 0.25, color: nextColor() },
    { label: "Forest", weight: 0.25, color: nextColor() },
    { label: "Comet", weight: 0.25, color: nextColor() },
  ],
  selectedIndex: null,
};

function recalculateWeights() {
  const count = state.entries.length;
  if (count === 0) {
    return;
  }

  const rigIndex =
    state.selectedIndex != null &&
    state.selectedIndex >= 0 &&
    state.selectedIndex < count
      ? state.selectedIndex
      : null;

  if (rigIndex == null) {
    const equalShare = 1 / count;
    state.entries.forEach((entry) => {
      entry.weight = equalShare;
    });
    return;
  }

  // 100% chance for rigged person
  state.entries.forEach((entry, index) => {
    entry.weight = index === rigIndex ? 1.0 : 0;
  });
}

function nextColor() {
  const color = palette[paletteIndex % palette.length];
  paletteIndex += 1;
  return color;
}

function getTotalWeight() {
  return state.entries.reduce((sum, entry) => sum + entry.weight, 0);
}

function addEntry(label) {
  const trimmed = label.trim();
  if (!trimmed) {
    return;
  }

  state.entries.push({
    label: trimmed,
    weight: 0,
    color: nextColor(),
  });
  recalculateWeights();
  updateEntryList();
}

function removeEntry(index) {
  state.entries.splice(index, 1);
  if (state.entries.length === 0) {
    state.selectedIndex = null;
    resultEl.textContent = "";
  } else {
    if (state.selectedIndex === index) {
      state.selectedIndex = null;
    } else if (state.selectedIndex != null && state.selectedIndex > index) {
      state.selectedIndex -= 1;
    }
  }
  recalculateWeights();
  if (state.entries.length === 0) {
    resultEl.textContent = "";
  }
  updateEntryList();
}

function drawWheel() {
  const sliceCount = state.entries.length;
  const totalWeight = getTotalWeight();
  if (sliceCount === 0 || totalWeight <= 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentSlices = [];
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(currentRotation);

  const slices = [];
  let startAngle = POINTER_ANGLE;
  const sliceAngle = TAU / sliceCount;

  state.entries.forEach((entry) => {
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 24, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = entry.color;
    ctx.fill();

    ctx.save();
    const midAngle = startAngle + sliceAngle / 2;
    ctx.rotate(midAngle);
    ctx.translate(radius * 0.55, 0);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = getLabelColor(entry.color);
    ctx.font = "16px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entry.label, 0, 0);
    ctx.restore();

    slices.push({
      start: startAngle,
      end: endAngle,
      mid: midAngle,
    });

    startAngle = endAngle;
  });

  currentSlices = slices;

  drawCenter();
  ctx.restore();
  drawPointer();
}

function drawPointer() {
  ctx.save();
  ctx.translate(radius, radius);
  ctx.beginPath();
  ctx.moveTo(0, -radius + 8);
  ctx.lineTo(-18, -radius - 14);
  ctx.lineTo(18, -radius - 14);
  ctx.closePath();
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.restore();
}

function drawCenter() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, TAU);
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "18px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Spin", 0, -4);
  ctx.restore();
}

function getLabelColor(hex) {
  const rgb = hex.replace("#", "");
  const value = parseInt(rgb, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 160 ? "#0f172a" : "#f8fafc";
}

function updateEntryList() {
  entryList.innerHTML = "";

  state.entries.forEach((entry, index) => {
    const item = document.createElement("li");

    const chip = document.createElement("span");
    chip.className = "entry-chip";

    const dot = document.createElement("span");
    dot.className = "color-dot";
    dot.style.backgroundColor = entry.color;

    const label = document.createElement("span");
    label.textContent = entry.label;

    chip.appendChild(dot);
    chip.appendChild(label);

    const actions = document.createElement("span");
    actions.className = "entry-actions";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeEntry(index));

    actions.appendChild(removeBtn);

    item.appendChild(chip);
    item.appendChild(actions);
    entryList.appendChild(item);
  });

  drawWheel();
  spinBtn.disabled = state.entries.length === 0 || getTotalWeight() <= 0;
}

function pickWeightedIndex() {
  const total = getTotalWeight();
  let threshold = Math.random() * total;
  for (let i = 0; i < state.entries.length; i += 1) {
    threshold -= state.entries[i].weight;
    if (threshold <= 0) {
      return i;
    }
  }
  return state.entries.length - 1;
}

function spinWheel() {
  if (isSpinning || state.entries.length === 0) {
    return;
  }

  const targetIndex = pickWeightedIndex();
  const targetSlice = currentSlices[targetIndex];
  if (!targetSlice) {
    drawWheel();
    return;
  }

  const normalized = ((currentRotation % TAU) + TAU) % TAU;
  let diff = POINTER_ANGLE - (targetSlice.mid + normalized);
  diff = ((diff % TAU) + TAU) % TAU;
  const totalExtra = diff + TAU * 3;
  const targetRotation = currentRotation + totalExtra;

  animateSpin(targetRotation, state.entries[targetIndex]);
}

function animateSpin(targetRotation, winner) {
  isSpinning = true;
  spinBtn.disabled = true;
  const startRotation = currentRotation;
  const delta = targetRotation - currentRotation;
  const duration = 4200;
  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = easeOutCubic(t);
    currentRotation = startRotation + delta * eased;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      currentRotation = targetRotation;
      drawWheel();
      isSpinning = false;
      spinBtn.disabled = false;
      resultEl.textContent = `${winner.label} wins`;
    }
  }

  requestAnimationFrame(frame);
}

function easeOutCubic(x) {
  const inverted = 1 - x;
  return 1 - inverted * inverted * inverted;
}

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEntry(entryInput.value);
  entryInput.value = "";
  entryInput.focus();
});

spinBtn.addEventListener("click", () => {
  spinWheel();
});

function openModal() {
  if (cfgPopupWindow && !cfgPopupWindow.closed) {
    cfgPopupWindow.focus();
    return;
  }

  const entriesData = encodeURIComponent(
    JSON.stringify(state.entries.map((e) => ({ label: e.label })))
  );
  const riggedIndexParam =
    state.selectedIndex != null ? String(state.selectedIndex) : "null";

  const width = 380;
  const height = 500;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);

  cfgPopupWindow = window.open(
    `config.html?entries=${entriesData}&riggedIndex=${riggedIndexParam}`,
    "Settings",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (cfgPopupWindow) {
    cfgPopupWindow.focus();
  }
}

function closeModal() {
  if (cfgPopupWindow && !cfgPopupWindow.closed) {
    cfgPopupWindow.close();
  }
  cfgPopupWindow = null;
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (event.data && event.data.type === "cfgApply") {
    const value = event.data.index;
    state.selectedIndex =
      Number.isInteger(value) && value >= 0 && value < state.entries.length
        ? value
        : null;
    recalculateWeights();
    updateEntryList();
    cfgPopupWindow = null;
  }
});

modal.addEventListener("click", (event) => {
  if (
    event.target instanceof HTMLElement &&
    event.target.dataset.close === "true"
  ) {
    closeModal();
  }
});

modalCloseBtn.addEventListener("click", () => closeModal());

// Keyboard Trigger (Desktop)
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
    event.preventDefault();
    openModal();
  }

  if (event.key === "Escape") {
    closeModal();
  }
});

// Double-Tap Gesture (Mobile)
let lastTap = 0;
document.addEventListener("touchend", (event) => {
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTap;
  if (tapLength < 300 && tapLength > 0) {
    event.preventDefault();
    openModal();
  }
  lastTap = currentTime;
});

recalculateWeights();
updateEntryList();
