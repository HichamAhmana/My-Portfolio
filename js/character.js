/**
 * PixelCharacter — in-page ambient sprite companion
 * Uses a 6x3 sprite grid from character_spritesheet_final_.png
 */
(function () {
  "use strict";

  const SHEET_COLS = 6;
  const SHEET_ROWS = 3;
  const FRAME_W = 1024 / SHEET_COLS;
  const FRAME_H = 1024 / SHEET_ROWS;
  const SCALE = 0.36;
  const RENDER_W = Math.round(FRAME_W * SCALE);
  const RENDER_H = Math.round(FRAME_H * SCALE);
  const SHEET_W_CSS = 1024 * SCALE;
  const SHEET_H_CSS = 1024 * SCALE;
  const WALK_SPEED = 30;
  const MIN_IDLE = 1.1;
  const MAX_IDLE = 3.2;
  const JUMP_HEIGHT = 34;
  const JUMP_DUR = 720;
  const BASE_GROUND = 22;

  const ANIMATIONS = {
    idle: { start: 0, count: 4, fps: 5 },
    run: { start: 4, count: 6, fps: 9 },
    jump: { start: 10, count: 4, fps: 9 },
    attack: { start: 14, count: 4, fps: 10 },
  };

  let el;
  let floorY = BASE_GROUND;
  let posX = 64;
  let currentY = floorY;
  let direction = 1;
  let state = "idle";
  let frame = 0;
  let localFrame = 0;
  let frameAccum = 0;
  let lastTime = 0;
  let aiTimer = 0;
  let nextDecisionAt = randomBetween(MIN_IDLE, MAX_IDLE);
  let targetX = null;
  let jumping = false;
  let jumpStart = 0;
  let jumpBase = 0;
  let rafId = null;
  let attackQueued = false;
  let clickTargets = [];
  let prefersQuietMode = false;
  let sheetUrl = null;

  async function init() {
    el = document.getElementById("pixel-character");
    if (!el) {
      el = document.createElement("div");
      el.id = "pixel-character";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    }

    prefersQuietMode = !window.location.pathname.toLowerCase().includes("home");
    injectCSS();
    refreshTargets();
    window.addEventListener("resize", refreshTargets);
    window.addEventListener("scroll", refreshTargets, { passive: true });
    window.addEventListener("beforeunload", saveState);

    const savedX = Number.parseFloat(sessionStorage.getItem("char_x") || "");
    const savedDir = Number.parseInt(sessionStorage.getItem("char_dir") || "", 10);
    if (Number.isFinite(savedX)) {
      posX = savedX;
    }
    if (savedDir === -1 || savedDir === 1) {
      direction = savedDir;
    }

    const rawSheetPath = getSheetPath();
    sheetUrl = await buildTransparentSheet(rawSheetPath).catch(() => rawSheetPath);

    applyBaseStyles();
    posX = clamp(posX, 0, Math.max(0, window.innerWidth - RENDER_W));
    currentY = floorY;
    setState("idle");
    rafId = requestAnimationFrame(loop);
  }

  function loop(ts) {
    if (!lastTime) {
      lastTime = ts;
    }
    const delta = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;

    aiTimer += delta;
    if (aiTimer >= nextDecisionAt && !jumping && state !== "attack") {
      aiTimer = 0;
      nextDecisionAt = randomBetween(MIN_IDLE, MAX_IDLE);
      pickNextAction();
    }

    if (state === "run") {
      stepTowardsTarget(delta);
    }

    if (jumping) {
      const t = (ts - jumpStart) / JUMP_DUR;
      if (t >= 1) {
        jumping = false;
        currentY = jumpBase;
        if (attackQueued) {
          triggerAttack();
          attackQueued = false;
        } else if (state === "jump") {
          setState("idle");
        }
      } else {
        currentY = jumpBase + Math.sin(t * Math.PI) * JUMP_HEIGHT;
      }
    }

    advanceFrame(delta);
    render();
    rafId = requestAnimationFrame(loop);
  }

  function stepTowardsTarget(delta) {
    const viewportMax = Math.max(0, window.innerWidth - RENDER_W);
    if (targetX == null) {
      targetX = direction > 0 ? viewportMax : 0;
    }
    const dx = targetX - posX;
    const reached = Math.abs(dx) < 4;
    if (reached) {
      setState("idle");
      targetX = null;
      maybeActionAtTarget();
      return;
    }

    direction = dx >= 0 ? 1 : -1;
    posX += Math.sign(dx) * WALK_SPEED * delta;
    posX = clamp(posX, 0, viewportMax);
  }

  function maybeActionAtTarget() {
    const target = getClosestTarget();
    if (!target) {
      return;
    }
    const near = Math.abs(target.center - (posX + RENDER_W * 0.5)) < 50;
    if (!near || jumping || state === "attack") {
      return;
    }

    if (target.kind === "hero" || target.kind === "button") {
      triggerJump(true);
      return;
    }

    if (target.kind === "nav" && Math.random() < 0.4) {
      triggerAttack();
    }
  }

  function pickNextAction() {
    const target = pickTarget();
    const roll = Math.random();
    if (target && roll < 0.7) {
      targetX = clamp(target.center - RENDER_W * 0.5, 0, Math.max(0, window.innerWidth - RENDER_W));
      setState("run");
      return;
    }

    if (!prefersQuietMode && roll < 0.83) {
      triggerJump(false);
      return;
    }

    if (!prefersQuietMode && roll < 0.9) {
      triggerAttack();
      return;
    }

    direction = -direction;
    setState("idle");
  }

  function triggerJump(queueAttack) {
    if (jumping) {
      return;
    }
    jumping = true;
    jumpStart = performance.now();
    jumpBase = floorY;
    attackQueued = Boolean(queueAttack && Math.random() < 0.45);
    setState("jump");
  }

  function triggerAttack() {
    if (state === "attack") {
      return;
    }
    setState("attack");
  }

  function advanceFrame(delta) {
    const anim = ANIMATIONS[state];
    const frameDuration = 1000 / anim.fps;
    frameAccum += delta * 1000;
    while (frameAccum >= frameDuration) {
      frameAccum -= frameDuration;
      const prevFrame = localFrame;
      localFrame = (localFrame + 1) % anim.count;
      if (state === "attack" && prevFrame === anim.count - 1) {
        setState("idle");
      }
    }
    frame = anim.start + localFrame;
  }

  function render() {
    const col = frame % SHEET_COLS;
    const row = Math.floor(frame / SHEET_COLS);
    const bpX = -(col * FRAME_W * SCALE);
    const bpY = -(row * FRAME_H * SCALE);
    const drawY = Math.max(8, Math.round(window.innerHeight - currentY - RENDER_H));

    el.style.left = `${Math.round(posX)}px`;
    el.style.top = `${drawY}px`;
    el.style.backgroundPosition = `${bpX}px ${bpY}px`;
    el.style.transform = direction < 0 ? "scaleX(-1)" : "scaleX(1)";
  }

  function setState(newState) {
    if (state === newState) {
      return;
    }
    state = newState;
    localFrame = 0;
    frameAccum = 0;
  }

  function refreshTargets() {
    const selectors = [
      { sel: ".hero-name", kind: "hero" },
      { sel: ".hero-tagline", kind: "hero" },
      { sel: ".hero-actions .btn", kind: "button" },
      { sel: ".nav-links a", kind: "nav" },
      { sel: ".card .btn", kind: "button" },
    ];

    const updated = [];
    selectors.forEach((entry) => {
      document.querySelectorAll(entry.sel).forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width < 20 || rect.height < 10) {
          return;
        }
        const center = rect.left + rect.width * 0.5;
        const isWithinPlayableArea = rect.top < window.innerHeight * 0.7;
        if (!isWithinPlayableArea) {
          return;
        }
        updated.push({ center, kind: entry.kind });
      });
    });
    clickTargets = updated;
  }

  function pickTarget() {
    if (!clickTargets.length) {
      return null;
    }
    return clickTargets[Math.floor(Math.random() * clickTargets.length)];
  }

  function getClosestTarget() {
    if (!clickTargets.length) {
      return null;
    }
    const current = posX + RENDER_W * 0.5;
    let best = clickTargets[0];
    let bestDist = Math.abs(best.center - current);
    for (let i = 1; i < clickTargets.length; i += 1) {
      const dist = Math.abs(clickTargets[i].center - current);
      if (dist < bestDist) {
        best = clickTargets[i];
        bestDist = dist;
      }
    }
    return best;
  }

  function saveState() {
    sessionStorage.setItem("char_x", String(posX));
    sessionStorage.setItem("char_dir", String(direction));
  }

  function applyBaseStyles() {
    Object.assign(el.style, {
      position: "fixed",
      left: `${posX}px`,
      top: "0px",
      width: `${RENDER_W}px`,
      height: `${RENDER_H}px`,
      backgroundImage: `url('${sheetUrl}')`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${SHEET_W_CSS}px ${SHEET_H_CSS}px`,
      imageRendering: "pixelated",
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "1",
      opacity: "0.88",
      filter: "saturate(0.68) brightness(0.88) contrast(0.96) sepia(0.18) hue-rotate(-8deg) drop-shadow(0 2px 3px rgba(0,0,0,0.28))",
      willChange: "left, top, transform, background-position",
    });
  }

  function getSheetPath() {
    const scripts = document.querySelectorAll('script[src*="character.js"]');
    if (scripts.length) {
      const scriptSrc = scripts[scripts.length - 1].src;
      const base = scriptSrc.replace(/js\/character\.js.*/, "");
      return `${base}images/character_spritesheet_final_.png`;
    }
    return "../images/character_spritesheet_final_.png";
  }

  async function buildTransparentSheet(src) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const bg = sampleBgColor(data, canvas.width, canvas.height);
    const tolerance = 34;

    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - bg.r;
      const dg = data[i + 1] - bg.g;
      const db = data[i + 2] - bg.b;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance <= tolerance) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  }

  function sampleBgColor(data, width, height) {
    const samplePoints = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
      [Math.floor(width * 0.5), 2],
      [2, Math.floor(height * 0.5)],
    ];

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    samplePoints.forEach(([x, y]) => {
      const idx = (y * width + x) * 4;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
    });

    const count = samplePoints.length;
    return {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count),
    };
  }

  function injectCSS() {
    const style = document.createElement("style");
    style.textContent = `
      #pixel-character {
        transition: filter 180ms ease;
      }
      .btn:hover,
      .nav-links a:hover {
        position: relative;
      }
      .hero-name,
      .hero-actions .btn,
      .nav-links a {
        --char-focus: 1;
      }
    `;
    document.head.appendChild(style);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init();
    });
  } else {
    init();
  }
})();
