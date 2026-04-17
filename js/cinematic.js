/**
 * cinematic.js
 * Handles the boot sequence (Act 1 & 2) and BSOD (Act 3).
 * On reboot, redirects to home.html via sessionStorage so
 * the cinematic only plays once per browser session.
 */

document.addEventListener("DOMContentLoaded", () => {

  // Skip cinematic if already seen this session
  if (sessionStorage.getItem("cinematicSeen")) {
    window.location.replace("home.html");
    return;
  }

  // DOM refs
  const progressBar  = document.getElementById("progressBar");
  const terminalLogs = document.getElementById("terminalLogs");
  const flashLayer   = document.getElementById("flashLayer");
  const act1         = document.getElementById("act1");
  const act3         = document.getElementById("act3");
  const actReboot    = document.getElementById("act-reboot");
  const bsodPercent  = document.getElementById("bsodPercent");
  const rebootBtn    = document.getElementById("rebootBtn");

  // Boot log lines
  const logs = [
    "[OK] Initializing Hicham.exe...",
    "[OK] Loading frontend skills... done",
    "[OK] Compiling 3 years of caffeine and commits...",
    "[OK] Mounting projects... done",
    "[OK] Linking creativity modules...",
    "[WARN] Skill level dangerously high...",
    "[ERR] Portfolio too impressive to load."
  ];

  // Inject blinking cursor
  terminalLogs.innerHTML = '<span id="termCursor" class="cursor"></span>';
  const termCursor = document.getElementById("termCursor");

  // Utility: promise-based delay
  const delay = ms => new Promise(res => setTimeout(res, ms));

  // Append a log line before the cursor
  const appendLog = async (text, ms) => {
    await delay(ms);
    const div = document.createElement("div");
    div.textContent = text;
    terminalLogs.insertBefore(div, termCursor);
  };

  // ── ACT 1: BOOT ────────────────────────────────────────
  const startCinematic = async () => {
    // Animate progress bar to 99%
    progressBar.style.transition = "width 4.0s cubic-bezier(0.1, 0.7, 1.0, 0.1)";
    progressBar.style.width = "99%";

    await appendLog(logs[0], 400);
    await appendLog(logs[1], 550);
    await appendLog(logs[2], 750);
    await appendLog(logs[3], 650);
    await appendLog(logs[4], 500);
    await appendLog(logs[5], 650);
    await appendLog(logs[6], 450);

    // ── ACT 2: FREEZE ──────────────────────────────────────
    await delay(2000);

    const fatalMsg = "FATAL ERROR: PORTFOLIO_OVERFLOW_EXCEPTION";
    const errorDiv = document.createElement("div");
    errorDiv.style.marginTop = "10px";
    errorDiv.style.color = "var(--c-red)";
    terminalLogs.insertBefore(errorDiv, termCursor);

    // Typewriter effect for fatal message
    for (let i = 0; i < fatalMsg.length; i++) {
      errorDiv.textContent += fatalMsg[i];
      await delay(40);
    }

    await delay(800);
    triggerBSOD();
  };

  // ── ACT 3: BSOD ────────────────────────────────────────
  const triggerBSOD = () => {
    flashLayer.classList.add("active");

    setTimeout(() => {
      act1.classList.remove("active");
      act3.classList.add("active");
      flashLayer.classList.remove("active");
      runBSODPercent();
    }, 150);
  };

  // Count up 0 → 100% with random steps
  const runBSODPercent = async () => {
    let i = 0;
    while (i < 100) {
      i = Math.min(i + Math.floor(Math.random() * 12) + 6, 100);
      bsodPercent.textContent = i;
      await delay(Math.random() * 150 + 80);
    }
    bsodPercent.textContent = 100;
  };

  // ── ACT 3.5: REBOOT → REDIRECT ─────────────────────────
  rebootBtn.addEventListener("click", async () => {
    // Glitch flicker
    act3.classList.add("glitch-anim");

    for (let i = 0; i < 3; i++) {
      act3.style.visibility = "hidden";
      await delay(50);
      act3.style.visibility = "visible";
      await delay(50);
    }

    // Audio instance for the soul shatter effect
    const shatterSound = new Audio("audio/undertale-soul-shatter.mp3");
    shatterSound.play().catch(e => console.log("Audio playback failed:", e));

    // Show reboot loader
    act3.classList.remove("active");
    actReboot.classList.add("active");

    // Wait, then navigate to portfolio
    await delay(2500);

    // Mark cinematic as seen so it won't replay
    sessionStorage.setItem("cinematicSeen", "true");

    window.location.href = "home.html";
  });

  // Kick it off
  startCinematic();
});
