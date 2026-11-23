/* =========================================================
   GAMESHOW LED STAGE SCRIPT - /ledout
   Pure Gameshow Display with Ultra Smooth Score Shift FX
   ========================================================= */

// DOM Elements
const podium1 = document.getElementById('podium1');
const podium2 = document.getElementById('podium2');
const jodi1Photo = document.getElementById('jodi1Photo');
const jodi1Placeholder = document.getElementById('jodi1Placeholder');
const jodi1Name = document.getElementById('jodi1Name');
const jodi1Score = document.getElementById('jodi1Score');
const scorePodium1 = document.getElementById('scorePodium1');
const deltaBadge1 = document.getElementById('deltaBadge1');

const jodi2Photo = document.getElementById('jodi2Photo');
const jodi2Placeholder = document.getElementById('jodi2Placeholder');
const jodi2Name = document.getElementById('jodi2Name');
const jodi2Score = document.getElementById('jodi2Score');
const scorePodium2 = document.getElementById('scorePodium2');
const deltaBadge2 = document.getElementById('deltaBadge2');

const transferOrb = document.getElementById('transferOrb');
const orbText = document.getElementById('orbText');
const audioUnlock = document.getElementById('audioUnlock');
const bgVideo = document.getElementById('bgVideo');

// Canvas FX
const canvas = document.getElementById('fxCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animFrameId = null;
let currentJodi1Score = 50;
let currentJodi2Score = 50;

// Resize canvas to full window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Ensure video keeps playing
document.addEventListener('DOMContentLoaded', () => {
  if (bgVideo) {
    bgVideo.play().catch(() => {
      // autoplay policy handled
    });
  }
});

// ---------------------------------------------------------
// SYNTHESIZED WEB AUDIO ENGINE (Broadcast Quality FX)
// ---------------------------------------------------------
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function unlockAudio() {
  initAudio();
  if (audioUnlock) {
    audioUnlock.classList.add('hide');
    setTimeout(() => {
      audioUnlock.style.display = 'none';
    }, 500);
  }
}
window.addEventListener('click', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

function playChargeSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.5);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.52);
  } catch (e) {}
}

function playFlySound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.6);
    osc.frequency.linearRampToValueAtTime(750, now + 1.2);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.4);
    gain.gain.linearRampToValueAtTime(0.15, now + 1.0);
    gain.gain.linearRampToValueAtTime(0.01, now + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.25);
  } catch (e) {}
}

function playImpactSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    // Sub bass drop
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.6);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.75);

    // Chime sparkle
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major
    chord.forEach((freq, idx) => {
      const chime = audioCtx.createOscillator();
      const chimeGain = audioCtx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq, now + 0.05 + idx * 0.04);
      chimeGain.gain.setValueAtTime(0.18, now + 0.05 + idx * 0.04);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + idx * 0.05);
      chime.connect(chimeGain);
      chimeGain.connect(audioCtx.destination);
      chime.start(now + 0.05 + idx * 0.04);
      chime.stop(now + 0.85 + idx * 0.05);
    });
  } catch (e) {}
}

function playTickSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 + Math.random() * 200, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {}
}

// ---------------------------------------------------------
// CANVAS PARTICLE SYSTEM
// ---------------------------------------------------------
class Particle {
  constructor(x, y, vx, vy, color, size, decay, gravity = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.alpha = 1;
    this.decay = decay;
    this.gravity = gravity;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.alpha -= this.decay;
    this.size *= 0.98;
  }
  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(1, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function spawnExplosion(x, y, count = 60, colorSet = ['#FFD700', '#FF9100', '#FFFFFF', '#00FF88']) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 9 + 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const color = colorSet[Math.floor(Math.random() * colorSet.length)];
    const size = Math.random() * 5 + 3;
    const decay = Math.random() * 0.02 + 0.015;
    particles.push(new Particle(x, y, vx, vy, color, size, decay, 0.15));
  }
}

function spawnTrail(x, y) {
  for (let i = 0; i < 4; i++) {
    const vx = (Math.random() - 0.5) * 4;
    const vy = (Math.random() - 0.5) * 4;
    const colors = ['#FFF6D5', '#FFD700', '#FFA500', '#00E5FF'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(x, y, vx, vy, color, Math.random() * 5 + 2, 0.04));
  }
}

function particleLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
  requestAnimationFrame(particleLoop);
}
particleLoop();

// ---------------------------------------------------------
// UI UPDATE LOGIC
// ---------------------------------------------------------
function updateUI(state) {
  if (!state) return;

  // Jodi 1
  if (state.jodi1) {
    jodi1Name.textContent = state.jodi1.name || "JODI 1";
    if (state.jodi1.photo && state.jodi1.photo.trim() !== "") {
      jodi1Photo.src = state.jodi1.photo;
      jodi1Photo.style.display = 'block';
      jodi1Placeholder.style.display = 'none';
    } else {
      jodi1Photo.style.display = 'none';
      jodi1Placeholder.style.display = 'flex';
    }
    currentJodi1Score = Number(state.jodi1.score) || 0;
    jodi1Score.textContent = currentJodi1Score;
  }

  // Jodi 2
  if (state.jodi2) {
    jodi2Name.textContent = state.jodi2.name || "JODI 2";
    if (state.jodi2.photo && state.jodi2.photo.trim() !== "") {
      jodi2Photo.src = state.jodi2.photo;
      jodi2Photo.style.display = 'block';
      jodi2Placeholder.style.display = 'none';
    } else {
      jodi2Photo.style.display = 'none';
      jodi2Placeholder.style.display = 'flex';
    }
    currentJodi2Score = Number(state.jodi2.score) || 0;
    jodi2Score.textContent = currentJodi2Score;
  }

  // Reflect permanent + and - score badges
  if (!isShiftAnimating) {
    if (state.lastTransfer && state.lastTransfer.amount) {
      const isReceiverJ1 = state.lastTransfer.receiver === 'jodi1';
      const amt = state.lastTransfer.amount;

      if (isReceiverJ1) {
        deltaBadge1.textContent = `+${amt}`;
        deltaBadge1.className = 'score-delta-badge plus visible';
        deltaBadge2.textContent = `-${amt}`;
        deltaBadge2.className = 'score-delta-badge minus visible';
      } else {
        deltaBadge2.textContent = `+${amt}`;
        deltaBadge2.className = 'score-delta-badge plus visible';
        deltaBadge1.textContent = `-${amt}`;
        deltaBadge1.className = 'score-delta-badge minus visible';
      }
    } else {
      deltaBadge1.className = 'score-delta-badge';
      deltaBadge1.textContent = '';
      deltaBadge2.className = 'score-delta-badge';
      deltaBadge2.textContent = '';
    }
  }
}

// ---------------------------------------------------------
// SMOOTH NUMBER COUNTER ROLL
// ---------------------------------------------------------
function rollScore(element, startScore, endScore, duration = 1200) {
  const diff = endScore - startScore;
  if (diff === 0) return;

  const startTime = performance.now();
  let lastVal = startScore;

  function updateNumber(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Smooth ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(startScore + diff * ease);

    if (currentVal !== lastVal) {
      element.textContent = currentVal;
      element.classList.remove('digit-bump');
      void element.offsetWidth; // re-flow
      element.classList.add('digit-bump');
      playTickSound();
      lastVal = currentVal;
    }

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      element.textContent = endScore;
    }
  }
  requestAnimationFrame(updateNumber);
}

// ---------------------------------------------------------
// MARKS SHIFT ANIMATION ORCHESTRATOR
// ---------------------------------------------------------
let isShiftAnimating = false;

function fireScoreShift(event) {
  if (isShiftAnimating) return;
  isShiftAnimating = true;

  const { donor, receiver, amount, oldScores, newScores } = event;
  const isJodi1Donor = donor === 'jodi1';

  const donorPodium = isJodi1Donor ? podium1 : podium2;
  const receiverPodium = isJodi1Donor ? podium2 : podium1;
  const donorScoreBox = isJodi1Donor ? scorePodium1 : scorePodium2;
  const receiverScoreBox = isJodi1Donor ? scorePodium2 : scorePodium1;
  const donorScoreDigit = isJodi1Donor ? jodi1Score : jodi2Score;
  const receiverScoreDigit = isJodi1Donor ? jodi2Score : jodi1Score;
  const donorBadge = isJodi1Donor ? deltaBadge1 : deltaBadge2;
  const receiverBadge = isJodi1Donor ? deltaBadge2 : deltaBadge1;

  // Clear any existing badge states
  donorBadge.className = 'score-delta-badge';
  receiverBadge.className = 'score-delta-badge';

  // Get coordinates for the arc
  const rectStart = donorScoreBox.getBoundingClientRect();
  const rectEnd = receiverScoreBox.getBoundingClientRect();

  const startX = rectStart.left + rectStart.width / 2;
  const startY = rectStart.top + rectStart.height / 2;
  const endX = rectEnd.left + rectEnd.width / 2;
  const endY = rectEnd.top + rectEnd.height / 2;

  // Apex of the trajectory arc (curves upward through center of stage)
  const midX = (startX + endX) / 2;
  const apexY = Math.min(startY, endY) - window.innerHeight * 0.28;

  // PHASE 1: CHARGE UP (0ms -> 450ms)
  donorPodium.classList.add('donor-highlight');
  playChargeSound();

  // Electric charging particles at donor score box
  for (let i = 0; i < 25; i++) {
    setTimeout(() => {
      particles.push(new Particle(
        startX + (Math.random() - 0.5) * rectStart.width * 0.6,
        startY + (Math.random() - 0.5) * rectStart.height * 0.5,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        '#FF3B30',
        Math.random() * 4 + 2,
        0.03
      ));
    }, i * 15);
  }

  // PHASE 2: LAUNCH & FLY (450ms -> 1750ms)
  setTimeout(() => {
    orbText.textContent = `+${amount}`;
    transferOrb.style.display = 'block';
    transferOrb.style.opacity = '1';
    transferOrb.style.transform = `translate(${startX}px, ${startY}px) scale(0.6)`;
    playFlySound();

    const flightDuration = 1300;
    const flightStart = performance.now();

    function flyOrb(now) {
      const elapsed = now - flightStart;
      const t = Math.min(1, elapsed / flightDuration);

      // Quadratic Bezier interpolation
      const invT = 1 - t;
      const curX = invT * invT * startX + 2 * invT * t * midX + t * t * endX;
      const curY = invT * invT * startY + 2 * invT * t * apexY + t * t * endY;

      // Scale up in middle, punch on impact
      const scale = 0.8 + Math.sin(t * Math.PI) * 0.55;
      transferOrb.style.transform = `translate(${curX}px, ${curY}px) scale(${scale})`;

      // Particle emission along path
      spawnTrail(curX, curY);

      if (t < 1) {
        requestAnimationFrame(flyOrb);
      } else {
        // PHASE 3: IMPACT (Flight complete)
        triggerImpact();
      }
    }

    requestAnimationFrame(flyOrb);

  }, 450);

  // PHASE 3 & 4: IMPACT & SCORE UPDATE
  function triggerImpact() {
    transferOrb.style.opacity = '0';
    transferOrb.style.display = 'none';

    // Massive Explosion at receiver
    spawnExplosion(endX, endY, 80, ['#00FF88', '#FFD700', '#FFFFFF', '#00E5FF']);
    playImpactSound();

    // Visual highlights
    receiverPodium.classList.add('receiver-highlight');

    // Trigger Permanent Badges that stay on screen
    receiverBadge.textContent = `+${amount}`;
    receiverBadge.className = 'score-delta-badge plus visible pop-and-stay';

    donorBadge.textContent = `-${amount}`;
    donorBadge.className = 'score-delta-badge minus visible pop-and-stay';

    // Roll numbers smoothly to new values
    rollScore(receiverScoreDigit, oldScores[receiver], newScores[receiver], 1400);
    rollScore(donorScoreDigit, oldScores[donor], newScores[donor], 1400);

    // Update internal tracking
    currentJodi1Score = newScores.jodi1;
    currentJodi2Score = newScores.jodi2;

    // Reset styles after animation cycle completes
    setTimeout(() => {
      donorPodium.classList.remove('donor-highlight');
      receiverPodium.classList.remove('receiver-highlight');
      isShiftAnimating = false;
    }, 2800);
  }
}

// ---------------------------------------------------------
// WEBSOCKET COMMUNICATION
// ---------------------------------------------------------
let ws = null;

function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[LED Out] Connected to Gameshow Server');
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'INIT_STATE' || data.type === 'STATE_UPDATE') {
        if (!isShiftAnimating) {
          updateUI(data.state);
        }
      } else if (data.type === 'FIRE_TRANSFER') {
        fireScoreShift(data);
      }
    } catch (err) {
      console.error('[LED Out] WS parse error:', err);
    }
  };

  ws.onclose = () => {
    console.log('[LED Out] Disconnected, reconnecting in 2s...');
    setTimeout(connectWS, 2000);
  };

  ws.onerror = (err) => {
    console.error('[LED Out] WS error:', err);
  };
}

// Fetch initial state via REST fallback
fetch('/api/state')
  .then(res => res.json())
  .then(state => updateUI(state))
  .catch(err => console.error('Error fetching state:', err));

// Start WebSocket connection
connectWS();
