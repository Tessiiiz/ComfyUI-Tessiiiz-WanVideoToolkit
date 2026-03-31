import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const GALLERY_NODE_CLASS = "WanPositionedRefGallery";

const NODE_STYLES = {
  [GALLERY_NODE_CLASS]: {
    color: "#2f6f7f",
    bgcolor: "#10242c",
    size: [600, 760],
    kicker: "",
  },
  WanVaceMultiRefToVideo: {
    color: "#28536b",
    bgcolor: "#142a38",
    size: [430, 620],
    kicker: "",
  },
  Wan22VaceMultiRefEncode: {
    color: "#2a5f73",
    bgcolor: "#12303c",
    size: [430, 620],
    kicker: "",
  },
  WanMultiRefStack: {
    color: "#6b4e2e",
    bgcolor: "#2f2114",
    size: [360, 430],
    kicker: "",
  },
  WanVideoFreezeFrames: {
    color: "#61581e",
    bgcolor: "#2b270f",
    size: [340, 240],
    kicker: "",
  },
};

let stylesInjected = false;

function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .wan-ref-gallery {
      --wan-surface: rgba(13, 25, 31, 0.9);
      --wan-surface-2: rgba(18, 35, 43, 0.92);
      --wan-border: rgba(112, 183, 202, 0.28);
      --wan-border-strong: rgba(112, 183, 202, 0.52);
      --wan-text: #f3f7fa;
      --wan-muted: rgba(227, 238, 243, 0.7);
      --wan-accent: #77d2ea;
      --wan-accent-strong: #3ca4c7;
      --wan-accent-soft: rgba(119, 210, 234, 0.18);
      --wan-gold: #f3bf6a;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      height: 100%;
      min-height: 100%;
      color: var(--wan-text);
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      box-sizing: border-box;
      padding: 8px 0 4px;
    }

    .wan-ref-gallery * {
      box-sizing: border-box;
    }

    .wan-ref-gallery__hero {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--wan-border);
      background:
        radial-gradient(circle at top right, rgba(243, 191, 106, 0.18), transparent 38%),
        linear-gradient(180deg, rgba(18, 38, 47, 0.98), rgba(12, 22, 28, 0.98));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    }

    .wan-ref-gallery__eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--wan-accent);
      font-weight: 700;
    }

    .wan-ref-gallery__title {
      font-size: 18px;
      line-height: 1.2;
      font-weight: 700;
    }

    .wan-ref-gallery__subtitle {
      font-size: 12px;
      line-height: 1.5;
      color: var(--wan-muted);
    }

    .wan-ref-gallery__toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .wan-ref-gallery__button {
      appearance: none;
      border: 1px solid var(--wan-border);
      background: linear-gradient(180deg, rgba(39, 89, 104, 0.95), rgba(27, 60, 71, 0.95));
      color: var(--wan-text);
      border-radius: 12px;
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
    }

    .wan-ref-gallery__button:hover {
      transform: translateY(-1px);
      border-color: var(--wan-border-strong);
      background: linear-gradient(180deg, rgba(49, 112, 131, 0.98), rgba(31, 71, 84, 0.98));
    }

    .wan-ref-gallery__button:disabled {
      opacity: 0.45;
      cursor: default;
      transform: none;
    }

    .wan-ref-gallery__button--ghost {
      background: rgba(255,255,255,0.02);
    }

    .wan-ref-gallery__dropzone {
      display: grid;
      gap: 6px;
      justify-items: center;
      text-align: center;
      padding: 18px 14px;
      border-radius: 16px;
      border: 1px dashed var(--wan-border-strong);
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
      transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
    }

    .wan-ref-gallery__dropzone.is-dragover {
      border-color: var(--wan-gold);
      background: linear-gradient(180deg, rgba(243, 191, 106, 0.1), rgba(119, 210, 234, 0.08));
      transform: translateY(-1px);
    }

    .wan-ref-gallery__dropzone-title {
      font-size: 14px;
      font-weight: 700;
    }

    .wan-ref-gallery__dropzone-subtitle {
      font-size: 12px;
      color: var(--wan-muted);
    }

    .wan-ref-gallery__summary {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      border-radius: 16px;
      background: var(--wan-surface);
      border: 1px solid var(--wan-border);
    }

    .wan-ref-gallery__summary-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      font-size: 12px;
    }

    .wan-ref-gallery__count {
      font-weight: 700;
    }

    .wan-ref-gallery__hint {
      color: var(--wan-muted);
    }

    .wan-ref-gallery__positions {
      font-family: "IBM Plex Mono", "Consolas", monospace;
      font-size: 12px;
      border-radius: 12px;
      background: rgba(119, 210, 234, 0.08);
      border: 1px solid rgba(119, 210, 234, 0.18);
      color: #d8f7ff;
      padding: 10px 12px;
      min-height: 38px;
      word-break: break-word;
    }

    .wan-ref-gallery__preview {
      display: grid;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 16px;
      background: var(--wan-surface);
      border: 1px solid var(--wan-border);
    }

    .wan-ref-gallery__preview-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .wan-ref-gallery__preview-shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 190px;
      gap: 12px;
      align-items: stretch;
    }

    .wan-ref-gallery__preview-title {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .wan-ref-gallery__preview-label {
      font-size: 11px;
      color: var(--wan-accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .wan-ref-gallery__preview-name {
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .wan-ref-gallery__preview-chip {
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(119, 210, 234, 0.1);
      border: 1px solid rgba(119, 210, 234, 0.22);
      font-family: "IBM Plex Mono", "Consolas", monospace;
      font-size: 11px;
      color: #d8f7ff;
      white-space: nowrap;
    }

    .wan-ref-gallery__preview-stage {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 250px;
      max-height: 300px;
      padding: 12px;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.06);
      background:
        radial-gradient(circle at top, rgba(119, 210, 234, 0.14), transparent 42%),
        linear-gradient(180deg, rgba(11, 18, 23, 0.95), rgba(14, 25, 31, 0.95));
    }

    .wan-ref-gallery__preview-stage img {
      width: auto;
      height: 100%;
      max-width: 100%;
      object-fit: contain;
      display: block;
    }

    .wan-ref-gallery__preview-side {
      display: grid;
      gap: 10px;
      align-content: stretch;
    }

    .wan-ref-gallery__preview-panel {
      display: grid;
      gap: 6px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
    }

    .wan-ref-gallery__preview-panel-label {
      font-size: 10px;
      color: var(--wan-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .wan-ref-gallery__preview-panel-value {
      font-size: 18px;
      line-height: 1.1;
      font-weight: 700;
      color: var(--wan-text);
    }

    .wan-ref-gallery__preview-panel-copy {
      font-size: 12px;
      color: var(--wan-muted);
      line-height: 1.45;
    }

    .wan-ref-gallery__preview-empty {
      display: grid;
      gap: 6px;
      text-align: center;
      color: var(--wan-muted);
      font-size: 12px;
      padding: 20px;
    }

    .wan-ref-gallery__list {
      display: grid;
      flex: 1 1 auto;
      gap: 10px;
      min-height: 240px;
      max-height: none;
      overflow: auto;
      padding-right: 2px;
    }

    .wan-ref-gallery__empty {
      display: grid;
      gap: 6px;
      justify-items: center;
      text-align: center;
      padding: 22px 14px;
      border-radius: 18px;
      background: var(--wan-surface);
      border: 1px solid var(--wan-border);
      color: var(--wan-muted);
      font-size: 12px;
    }

    .wan-ref-gallery__card {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
      border-radius: 18px;
      background: var(--wan-surface-2);
      border: 1px solid var(--wan-border);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
      cursor: pointer;
      transition: border-color 120ms ease, transform 120ms ease, background 120ms ease;
    }

    .wan-ref-gallery__card:hover {
      border-color: var(--wan-border-strong);
      transform: translateY(-1px);
    }

    .wan-ref-gallery__card.is-selected {
      border-color: rgba(243, 191, 106, 0.5);
      background:
        radial-gradient(circle at top right, rgba(243, 191, 106, 0.08), transparent 35%),
        var(--wan-surface-2);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.04),
        0 0 0 1px rgba(243, 191, 106, 0.18);
    }

    .wan-ref-gallery__thumb {
      width: 72px;
      height: 72px;
      border-radius: 12px;
      overflow: hidden;
      background:
        radial-gradient(circle at top, rgba(119, 210, 234, 0.18), transparent 45%),
        linear-gradient(180deg, rgba(17, 32, 39, 0.95), rgba(11, 18, 23, 0.95));
      border: 1px solid rgba(255,255,255,0.06);
    }

    .wan-ref-gallery__thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .wan-ref-gallery__card-body {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .wan-ref-gallery__card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .wan-ref-gallery__meta {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    .wan-ref-gallery__name {
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .wan-ref-gallery__index {
      font-size: 11px;
      color: var(--wan-muted);
    }

    .wan-ref-gallery__field-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .wan-ref-gallery__field {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .wan-ref-gallery__label {
      font-size: 10px;
      color: var(--wan-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .wan-ref-gallery__input {
      width: 100%;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(8, 15, 19, 0.9);
      color: var(--wan-text);
      padding: 8px 10px;
      font-size: 12px;
      font-family: "IBM Plex Mono", "Consolas", monospace;
      outline: none;
    }

    .wan-ref-gallery__input:focus {
      border-color: var(--wan-gold);
      box-shadow: 0 0 0 1px rgba(243, 191, 106, 0.25);
    }

    .wan-ref-gallery__quickhint {
      font-size: 10px;
      color: var(--wan-muted);
      align-self: center;
      white-space: nowrap;
    }

    .wan-ref-gallery__actions {
      display: grid;
      gap: 6px;
      align-content: center;
      justify-items: end;
    }

    .wan-ref-gallery__frame-chip {
      border-radius: 999px;
      padding: 5px 8px;
      background: rgba(119, 210, 234, 0.1);
      border: 1px solid rgba(119, 210, 234, 0.18);
      font-family: "IBM Plex Mono", "Consolas", monospace;
      font-size: 10px;
      color: #d8f7ff;
      white-space: nowrap;
    }

    .wan-ref-gallery__icon-button {
      appearance: none;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: var(--wan-text);
      border-radius: 10px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .wan-ref-gallery__icon-button:hover {
      border-color: var(--wan-border-strong);
      background: rgba(119, 210, 234, 0.08);
    }

    .wan-ref-gallery__footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      font-size: 11px;
      color: var(--wan-muted);
      padding: 0 2px;
    }

    .wan-ref-gallery__connection {
      font-family: "IBM Plex Mono", "Consolas", monospace;
      color: #d8f7ff;
    }
  `;

  document.head.appendChild(style);
}

function styleNode(node, style) {
  node.color = style.color;
  node.bgcolor = style.bgcolor;
  const currentSize = node.size || [0, 0];
  node.size = [Math.max(currentSize[0], style.size[0]), Math.max(currentSize[1], style.size[1])];
}

function findWidget(node, name) {
  return node.widgets?.find((widget) => widget.name === name);
}

function hideWidget(widget) {
  if (!widget || widget.__wanHidden) return;
  const originalType = widget.type;
  widget.__wanHidden = true;
  widget.origType = widget.origType || originalType;
  widget.hidden = true;
  widget.computeSize = () => [0, -4];
  widget.draw = () => {};
  widget.mouse = () => {};
  widget.type = "converted-widget";
  widget.options = {
    ...(widget.options || {}),
    hidden: true,
  };

  [widget.inputEl, widget.element, widget.inputEl?.parentElement, widget.element?.parentElement].forEach((element) => {
    if (!element?.style) return;
    element.style.display = "none";
    element.style.height = "0";
    element.style.minHeight = "0";
    element.style.maxHeight = "0";
    element.style.opacity = "0";
    element.style.pointerEvents = "none";
  });
}

function parseGalleryState(value) {
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeGalleryItems(items) {
  return items
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: item.id || (globalThis.crypto?.randomUUID?.() ?? `wan-ref-${Date.now()}-${index}-${Math.random()}`),
      name: item.name || item.filename || "",
      subfolder: item.subfolder || "",
      type: item.type || "input",
      label: item.label || item.name || item.filename || `reference_${index + 1}`,
      frame: String(item.frame || "").trim(),
    }))
    .filter((item) => item.name);
}

function serializeGalleryItems(items) {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      subfolder: item.subfolder || "",
      type: item.type || "input",
      label: item.label || item.name,
      frame: String(item.frame || "").trim(),
    })),
  );
}

function getViewUrl(item) {
  const params = new URLSearchParams();
  params.set("filename", item.name);
  params.set("type", item.type || "input");
  if (item.subfolder) {
    params.set("subfolder", item.subfolder);
  }
  const path = `/view?${params.toString()}`;
  if (typeof api.apiURL === "function") {
    return api.apiURL(path);
  }
  return `/api${path}`;
}

function suggestNextFrame(items) {
  const lastAssigned = [...items]
    .reverse()
    .map((item) => String(item.frame || "").trim())
    .find((value) => value);

  if (!lastAssigned) {
    return "20";
  }
  if (lastAssigned.toUpperCase() === "L") {
    return "";
  }

  const numericValue = Number.parseInt(lastAssigned, 10);
  if (!Number.isFinite(numericValue)) {
    return "";
  }
  return String(numericValue + 10);
}

async function uploadImages(files) {
  const uploaded = [];

  for (const file of files) {
    if (!file?.type?.startsWith("image/")) continue;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", "input");

    const response = await api.fetchApi("/upload/image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    uploaded.push({
      id: globalThis.crypto?.randomUUID?.() ?? `wan-ref-${Date.now()}-${Math.random()}`,
      name: data.name || data.filename || file.name,
      subfolder: data.subfolder || "",
      type: data.type || "input",
      label: file.name,
      frame: "",
    });
  }

  return uploaded;
}

function mountPositionedRefGallery(node) {
  if (node.__wanGalleryMounted || typeof node.addDOMWidget !== "function") return;

  const hiddenStateWidget = findWidget(node, "gallery_state");
  const resizeModeWidget = findWidget(node, "resize_mode");
  if (!hiddenStateWidget) return;

  ensureStyles();

  const root = document.createElement("div");
  root.className = "wan-ref-gallery";
  root.addEventListener("pointerdown", (event) => event.stopPropagation());
  root.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });

  const hero = document.createElement("div");
  hero.className = "wan-ref-gallery__hero";
  root.appendChild(hero);

  const eyebrow = document.createElement("div");
  eyebrow.className = "wan-ref-gallery__eyebrow";
  eyebrow.textContent = "Timeline Builder";
  hero.appendChild(eyebrow);

  const title = document.createElement("div");
  title.className = "wan-ref-gallery__title";
  title.textContent = "Drop reference frames and pin each one to a timeline position";
  hero.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "wan-ref-gallery__subtitle";
  subtitle.textContent =
    "Upload as many stills as you need, preview them inside the node, then set each frame as 1, 20, 30 or L for last.";
  hero.appendChild(subtitle);

  const toolbar = document.createElement("div");
  toolbar.className = "wan-ref-gallery__toolbar";
  hero.appendChild(toolbar);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "wan-ref-gallery__button";
  addButton.textContent = "Add Images";
  toolbar.appendChild(addButton);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "wan-ref-gallery__button wan-ref-gallery__button--ghost";
  clearButton.textContent = "Clear All";
  toolbar.appendChild(clearButton);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.multiple = true;
  fileInput.style.display = "none";
  root.appendChild(fileInput);

  const dropzone = document.createElement("div");
  dropzone.className = "wan-ref-gallery__dropzone";
  hero.appendChild(dropzone);

  const dropzoneTitle = document.createElement("div");
  dropzoneTitle.className = "wan-ref-gallery__dropzone-title";
  dropzoneTitle.textContent = "Drag images here";
  dropzone.appendChild(dropzoneTitle);

  const dropzoneSubtitle = document.createElement("div");
  dropzoneSubtitle.className = "wan-ref-gallery__dropzone-subtitle";
  dropzoneSubtitle.textContent = "The node uploads them to ComfyUI input and turns them into positioned refs.";
  dropzone.appendChild(dropzoneSubtitle);

  const summary = document.createElement("div");
  summary.className = "wan-ref-gallery__summary";
  root.appendChild(summary);

  const summaryTop = document.createElement("div");
  summaryTop.className = "wan-ref-gallery__summary-top";
  summary.appendChild(summaryTop);

  const countText = document.createElement("div");
  countText.className = "wan-ref-gallery__count";
  summaryTop.appendChild(countText);

  const hintText = document.createElement("div");
  hintText.className = "wan-ref-gallery__hint";
  hintText.textContent = "Output images -> positioned_frames, output positions -> positions_of_positioned_frames";
  summaryTop.appendChild(hintText);

  const positionsPreview = document.createElement("div");
  positionsPreview.className = "wan-ref-gallery__positions";
  summary.appendChild(positionsPreview);

  const preview = document.createElement("div");
  preview.className = "wan-ref-gallery__preview";
  root.appendChild(preview);

  const previewTop = document.createElement("div");
  previewTop.className = "wan-ref-gallery__preview-top";
  preview.appendChild(previewTop);

  const previewTitle = document.createElement("div");
  previewTitle.className = "wan-ref-gallery__preview-title";
  previewTop.appendChild(previewTitle);

  const previewLabel = document.createElement("div");
  previewLabel.className = "wan-ref-gallery__preview-label";
  previewLabel.textContent = "Selected Preview";
  previewTitle.appendChild(previewLabel);

  const previewName = document.createElement("div");
  previewName.className = "wan-ref-gallery__preview-name";
  previewTitle.appendChild(previewName);

  const previewChip = document.createElement("div");
  previewChip.className = "wan-ref-gallery__preview-chip";
  previewTop.appendChild(previewChip);

  const previewShell = document.createElement("div");
  previewShell.className = "wan-ref-gallery__preview-shell";
  preview.appendChild(previewShell);

  const previewStage = document.createElement("div");
  previewStage.className = "wan-ref-gallery__preview-stage";
  previewShell.appendChild(previewStage);

  const previewSide = document.createElement("div");
  previewSide.className = "wan-ref-gallery__preview-side";
  previewShell.appendChild(previewSide);

  const previewFramePanel = document.createElement("div");
  previewFramePanel.className = "wan-ref-gallery__preview-panel";
  previewSide.appendChild(previewFramePanel);

  const previewFrameLabel = document.createElement("div");
  previewFrameLabel.className = "wan-ref-gallery__preview-panel-label";
  previewFrameLabel.textContent = "Pinned Frame";
  previewFramePanel.appendChild(previewFrameLabel);

  const previewFrameValue = document.createElement("div");
  previewFrameValue.className = "wan-ref-gallery__preview-panel-value";
  previewFramePanel.appendChild(previewFrameValue);

  const previewFrameCopy = document.createElement("div");
  previewFrameCopy.className = "wan-ref-gallery__preview-panel-copy";
  previewFrameCopy.textContent = "This is the exact frame slot the selected reference will lock onto.";
  previewFramePanel.appendChild(previewFrameCopy);

  const previewRefPanel = document.createElement("div");
  previewRefPanel.className = "wan-ref-gallery__preview-panel";
  previewSide.appendChild(previewRefPanel);

  const previewRefLabel = document.createElement("div");
  previewRefLabel.className = "wan-ref-gallery__preview-panel-label";
  previewRefLabel.textContent = "Reference Slot";
  previewRefPanel.appendChild(previewRefLabel);

  const previewRefValue = document.createElement("div");
  previewRefValue.className = "wan-ref-gallery__preview-panel-value";
  previewRefPanel.appendChild(previewRefValue);

  const previewRefCopy = document.createElement("div");
  previewRefCopy.className = "wan-ref-gallery__preview-panel-copy";
  previewRefPanel.appendChild(previewRefCopy);

  const list = document.createElement("div");
  list.className = "wan-ref-gallery__list";
  root.appendChild(list);

  const footer = document.createElement("div");
  footer.className = "wan-ref-gallery__footer";
  footer.innerHTML = `
    <span>Tip: frame values use 1-based positions. Example: <span class="wan-ref-gallery__connection">20 30 50 90 L</span></span>
    <span class="wan-ref-gallery__connection">STRING output is ready for VACE</span>
  `;
  root.appendChild(footer);

  const state = {
    items: [],
    isUploading: false,
    errorMessage: "",
    selectedId: null,
  };

  const syncNodeSize = () => {
    const extraHeight = Math.min(180, state.items.length * 24);
    const desiredHeight = Math.max(760, 620 + extraHeight);
    const desiredWidth = 600;
    node.size = [Math.max(node.size?.[0] ?? 0, desiredWidth), Math.max(node.size?.[1] ?? 0, desiredHeight)];
    node.setDirtyCanvas?.(true, true);
  };

  const saveState = () => {
    hiddenStateWidget.value = serializeGalleryItems(state.items);
    state.errorMessage = "";
    syncNodeSize();
  };

  const loadState = () => {
    state.items = normalizeGalleryItems(parseGalleryState(hiddenStateWidget.value));
    if (!state.items.some((item) => item.id === state.selectedId)) {
      state.selectedId = state.items[0]?.id ?? null;
    }
    render();
    syncNodeSize();
  };

  const setUploading = (isUploading) => {
    state.isUploading = isUploading;
    addButton.disabled = isUploading;
    clearButton.disabled = isUploading || state.items.length === 0;
    dropzoneTitle.textContent = isUploading ? "Uploading images..." : "Drag images here";
  };

  const moveItem = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.items.length) return;
    const [item] = state.items.splice(index, 1);
    state.items.splice(nextIndex, 0, item);
    saveState();
    render();
  };

  const removeItem = (index) => {
    const removedId = state.items[index]?.id;
    state.items.splice(index, 1);
    if (removedId && state.selectedId === removedId) {
      state.selectedId = state.items[Math.max(0, index - 1)]?.id ?? state.items[0]?.id ?? null;
    }
    saveState();
    render();
  };

  const selectItem = (index) => {
    const item = state.items[index];
    if (!item) return;
    state.selectedId = item.id;
    render();
  };

  const updateSummary = () => {
    clearButton.disabled = state.isUploading || state.items.length === 0;

    const assignedItems = state.items.filter((item) => String(item.frame || "").trim());
    const positionsText = assignedItems.map((item) => String(item.frame).trim()).join(" ");
    countText.textContent = `${assignedItems.length} assigned / ${state.items.length} uploaded`;
    positionsPreview.textContent = positionsText || "No frame positions assigned yet.";
  };

  const updatePreview = () => {
    const selectedItem =
      state.items.find((item) => item.id === state.selectedId) ||
      state.items[0] ||
      null;

    previewStage.replaceChildren();

    if (!selectedItem) {
      previewName.textContent = "No reference selected";
      previewChip.textContent = "Frame -";
      previewFrameValue.textContent = "-";
      previewRefValue.textContent = "No refs";
      previewRefCopy.textContent = "Upload images below, then click any card to inspect it here.";

      const emptyPreview = document.createElement("div");
      emptyPreview.className = "wan-ref-gallery__preview-empty";
      emptyPreview.innerHTML = `
        <strong>Your larger preview appears here</strong>
        <span>Click a card below after uploading images to inspect it in detail.</span>
      `;
      previewStage.appendChild(emptyPreview);
      return;
    }

    previewName.textContent = selectedItem.label || selectedItem.name;
    previewChip.textContent = `Frame ${selectedItem.frame || "-"}`;
    previewFrameValue.textContent = selectedItem.frame || "-";
    previewRefValue.textContent = `Ref ${state.items.findIndex((item) => item.id === selectedItem.id) + 1} / ${state.items.length}`;
    previewRefCopy.textContent = "Use the compact cards below to reorder, edit frame values, and swap the selected preview.";

    const previewImage = document.createElement("img");
    previewImage.src = getViewUrl(selectedItem);
    previewImage.alt = selectedItem.label || selectedItem.name;
    previewStage.appendChild(previewImage);
  };

  const render = () => {
    updateSummary();
    updatePreview();

    list.replaceChildren();

    if (!state.items.length) {
      const empty = document.createElement("div");
      empty.className = "wan-ref-gallery__empty";
      empty.innerHTML = `
        <strong>No reference frames yet</strong>
        <span>Drop multiple images, set their frame positions, then connect this node to your Wan VACE node.</span>
      `;
      list.appendChild(empty);
      return;
    }

    state.items.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "wan-ref-gallery__card";
      if (item.id === state.selectedId) {
        card.classList.add("is-selected");
      }
      card.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("button, input, label")) {
          return;
        }
        selectItem(index);
      });

      const thumb = document.createElement("div");
      thumb.className = "wan-ref-gallery__thumb";
      const image = document.createElement("img");
      image.src = getViewUrl(item);
      image.alt = item.label || item.name;
      thumb.appendChild(image);
      card.appendChild(thumb);

      const body = document.createElement("div");
      body.className = "wan-ref-gallery__card-body";
      card.appendChild(body);

      const top = document.createElement("div");
      top.className = "wan-ref-gallery__card-top";
      body.appendChild(top);

      const meta = document.createElement("div");
      meta.className = "wan-ref-gallery__meta";
      top.appendChild(meta);

      const name = document.createElement("div");
      name.className = "wan-ref-gallery__name";
      name.textContent = item.label || item.name;
      meta.appendChild(name);

      const itemIndex = document.createElement("div");
      itemIndex.className = "wan-ref-gallery__index";
      itemIndex.textContent = `Ref ${index + 1}`;
      meta.appendChild(itemIndex);

      const frameChip = document.createElement("div");
      frameChip.className = "wan-ref-gallery__frame-chip";
      frameChip.textContent = item.frame ? `Frame ${item.frame}` : "No frame";
      top.appendChild(frameChip);

      const actions = document.createElement("div");
      actions.className = "wan-ref-gallery__actions";
      card.appendChild(actions);

      const leftButton = document.createElement("button");
      leftButton.type = "button";
      leftButton.className = "wan-ref-gallery__icon-button";
      leftButton.textContent = "Left";
      leftButton.disabled = index === 0;
      leftButton.addEventListener("pointerdown", (event) => event.stopPropagation());
      leftButton.addEventListener("click", (event) => {
        event.stopPropagation();
        moveItem(index, -1);
      });
      actions.appendChild(leftButton);

      const rightButton = document.createElement("button");
      rightButton.type = "button";
      rightButton.className = "wan-ref-gallery__icon-button";
      rightButton.textContent = "Right";
      rightButton.disabled = index === state.items.length - 1;
      rightButton.addEventListener("pointerdown", (event) => event.stopPropagation());
      rightButton.addEventListener("click", (event) => {
        event.stopPropagation();
        moveItem(index, 1);
      });
      actions.appendChild(rightButton);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "wan-ref-gallery__icon-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
      removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        removeItem(index);
      });
      actions.appendChild(removeButton);

      const fieldRow = document.createElement("div");
      fieldRow.className = "wan-ref-gallery__field-row";
      body.appendChild(fieldRow);

      const field = document.createElement("label");
      field.className = "wan-ref-gallery__field";
      fieldRow.appendChild(field);

      const label = document.createElement("span");
      label.className = "wan-ref-gallery__label";
      label.textContent = "Frame Position";
      field.appendChild(label);

      const input = document.createElement("input");
      input.className = "wan-ref-gallery__input";
      input.type = "text";
      input.value = String(item.frame || "");
      input.placeholder = "20 or L";
      input.addEventListener("pointerdown", (event) => event.stopPropagation());
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("input", () => {
        item.frame = input.value.trim().toUpperCase();
        saveState();
        updateSummary();
      });
      field.appendChild(input);

      const quickHint = document.createElement("div");
      quickHint.className = "wan-ref-gallery__quickhint";
      quickHint.textContent = "1 = first, L = last";
      fieldRow.appendChild(quickHint);

      list.appendChild(card);
    });
  };

  const handleFiles = async (fileList) => {
    const files = [...fileList].filter((file) => file?.type?.startsWith("image/"));
    if (!files.length) return;

    try {
      setUploading(true);
      const uploadedItems = await uploadImages(files);
      for (const item of uploadedItems) {
        item.frame = suggestNextFrame(state.items);
        state.items.push(item);
      }
      if (uploadedItems.length) {
        state.selectedId = uploadedItems[uploadedItems.length - 1].id;
      }
      saveState();
      render();
    } catch (error) {
      state.errorMessage = error instanceof Error ? error.message : "Upload failed";
      positionsPreview.textContent = state.errorMessage;
    } finally {
      setUploading(false);
      syncNodeSize();
    }
  };

  addButton.addEventListener("click", () => fileInput.click());
  clearButton.addEventListener("click", () => {
    state.items = [];
    saveState();
    render();
  });

  fileInput.addEventListener("change", async () => {
    await handleFiles(fileInput.files || []);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", async (event) => {
    const files = event.dataTransfer?.files;
    if (files?.length) {
      await handleFiles(files);
    }
  });

  const domWidget = node.addDOMWidget("gallery", "WAN_REF_GALLERY", root, {
    hideOnZoom: false,
    getHeight: () => Math.min(760, Math.max(600, 520 + state.items.length * 32)),
    setValue: (value) => {
      hiddenStateWidget.value = typeof value === "string" ? value : serializeGalleryItems([]);
      loadState();
    },
    getValue: () => hiddenStateWidget.value,
  });
  domWidget.options = {
    ...(domWidget.options || {}),
    serialize: false,
  };

  hideWidget(hiddenStateWidget);
  hideWidget(resizeModeWidget);

  node.__wanGalleryMounted = true;
  node.__wanGallery = {
    widget: domWidget,
    loadState,
  };

  loadState();
  setUploading(false);
}

app.registerExtension({
  name: "ComfyUI.WanVideoToolkit",
  async beforeRegisterNodeDef(nodeType) {
    const style = NODE_STYLES[nodeType.comfyClass];
    if (!style) return;

    const onDrawForeground = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function (ctx) {
      onDrawForeground?.apply(this, arguments);
      if (this.flags?.collapsed) return;
      if (!style.kicker) return;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "600 11px sans-serif";
      ctx.fillText(style.kicker, 14, 34);
      ctx.restore();
    };

    if (nodeType.comfyClass === GALLERY_NODE_CLASS) {
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function () {
        const result = onConfigure?.apply(this, arguments);
        requestAnimationFrame(() => this.__wanGallery?.loadState?.());
        return result;
      };
    }
  },
  async nodeCreated(node) {
    const comfyClass = node.comfyClass || node.constructor?.comfyClass;
    const style = NODE_STYLES[comfyClass];
    if (!style) return;

    styleNode(node, style);

    if (comfyClass === GALLERY_NODE_CLASS) {
      mountPositionedRefGallery(node);
      requestAnimationFrame(() => node.__wanGallery?.loadState?.());
    }
  },
});
