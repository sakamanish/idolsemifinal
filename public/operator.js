/* =========================================================
   OPERATOR CONTROL SCRIPT - /operator
   Broadcast Studio Master Controller
   ========================================================= */

// State Object
let state = {
  jodi1: {
    name: "JODI 1",
    photo: "",
    score: 50
  },
  jodi2: {
    name: "JODI 2",
    photo: "",
    score: 50
  },
  transferConfig: {
    receiver: "jodi1",
    donor: "jodi2",
    amount: 5
  }
};

let isAnimating = false;
let ws = null;

// DOM Elements
const wsStatus = document.getElementById('wsStatus');

// Jodi 1 Elements
const inputName1 = document.getElementById('inputName1');
const inputScore1 = document.getElementById('inputScore1');
const imgPreview1 = document.getElementById('imgPreview1');
const emptyPhoto1 = document.getElementById('emptyPhoto1');
const fileInput1 = document.getElementById('fileInput1');
const dropZone1 = document.getElementById('dropZone1');
const radioJodi1 = document.getElementById('radioJodi1');
const stealAmount1 = document.getElementById('stealAmount1');
const receiverOption1 = document.getElementById('receiverOption1');

// Jodi 2 Elements
const inputName2 = document.getElementById('inputName2');
const inputScore2 = document.getElementById('inputScore2');
const imgPreview2 = document.getElementById('imgPreview2');
const emptyPhoto2 = document.getElementById('emptyPhoto2');
const fileInput2 = document.getElementById('fileInput2');
const dropZone2 = document.getElementById('dropZone2');
const radioJodi2 = document.getElementById('radioJodi2');
const stealAmount2 = document.getElementById('stealAmount2');
const receiverOption2 = document.getElementById('receiverOption2');

// Center Controls
const flowDonor = document.getElementById('flowDonor');
const flowReceiver = document.getElementById('flowReceiver');
const flowAmountBadge = document.getElementById('flowAmountBadge');
const projJodi1 = document.getElementById('projJodi1');
const projJodi2 = document.getElementById('projJodi2');
const btnFire = document.getElementById('btnFire');
const btnPushUpdate = document.getElementById('btnPushUpdate');
const btnSwap = document.getElementById('btnSwap');
const btnEqualize = document.getElementById('btnEqualize');
const btnReset = document.getElementById('btnReset');
const eventFeed = document.getElementById('eventFeed');

// ---------------------------------------------------------
// LOGGING UTILITY
// ---------------------------------------------------------
function logEvent(message, type = '') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const time = new Date().toLocaleTimeString();
  entry.textContent = `[${time}] ${message}`;
  eventFeed.prepend(entry);
}

// ---------------------------------------------------------
// IMAGE UPLOAD HANDLING
// ---------------------------------------------------------
async function handlePhotoUpload(file, jodiKey) {
  if (!file) return;

  const formData = new FormData();
  formData.append('photo', file);

  logEvent(`Uploading image for ${jodiKey.toUpperCase()}...`);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success && data.url) {
      state[jodiKey].photo = data.url;
      updatePhotoPreview(jodiKey, data.url);
      logEvent(`Photo uploaded for ${jodiKey.toUpperCase()}`, 'update');
      pushUpdateToLED();
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (err) {
    console.warn('Server upload error, fallback to FileReader DataURL:', err);
    // Fallback: Data URL directly
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      state[jodiKey].photo = dataUrl;
      updatePhotoPreview(jodiKey, dataUrl);
      logEvent(`Photo loaded locally for ${jodiKey.toUpperCase()}`, 'update');
      pushUpdateToLED();
    };
    reader.readAsDataURL(file);
  }
}

function updatePhotoPreview(jodiKey, photoUrl) {
  const isJ1 = jodiKey === 'jodi1';
  const imgEl = isJ1 ? imgPreview1 : imgPreview2;
  const emptyEl = isJ1 ? emptyPhoto1 : emptyPhoto2;

  if (photoUrl && photoUrl.trim() !== '') {
    imgEl.src = photoUrl;
    imgEl.style.display = 'block';
    emptyEl.style.display = 'none';
  } else {
    imgEl.style.display = 'none';
    emptyEl.style.display = 'flex';
  }
}

// Bind file pickers
fileInput1.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handlePhotoUpload(e.target.files[0], 'jodi1');
  }
});

fileInput2.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handlePhotoUpload(e.target.files[0], 'jodi2');
  }
});

// Drag & drop support
function setupDragDrop(zone, fileInput, jodiKey) {
  ['dragenter', 'dragover'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
    }, false);
  });

  zone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) {
      handlePhotoUpload(file, jodiKey);
    }
  });
}
setupDragDrop(dropZone1, fileInput1, 'jodi1');
setupDragDrop(dropZone2, fileInput2, 'jodi2');

// ---------------------------------------------------------
// INPUT LISTENERS & SYNC
// ---------------------------------------------------------
inputName1.addEventListener('input', (e) => {
  state.jodi1.name = e.target.value;
  updateActionPreview();
});

inputName2.addEventListener('input', (e) => {
  state.jodi2.name = e.target.value;
  updateActionPreview();
});

inputScore1.addEventListener('input', (e) => {
  state.jodi1.score = parseInt(e.target.value, 10) || 0;
  updateActionPreview();
});

inputScore2.addEventListener('input', (e) => {
  state.jodi2.score = parseInt(e.target.value, 10) || 0;
  updateActionPreview();
});

function adjustScore(jodiKey, delta) {
  const current = parseInt(state[jodiKey].score, 10) || 0;
  state[jodiKey].score = Math.max(0, current + delta);
  if (jodiKey === 'jodi1') {
    inputScore1.value = state.jodi1.score;
  } else {
    inputScore2.value = state.jodi2.score;
  }
  updateActionPreview();
}

stealAmount1.addEventListener('input', (e) => {
  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
  state.transferConfig.amount = val;
  selectReceiver('jodi1');
});

stealAmount2.addEventListener('input', (e) => {
  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
  state.transferConfig.amount = val;
  selectReceiver('jodi2');
});

function setQuickAmount(amount, receiverKey) {
  state.transferConfig.amount = amount;
  if (receiverKey === 'jodi1') {
    stealAmount1.value = amount;
    selectReceiver('jodi1');
  } else {
    stealAmount2.value = amount;
    selectReceiver('jodi2');
  }

  // Update chip active classes
  document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
  event.target.classList.add('active');
}

function selectReceiver(receiverKey) {
  state.transferConfig.receiver = receiverKey;
  state.transferConfig.donor = receiverKey === 'jodi1' ? 'jodi2' : 'jodi1';

  if (receiverKey === 'jodi1') {
    radioJodi1.checked = true;
    receiverOption1.classList.add('selected');
    receiverOption2.classList.remove('selected');
    state.transferConfig.amount = parseInt(stealAmount1.value, 10) || 5;
  } else {
    radioJodi2.checked = true;
    receiverOption2.classList.add('selected');
    receiverOption1.classList.remove('selected');
    state.transferConfig.amount = parseInt(stealAmount2.value, 10) || 5;
  }

  updateActionPreview();
}

// ---------------------------------------------------------
// ACTION PREVIEW DISPLAY
// ---------------------------------------------------------
function updateActionPreview() {
  const donorKey = state.transferConfig.donor;
  const receiverKey = state.transferConfig.receiver;
  const amount = state.transferConfig.amount;

  const donorName = state[donorKey].name || (donorKey === 'jodi1' ? 'JODI 1' : 'JODI 2');
  const receiverName = state[receiverKey].name || (receiverKey === 'jodi1' ? 'JODI 1' : 'JODI 2');

  flowDonor.textContent = donorName;
  flowReceiver.textContent = receiverName;
  flowAmountBadge.textContent = `${amount} PTS`;

  const s1 = Number(state.jodi1.score) || 0;
  const s2 = Number(state.jodi2.score) || 0;

  let newS1 = s1;
  let newS2 = s2;

  if (receiverKey === 'jodi1') {
    newS1 = s1 + amount;
    newS2 = s2 - amount;
    projJodi1.innerHTML = `<span class="proj-label">${state.jodi1.name}:</span> <span class="proj-math">${s1} ➔ <strong>${newS1}</strong> <em class="gain">(+${amount})</em></span>`;
    projJodi2.innerHTML = `<span class="proj-label">${state.jodi2.name}:</span> <span class="proj-math">${s2} ➔ <strong>${newS2}</strong> <em class="loss">(-${amount})</em></span>`;
  } else {
    newS1 = s1 - amount;
    newS2 = s2 + amount;
    projJodi1.innerHTML = `<span class="proj-label">${state.jodi1.name}:</span> <span class="proj-math">${s1} ➔ <strong>${newS1}</strong> <em class="loss">(-${amount})</em></span>`;
    projJodi2.innerHTML = `<span class="proj-label">${state.jodi2.name}:</span> <span class="proj-math">${s2} ➔ <strong>${newS2}</strong> <em class="gain">(+${amount})</em></span>`;
  }
}

// ---------------------------------------------------------
// FIRE MARKS SHIFT ACTION
// ---------------------------------------------------------
async function triggerFire() {
  if (isAnimating) return;
  isAnimating = true;

  btnFire.classList.add('animating');
  btnFire.disabled = true;

  const donorKey = state.transferConfig.donor;
  const receiverKey = state.transferConfig.receiver;
  const amount = state.transferConfig.amount;

  logEvent(`🔥 FIRE! ${state[donorKey].name} ➔ ${amount} Marks ➔ ${state[receiverKey].name}`, 'fire');

  const payload = {
    donor: donorKey,
    receiver: receiverKey,
    amount: amount
  };

  try {
    const res = await fetch('/api/fire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      state = result.event.state;
      syncFormFromState();
    }
  } catch (err) {
    console.error('Fire API failed, attempting WS fallback:', err);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'FIRE', ...payload }));
    }
  }

  // Cooldown timer (prevents rapid double click during animation)
  let countdown = 3;
  const timer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      btnFire.querySelector('.fire-text').textContent = `FIRING (${countdown}s)`;
    } else {
      clearInterval(timer);
      btnFire.classList.remove('animating');
      btnFire.disabled = false;
      btnFire.querySelector('.fire-text').textContent = 'FIRE';
      isAnimating = false;
    }
  }, 1000);
}

btnFire.addEventListener('click', triggerFire);

// Keyboard shortcuts (Space or Enter to Fire)
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.key === 'Enter') && !isAnimating) {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return; // typing in form input
    }
    e.preventDefault();
    triggerFire();
  }
});

// ---------------------------------------------------------
// AUXILIARY ACTIONS
// ---------------------------------------------------------
async function pushUpdateToLED() {
  state.jodi1.name = inputName1.value;
  state.jodi1.score = parseInt(inputScore1.value, 10) || 0;
  state.jodi2.name = inputName2.value;
  state.jodi2.score = parseInt(inputScore2.value, 10) || 0;

  try {
    const res = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    const data = await res.json();
    if (data.success) {
      logEvent('Updated LED screen live details.', 'update');
    }
  } catch (err) {
    console.error('Update failed:', err);
  }
}
btnPushUpdate.addEventListener('click', pushUpdateToLED);

btnSwap.addEventListener('click', () => {
  const temp = { ...state.jodi1 };
  state.jodi1 = { ...state.jodi2 };
  state.jodi2 = temp;
  syncFormFromState();
  pushUpdateToLED();
  logEvent('Swapped Jodi 1 and Jodi 2.', 'update');
});

btnEqualize.addEventListener('click', () => {
  const s1 = Number(state.jodi1.score) || 0;
  const s2 = Number(state.jodi2.score) || 0;
  const avg = Math.round((s1 + s2) / 2);
  state.jodi1.score = avg;
  state.jodi2.score = avg;
  syncFormFromState();
  pushUpdateToLED();
  logEvent(`Equalized scores to ${avg}.`, 'update');
});

btnReset.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to reset all scores to default (50 - 50)?')) return;
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      state = data.state;
      syncFormFromState();
      logEvent('Scores reset to default.', 'update');
    }
  } catch (err) {
    console.error('Reset failed:', err);
  }
});

// ---------------------------------------------------------
// SYNC STATE TO FORM
// ---------------------------------------------------------
function syncFormFromState() {
  inputName1.value = state.jodi1.name || "JODI 1";
  inputScore1.value = state.jodi1.score;
  updatePhotoPreview('jodi1', state.jodi1.photo);

  inputName2.value = state.jodi2.name || "JODI 2";
  inputScore2.value = state.jodi2.score;
  updatePhotoPreview('jodi2', state.jodi2.photo);

  if (state.transferConfig) {
    const rKey = state.transferConfig.receiver || 'jodi1';
    const amt = state.transferConfig.amount || 5;
    if (rKey === 'jodi1') {
      stealAmount1.value = amt;
      selectReceiver('jodi1');
    } else {
      stealAmount2.value = amt;
      selectReceiver('jodi2');
    }
  }

  updateActionPreview();
}

// ---------------------------------------------------------
// WEBSOCKET CONNECTION
// ---------------------------------------------------------
function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    wsStatus.className = 'status-pill online';
    wsStatus.querySelector('.status-label').textContent = 'LED SYNC ONLINE';
    logEvent('Connected to broadcast server.');
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'INIT_STATE' || data.type === 'STATE_UPDATE') {
        state = { ...state, ...data.state };
        syncFormFromState();
      } else if (data.type === 'FIRE_TRANSFER') {
        state = { ...state, ...data.state };
        syncFormFromState();
      }
    } catch (err) {
      console.error('WS parse error:', err);
    }
  };

  ws.onclose = () => {
    wsStatus.className = 'status-pill offline';
    wsStatus.querySelector('.status-label').textContent = 'RECONNECTING...';
    setTimeout(connectWS, 2000);
  };
}

// Initialize
fetch('/api/state')
  .then(res => res.json())
  .then(savedState => {
    state = { ...state, ...savedState };
    syncFormFromState();
  })
  .catch(err => console.error(err));

connectWS();
