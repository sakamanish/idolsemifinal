const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const multer = require('multer');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Setup multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve bg.mp4 specifically from root directory
app.get('/bg.mp4', (req, res) => {
  const bgPath = path.join(__dirname, 'bg.mp4');
  if (fs.existsSync(bgPath)) {
    res.sendFile(bgPath);
  } else {
    res.status(404).send('bg.mp4 not found');
  }
});

function getDefaultState() {
  return {
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
      donor: "jodi2",     // who loses marks
      receiver: "jodi1",  // who takes marks
      amount: 5
    },
    lastTransfer: null,   // { donor, receiver, amount }
    status: "idle"
  };
}

let currentState = getDefaultState();

// Load saved state if exists
try {
  if (fs.existsSync(STATE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    currentState = {
      ...getDefaultState(),
      ...saved,
      jodi1: { ...getDefaultState().jodi1, ...(saved.jodi1 || {}) },
      jodi2: { ...getDefaultState().jodi2, ...(saved.jodi2 || {}) },
      transferConfig: { ...getDefaultState().transferConfig, ...(saved.transferConfig || {}) }
    };
  }
} catch (e) {
  console.error('Error reading state file, using defaults', e);
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2));
  } catch (e) {
    console.error('Error saving state', e);
  }
}

// Broadcast message to all WebSocket clients
function broadcast(data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Routes
app.get('/operator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'operator.html'));
});

app.get('/ledout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ledout.html'));
});

app.get('/', (req, res) => {
  res.redirect('/operator');
});

// API Endpoints
app.get('/api/state', (req, res) => {
  res.json(currentState);
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const photoUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: photoUrl });
});

app.post('/api/update', (req, res) => {
  const { jodi1, jodi2, transferConfig } = req.body;
  if (jodi1) currentState.jodi1 = { ...currentState.jodi1, ...jodi1 };
  if (jodi2) currentState.jodi2 = { ...currentState.jodi2, ...jodi2 };
  if (transferConfig) currentState.transferConfig = { ...currentState.transferConfig, ...transferConfig };
  
  saveState();
  broadcast({
    type: 'STATE_UPDATE',
    state: currentState
  });
  res.json({ success: true, state: currentState });
});

app.post('/api/fire', (req, res) => {
  const { donor, receiver, amount } = req.body;
  const transferAmount = Math.max(1, parseInt(amount, 10) || 5);
  const donorKey = donor === 'jodi1' ? 'jodi1' : 'jodi2';
  const receiverKey = receiver === 'jodi1' ? 'jodi1' : 'jodi2';

  if (donorKey === receiverKey) {
    return res.status(400).json({ error: 'Donor and receiver must be different teams' });
  }

  const oldScores = {
    jodi1: Number(currentState.jodi1.score) || 0,
    jodi2: Number(currentState.jodi2.score) || 0
  };

  const newScores = {
    [donorKey]: oldScores[donorKey] - transferAmount,
    [receiverKey]: oldScores[receiverKey] + transferAmount
  };

  currentState[donorKey].score = newScores[donorKey];
  currentState[receiverKey].score = newScores[receiverKey];
  currentState.transferConfig = {
    donor: donorKey,
    receiver: receiverKey,
    amount: transferAmount
  };
  currentState.lastTransfer = {
    donor: donorKey,
    receiver: receiverKey,
    amount: transferAmount
  };

  saveState();

  const fireEvent = {
    type: 'FIRE_TRANSFER',
    donor: donorKey,
    receiver: receiverKey,
    amount: transferAmount,
    oldScores,
    newScores,
    state: currentState
  };

  broadcast(fireEvent);
  res.json({ success: true, event: fireEvent });
});

app.post('/api/reset', (req, res) => {
  const fresh = getDefaultState();
  currentState = {
    ...fresh,
    jodi1: {
      ...fresh.jodi1,
      name: currentState.jodi1.name,
      photo: currentState.jodi1.photo || ""
    },
    jodi2: {
      ...fresh.jodi2,
      name: currentState.jodi2.name,
      photo: currentState.jodi2.photo || ""
    }
  };
  saveState();
  broadcast({
    type: 'STATE_UPDATE',
    state: currentState
  });
  res.json({ success: true, state: currentState });
});

// WebSocket Connection handler
wss.on('connection', (ws) => {
  // Send current state on connection
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    state: currentState
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'UPDATE_STATE') {
        if (data.jodi1) currentState.jodi1 = { ...currentState.jodi1, ...data.jodi1 };
        if (data.jodi2) currentState.jodi2 = { ...currentState.jodi2, ...data.jodi2 };
        if (data.transferConfig) currentState.transferConfig = { ...currentState.transferConfig, ...data.transferConfig };
        saveState();
        broadcast({ type: 'STATE_UPDATE', state: currentState });
      } else if (data.type === 'FIRE') {
        const donorKey = data.donor === 'jodi1' ? 'jodi1' : 'jodi2';
        const receiverKey = data.receiver === 'jodi1' ? 'jodi1' : 'jodi2';
        const transferAmount = Math.max(1, parseInt(data.amount, 10) || 5);

        const oldScores = {
          jodi1: Number(currentState.jodi1.score) || 0,
          jodi2: Number(currentState.jodi2.score) || 0
        };

        const newScores = {
          [donorKey]: oldScores[donorKey] - transferAmount,
          [receiverKey]: oldScores[receiverKey] + transferAmount
        };

        currentState[donorKey].score = newScores[donorKey];
        currentState[receiverKey].score = newScores[receiverKey];
        currentState.transferConfig = {
          donor: donorKey,
          receiver: receiverKey,
          amount: transferAmount
        };
        currentState.lastTransfer = {
          donor: donorKey,
          receiver: receiverKey,
          amount: transferAmount
        };

        saveState();

        broadcast({
          type: 'FIRE_TRANSFER',
          donor: donorKey,
          receiver: receiverKey,
          amount: transferAmount,
          oldScores,
          newScores,
          state: currentState
        });
      }
    } catch (err) {
      console.error('Error handling ws message:', err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Gameshow Server running at http://localhost:${PORT}`);
  console.log(`🎛️ Operator Dashboard : http://localhost:${PORT}/operator`);
  console.log(`📺 LED Output Display  : http://localhost:${PORT}/ledout`);
  console.log(`===============================================`);
});
