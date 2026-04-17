/**
 * Ambient code tunnel background for home hero only.
 * Optimized for smoothness on mid-range devices.
 */
(function () {
  "use strict";

  function initAmbientBackground() {
    const hero = document.querySelector(".hero");
    if (!hero) {
      return;
    }

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmallScreen = window.matchMedia("(max-width: 900px)").matches;

    const canvas = document.createElement("canvas");
    canvas.className = "ambient-code-bg";
    canvas.setAttribute("aria-hidden", "true");
    hero.prepend(canvas);

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) {
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const palette = [
      styles.getPropertyValue("--c-red").trim() || "#E84A5F",
      styles.getPropertyValue("--c-light-red").trim() || "#FF847C",
      styles.getPropertyValue("--c-green").trim() || "#99B898",
      styles.getPropertyValue("--c-peach").trim() || "#FECEA8",
    ];
    const colorCache = palette.map((hex) => hexToRgb(hex));

    const snippets = [
      "const app = {}",
      "function render()",
      "return component",
      "if (online) deploy()",
      "await fetch('/api')",
      "useEffect(() => {})",
      "git commit -m 'ship'",
      "docker build .",
      "SELECT * FROM projects",
      "npm run dev",
      "class Developer {}",
      "while (learning) grow++",
    ];

    const particles = [];
    const particleCount = prefersReduced ? 22 : (isSmallScreen ? 34 : 52);
    let w = 0;
    let h = 0;
    let dpr = 1;
    let rafId = null;
    let lastTs = 0;
    let frameMod = 0;
    let raysCanvas = null;

    function resize() {
      const rect = hero.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(1.5, window.devicePixelRatio || 1);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      raysCanvas = document.createElement("canvas");
      raysCanvas.width = canvas.width;
      raysCanvas.height = canvas.height;
      const raysCtx = raysCanvas.getContext("2d");
      if (raysCtx) {
        raysCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRays(raysCtx, w, h);
      }
    }

    function drawRays(targetCtx, width, height) {
      const centerX = width * 0.5;
      const centerY = height * 0.45;
      targetCtx.clearRect(0, 0, width, height);
      for (let i = 0; i < 12; i += 1) {
        const x = (i / 11) * width;
        targetCtx.strokeStyle = "rgba(254,206,168,0.028)";
        targetCtx.beginPath();
        targetCtx.moveTo(centerX, centerY);
        targetCtx.lineTo(x, height);
        targetCtx.stroke();
      }
    }

    function randomParticle() {
      const color = colorCache[Math.floor(Math.random() * colorCache.length)];
      return {
        lane: Math.floor(Math.random() * 11) - 5,
        y: (Math.random() - 0.5) * h * 0.7,
        z: Math.random() * 1.1 + 0.08,
        speed: prefersReduced ? 0.08 + Math.random() * 0.1 : 0.12 + Math.random() * 0.2,
        text: snippets[Math.floor(Math.random() * snippets.length)],
        color,
      };
    }

    function resetParticle(p) {
      const next = randomParticle();
      p.lane = next.lane;
      p.y = next.y;
      p.z = 0.08;
      p.speed = next.speed;
      p.text = next.text;
      p.color = next.color;
    }

    function bootstrap() {
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) {
        particles.push(randomParticle());
      }
    }

    function draw(ts) {
      if (!lastTs) {
        lastTs = ts;
      }
      const delta = Math.min(0.033, (ts - lastTs) / 1000);
      lastTs = ts;

      ctx.clearRect(0, 0, w, h);
      if (raysCanvas) {
        ctx.drawImage(raysCanvas, 0, 0, w, h);
      }

      const centerX = w * 0.5;
      const centerY = h * 0.45;
      const focal = Math.min(w, h) * 0.85;
      frameMod = (frameMod + 1) % 2;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.z += p.speed * delta;
        if (p.z > 1.5) {
          resetParticle(p);
        }

        // Skip half particle draws each frame on mobile-like load.
        if (isSmallScreen && frameMod && i % 2 === 0) {
          continue;
        }

        const perspective = focal / (focal - p.z * focal * 0.78);
        const x = centerX + p.lane * 56 * perspective;
        const y = centerY + p.y * perspective;
        const fontSize = Math.max(8, Math.min(17, 8 + p.z * 9));
        const alpha = Math.max(0.06, Math.min(0.26, 0.06 + p.z * 0.16));

        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
        ctx.fillText(p.text, x, y);
      }

      rafId = requestAnimationFrame(draw);
    }

    function hexToRgb(hex) {
      const clean = hex.replace("#", "");
      const short = clean.length === 3;
      return {
        r: parseInt(short ? clean[0] + clean[0] : clean.slice(0, 2), 16),
        g: parseInt(short ? clean[1] + clean[1] : clean.slice(2, 4), 16),
        b: parseInt(short ? clean[2] + clean[2] : clean.slice(4, 6), 16),
      };
    }

    function onVisibilityChange() {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
        return;
      }
      if (!document.hidden && !rafId && !prefersReduced) {
        lastTs = 0;
        rafId = requestAnimationFrame(draw);
      }
    }

    resize();
    bootstrap();

    if (prefersReduced) {
      // Single frame fallback for accessibility/performance.
      draw(performance.now());
    } else {
      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAmbientBackground);
  } else {
    initAmbientBackground();
  }
})();
