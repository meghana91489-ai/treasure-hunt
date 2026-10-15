const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_infotsav_2k26_super_secret_jwt_key_999';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'treasure_hunt.json');

// Initial default seed stages
const DEFAULT_STAGES = [
  {
    id: 'stage_1',
    stageNumber: 1,
    title: 'The Digital Beacon',
    locationHint: 'Head to the Main Entrance Lobby near the Welcome Digital Kiosk. Look closely near the base of the interactive display pillar.',
    puzzleQuestion: 'I am a cryptographic protocol that secures communication over the internet, succeeding SSL. What is my 3-letter acronym?',
    puzzleAnswer: 'TLS',
    secretQrToken: 'INFOTSAV_STAGE1_NEXUS',
    points: 100,
    createdAt: new Date().toISOString()
  },
  {
    id: 'stage_2',
    stageNumber: 2,
    title: 'The Core Datacenter',
    locationHint: 'Navigate to Level 2, Computer Lab 3. Inspect the server rack labeled "SWITCH-ALPHA" next to the network patch panel.',
    puzzleQuestion: 'In computer science, I am an abstract data type that serves as a collection of elements with First-In, First-Out (FIFO) retrieval. What am I?',
    puzzleAnswer: 'Queue',
    secretQrToken: 'INFOTSAV_STAGE2_CYBER',
    points: 150,
    createdAt: new Date().toISOString()
  },
  {
    id: 'stage_3',
    stageNumber: 3,
    title: 'The Quantum Vault',
    locationHint: 'Make your way to the Innovation Hub Seminar Hall. Look behind the presenter podium corner on the right wing.',
    puzzleQuestion: 'I am the cryptographic hash function designed by the NSA that produces a 256-bit digest, used universally in Bitcoin & Git. What is my name?',
    puzzleAnswer: 'SHA-256',
    secretQrToken: 'INFOTSAV_STAGE3_OMEGA',
    points: 200,
    createdAt: new Date().toISOString()
  }
];

// In-memory Database with atomic JSON file persistence
class Database {
  constructor(filepath) {
    this.filepath = filepath;
    this.data = {
      stages: [],
      teams: [],
      admin: {
        username: 'admin',
        password: 'admin123' // Hackathon default credentials
      },
      settings: {
        huntName: 'Treasure Hunt',
        allowManualEntry: true,
        startedAt: new Date().toISOString()
      }
    };
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.filepath)) {
        const raw = fs.readFileSync(this.filepath, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure default stages exist if empty
        if (!this.data.stages || this.data.stages.length === 0) {
          this.data.stages = DEFAULT_STAGES;
          this.save();
        }
      } else {
        this.data.stages = DEFAULT_STAGES;
        this.save();
      }
    } catch (err) {
      console.error('Error loading DB, initializing defaults:', err);
      this.data.stages = DEFAULT_STAGES;
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing to DB file:', err);
    }
  }

  // Stage helpers
  getStages() {
    return [...this.data.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  }

  getStageByNumber(num) {
    return this.data.stages.find(s => s.stageNumber === Number(num));
  }

  getStageByToken(token) {
    if (!token) return null;
    const cleanToken = token.trim().toLowerCase();
    return this.data.stages.find(s => s.secretQrToken.trim().toLowerCase() === cleanToken);
  }

  addStage(stage) {
    const newStage = {
      id: 'stage_' + Date.now(),
      stageNumber: Number(stage.stageNumber),
      title: stage.title || `Stage ${stage.stageNumber}`,
      locationHint: stage.locationHint,
      puzzleQuestion: stage.puzzleQuestion,
      puzzleAnswer: stage.puzzleAnswer,
      secretQrToken: stage.secretQrToken || `TOKEN_${Date.now()}`,
      points: Number(stage.points) || 100,
      createdAt: new Date().toISOString()
    };
    this.data.stages.push(newStage);
    this.save();
    return newStage;
  }

  updateStage(id, updates) {
    const idx = this.data.stages.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.stages[idx] = {
      ...this.data.stages[idx],
      ...updates,
      stageNumber: Number(updates.stageNumber !== undefined ? updates.stageNumber : this.data.stages[idx].stageNumber)
    };
    this.save();
    return this.data.stages[idx];
  }

  deleteStage(id) {
    const idx = this.data.stages.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.stages.splice(idx, 1);
    this.save();
    return true;
  }

  // Team helpers
  getTeams() {
    return this.data.teams;
  }

  getTeamById(id) {
    return this.data.teams.find(t => t.id === id);
  }

  getTeamByName(name) {
    return this.data.teams.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
  }

  registerOrLoginTeam(name, pin) {
    const cleanName = name.trim();
    const cleanPin = pin.trim();
    let team = this.getTeamByName(cleanName);

    if (team) {
      if (team.pin !== cleanPin) {
        throw new Error('Invalid PIN for this team name!');
      }
      return team;
    }

    // New Team
    team = {
      id: 'team_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: cleanName,
      pin: cleanPin,
      currentStage: 1,
      completed: false,
      qrScannedForCurrent: false,
      startTime: new Date().toISOString(),
      finishTime: null,
      totalTimeSeconds: 0,
      attemptsOnCurrentStage: 0,
      score: 0,
      history: []
    };

    this.data.teams.push(team);
    this.save();
    return team;
  }

  saveTeam(team) {
    const idx = this.data.teams.findIndex(t => t.id === team.id);
    if (idx !== -1) {
      this.data.teams[idx] = team;
      this.save();
    }
  }

  resetAllTeams() {
    this.data.teams = [];
    this.save();
  }

  resetSingleTeam(teamId) {
    const team = this.getTeamById(teamId);
    if (team) {
      team.currentStage = 1;
      team.completed = false;
      team.qrScannedForCurrent = false;
      team.startTime = new Date().toISOString();
      team.finishTime = null;
      team.totalTimeSeconds = 0;
      team.attemptsOnCurrentStage = 0;
      team.score = 0;
      team.history = [];
      this.save();
      return team;
    }
    return null;
  }
}

const db = new Database(DB_FILE);

// ================= JWT AUTHENTICATION MIDDLEWARES =================
function authenticateTeam(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'team' || !decoded.teamId) {
      return res.status(403).json({ error: 'Access denied: participant token required.' });
    }
    const team = db.getTeamById(decoded.teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team session not found. Please log in again.' });
    }
    req.team = team;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authorization required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
  }
}

// Normalize answer for fair matching
function checkAnswer(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;
  const cleanUser = userAnswer.trim().toLowerCase().replace(/[\s\-_]/g, '');
  // Support multiple accepted answers separated by commas or pipes
  const acceptable = correctAnswer.split(/[,|]/).map(a => a.trim().toLowerCase().replace(/[\s\-_]/g, ''));
  return acceptable.includes(cleanUser);
}

// Format duration helper
function getDurationSeconds(startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

// ================= API ROUTES =================

// 1. Auth: Admin Login
app.post('/api/auth/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username === db.data.admin.username && password === db.data.admin.password) {
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      success: true,
      role: 'admin',
      token,
      message: 'Admin authentication successful.'
    });
  }

  return res.status(401).json({ error: 'Invalid admin credentials!' });
});

// 2. Auth: Team Register / Login
app.post('/api/auth/team-login', (req, res) => {
  const { teamName, pin } = req.body;
  if (!teamName || !pin) {
    return res.status(400).json({ error: 'Team name and PIN are required.' });
  }

  if (pin.length < 3) {
    return res.status(400).json({ error: 'PIN must be at least 3 digits/characters.' });
  }

  try {
    const team = db.registerOrLoginTeam(teamName, pin);
    const token = jwt.sign({ role: 'team', teamId: team.id, name: team.name }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      success: true,
      token,
      team: {
        id: team.id,
        name: team.name,
        currentStage: team.currentStage,
        completed: team.completed,
        score: team.score
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 3. Auth: Verify current token
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'admin') {
      return res.json({ authenticated: true, role: 'admin', username: decoded.username });
    }
    if (decoded.role === 'team') {
      const team = db.getTeamById(decoded.teamId);
      if (!team) return res.status(401).json({ authenticated: false });
      return res.json({ authenticated: true, role: 'team', team });
    }
    return res.status(401).json({ authenticated: false });
  } catch (err) {
    return res.status(401).json({ authenticated: false });
  }
});

// ================= PARTICIPANT / PLAY ROUTES =================

// Get team's current stage information and all unlocked stages
app.get('/api/play/current-stage', authenticateTeam, (req, res) => {
  const team = req.team;
  const stages = db.getStages();
  const totalStages = stages.length;

  // Build the list of stages allowing the user to view previous stages
  const unlockedStages = stages.map(s => {
    const isCompleted = team.completed || s.stageNumber < team.currentStage;
    const isActive = !team.completed && s.stageNumber === team.currentStage;
    const isLocked = s.stageNumber > team.currentStage;
    const hist = (team.history || []).find(h => h.stageNumber === s.stageNumber);
    return {
      stageNumber: s.stageNumber,
      title: s.title,
      locationHint: !isLocked ? s.locationHint : 'Locked - complete previous stages first',
      isCompleted,
      isActive,
      isLocked,
      points: s.points || 100,
      solvedAt: hist ? hist.solvedAt : null
    };
  });

  if (team.completed || team.currentStage > totalStages) {
    return res.json({
      completed: true,
      teamName: team.name,
      currentStageNumber: totalStages,
      totalStages,
      totalTimeSeconds: team.totalTimeSeconds || getDurationSeconds(team.startTime, team.finishTime),
      startTime: team.startTime,
      finishTime: team.finishTime,
      score: team.score,
      history: team.history,
      unlockedStages
    });
  }

  const currentStage = db.getStageByNumber(team.currentStage);
  if (!currentStage) {
    return res.status(404).json({ error: `Stage ${team.currentStage} configuration not found!` });
  }

  const responseData = {
    completed: false,
    teamName: team.name,
    currentStageNumber: team.currentStage,
    totalStages,
    stageTitle: currentStage.title,
    locationHint: currentStage.locationHint,
    startTime: team.startTime,
    elapsedSeconds: getDurationSeconds(team.startTime),
    score: team.score,
    history: team.history || [],
    unlockedStages
  };

  return res.json(responseData);
});

// Scan QR Code endpoint - DIRECT STAGE ADVANCEMENT ON SCAN
app.post('/api/play/scan-qr', authenticateTeam, (req, res) => {
  const team = req.team;
  const { qrToken } = req.body;

  if (!qrToken || typeof qrToken !== 'string') {
    return res.status(400).json({ error: 'QR Token string is required.' });
  }

  const cleanToken = qrToken.trim();

  // Find which stage this token belongs to
  const matchingStage = db.getStageByToken(cleanToken);

  if (!matchingStage) {
    return res.status(404).json({
      error: 'Unknown QR token! Make sure you are at the correct physical location.'
    });
  }

  const stages = db.getStages();
  const totalStages = stages.length;

  // Anti-cheat progression logic:
  // 1. Is it a future stage?
  if (matchingStage.stageNumber > team.currentStage) {
    return res.status(400).json({
      error: 'Invalid Stage! Complete previous challenges first.'
    });
  }

  // 2. Is it an already completed stage?
  if (matchingStage.stageNumber < team.currentStage || team.completed) {
    return res.status(400).json({
      error: 'Stage already completed!'
    });
  }

  // 3. Exactly the current stage! Advance directly!
  const solvedAt = new Date().toISOString();
  const timeTakenForStage = getDurationSeconds(team.stageUnlockedAt || team.startTime, solvedAt);

  team.history = team.history || [];
  team.history.push({
    stageNumber: matchingStage.stageNumber,
    title: matchingStage.title,
    locationHint: matchingStage.locationHint,
    solvedAt,
    timeTakenSeconds: timeTakenForStage
  });

  team.score = (team.score || 0) + (matchingStage.points || 100);

  // Check if final stage
  if (team.currentStage >= totalStages) {
    team.completed = true;
    team.finishTime = solvedAt;
    team.totalTimeSeconds = getDurationSeconds(team.startTime, team.finishTime);
    db.saveTeam(team);

    return res.json({
      success: true,
      completed: true,
      stageNumber: matchingStage.stageNumber,
      message: 'CONGRATULATIONS! You have completed all stages of the Treasure Hunt!',
      totalTimeSeconds: team.totalTimeSeconds,
      score: team.score
    });
  }

  // Advance to next stage immediately
  team.currentStage += 1;
  team.stageUnlockedAt = solvedAt;
  db.saveTeam(team);

  const nextStage = db.getStageByNumber(team.currentStage);

  return res.json({
    success: true,
    completed: false,
    stageNumber: matchingStage.stageNumber,
    nextStageNumber: team.currentStage,
    nextStageTitle: nextStage ? nextStage.title : `Stage ${team.currentStage}`,
    nextLocationHint: nextStage ? nextStage.locationHint : '',
    message: `Stage ${matchingStage.stageNumber} Verified! Next location clue unlocked.`,
    score: team.score
  });
});

// Update Participant Live Location
app.post('/api/play/update-location', authenticateTeam, (req, res) => {
  const team = req.team;
  const { latitude, longitude, accuracy, heading, speed } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid numerical coordinates required.' });
  }

  team.liveLocation = {
    latitude: lat,
    longitude: lng,
    accuracy: Math.round(accuracy || 0),
    heading: heading !== undefined ? heading : null,
    speed: speed !== undefined ? speed : null,
    updatedAt: new Date().toISOString(),
    mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
  };

  db.saveTeam(team);

  return res.json({
    success: true,
    message: 'Live location recorded.',
    liveLocation: team.liveLocation
  });
});

// Submit Puzzle Answer endpoint
app.post('/api/play/submit-puzzle', authenticateTeam, (req, res) => {
  const team = req.team;
  const { answer } = req.body;

  if (!answer || typeof answer !== 'string') {
    return res.status(400).json({ error: 'Answer submission cannot be empty.' });
  }

  if (team.completed) {
    return res.status(400).json({ error: 'Hunt already completed!' });
  }

  // Must have scanned the QR code first!
  if (!team.qrScannedForCurrent) {
    return res.status(400).json({
      error: 'Access Denied: You must scan the stage location QR code before solving the puzzle!'
    });
  }

  const currentStage = db.getStageByNumber(team.currentStage);
  if (!currentStage) {
    return res.status(404).json({ error: 'Current stage not found.' });
  }

  const isCorrect = checkAnswer(answer, currentStage.puzzleAnswer);

  if (!isCorrect) {
    team.attemptsOnCurrentStage = (team.attemptsOnCurrentStage || 0) + 1;
    db.saveTeam(team);
    return res.status(400).json({
      correct: false,
      message: 'Incorrect answer! Review the question carefully and try again.',
      attempts: team.attemptsOnCurrentStage
    });
  }

  // Correct answer! Record stage history
  const stages = db.getStages();
  const totalStages = stages.length;
  const solvedAt = new Date().toISOString();
  const timeTakenForStage = getDurationSeconds(team.stageUnlockedAt || team.startTime, solvedAt);

  team.history.push({
    stageNumber: team.currentStage,
    title: currentStage.title,
    solvedAt,
    timeTakenSeconds: timeTakenForStage,
    attempts: (team.attemptsOnCurrentStage || 0) + 1
  });

  team.score = (team.score || 0) + (currentStage.points || 100);
  team.attemptsOnCurrentStage = 0;
  team.qrScannedForCurrent = false;

  // Check if final stage
  if (team.currentStage >= totalStages) {
    team.completed = true;
    team.finishTime = solvedAt;
    team.totalTimeSeconds = getDurationSeconds(team.startTime, team.finishTime);
    db.saveTeam(team);

    return res.json({
      correct: true,
      completed: true,
      message: 'CONGRATULATIONS! You have completed all stages of the Digital Treasure Hunt!',
      totalTimeSeconds: team.totalTimeSeconds,
      score: team.score
    });
  }

  // Advance to next stage
  team.currentStage += 1;
  db.saveTeam(team);

  const nextStage = db.getStageByNumber(team.currentStage);

  return res.json({
    correct: true,
    completed: false,
    message: `Stage ${team.currentStage - 1} Solved! Next location clue unlocked.`,
    nextStageNumber: team.currentStage,
    nextStageTitle: nextStage ? nextStage.title : `Stage ${team.currentStage}`,
    nextLocationHint: nextStage ? nextStage.locationHint : '',
    score: team.score
  });
});

// ================= ADMIN ROUTES =================

// Get all stages (includes answers, tokens, and QR code Data URLs)
app.get('/api/admin/stages', authenticateAdmin, async (req, res) => {
  try {
    const stages = db.getStages();
    // Generate QR code data URLs for each stage
    const stagesWithQR = await Promise.all(
      stages.map(async stage => {
        // Embed the secret QR token
        const qrDataUrl = await QRCode.toDataURL(stage.secretQrToken, {
          width: 320,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        return {
          ...stage,
          qrDataUrl
        };
      })
    );
    return res.json(stagesWithQR);
  } catch (err) {
    console.error('Error fetching admin stages:', err);
    return res.status(500).json({ error: 'Failed to retrieve stages with QR codes.' });
  }
});

// Create new stage
app.post('/api/admin/stages', authenticateAdmin, (req, res) => {
  const { stageNumber, title, locationHint, puzzleQuestion, puzzleAnswer, secretQrToken, points } = req.body;

  if (!stageNumber || !locationHint) {
    return res.status(400).json({
      error: 'Stage Number and Location Hint are required.'
    });
  }

  const existingNum = db.getStageByNumber(stageNumber);
  if (existingNum) {
    return res.status(400).json({ error: `Stage number ${stageNumber} already exists!` });
  }

  const newStage = db.addStage({
    stageNumber,
    title: title || `Stage ${stageNumber}`,
    locationHint,
    puzzleQuestion: puzzleQuestion || '',
    puzzleAnswer: puzzleAnswer || '',
    secretQrToken: secretQrToken || `STAGE_${stageNumber}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    points: Number(points) || 100
  });

  return res.json({ success: true, stage: newStage });
});

// Update stage
app.put('/api/admin/stages/:id', authenticateAdmin, (req, res) => {
  const updated = db.updateStage(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Stage not found.' });
  }
  return res.json({ success: true, stage: updated });
});

// Delete stage
app.delete('/api/admin/stages/:id', authenticateAdmin, (req, res) => {
  const success = db.deleteStage(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Stage not found.' });
  }
  return res.json({ success: true });
});

// Get admin stats & team progress
app.get('/api/admin/teams', authenticateAdmin, (req, res) => {
  const teams = db.getTeams().map(t => ({
    ...t,
    elapsedSeconds: t.completed ? t.totalTimeSeconds : getDurationSeconds(t.startTime)
  }));
  return res.json(teams);
});

// Reset single team
app.post('/api/admin/teams/:id/reset', authenticateAdmin, (req, res) => {
  const resetTeam = db.resetSingleTeam(req.params.id);
  if (!resetTeam) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  return res.json({ success: true, team: resetTeam });
});

// Reset all teams
app.post('/api/admin/teams/reset-all', authenticateAdmin, (req, res) => {
  db.resetAllTeams();
  return res.json({ success: true, message: 'All teams reset successfully.' });
});

// ================= PUBLIC LEADERBOARD ROUTE =================
app.get('/api/leaderboard', (req, res) => {
  const stages = db.getStages();
  const totalStages = stages.length;
  const teams = db.getTeams();

  // Sort logic:
  // 1. Completed teams first, ranked by shortest totalTimeSeconds
  // 2. Active teams, ranked by highest currentStage, then shortest elapsedSeconds
  const leaderboard = teams.map(t => {
    const elapsed = t.completed ? (t.totalTimeSeconds || getDurationSeconds(t.startTime, t.finishTime)) : getDurationSeconds(t.startTime);
    return {
      id: t.id,
      name: t.name,
      currentStage: t.currentStage,
      completedStages: t.completed ? totalStages : Math.max(0, t.currentStage - 1),
      completed: t.completed,
      score: t.score || 0,
      totalTimeSeconds: elapsed,
      startTime: t.startTime,
      finishTime: t.finishTime
    };
  });

  leaderboard.sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    if (a.completed && b.completed) {
      return a.totalTimeSeconds - b.totalTimeSeconds;
    }
    // Both in progress: higher completed stages first
    if (b.completedStages !== a.completedStages) {
      return b.completedStages - a.completedStages;
    }
    // Then lowest elapsed time
    return a.totalTimeSeconds - b.totalTimeSeconds;
  });

  return res.json({
    totalStages,
    huntName: db.data.settings.huntName,
    leaderboard
  });
});

// ================= DIRECT QR CODE IMAGE ROUTE =================
// Organizers or participants can visit /api/qr/:token to see/download clean QR code
app.get('/api/qr/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const qrBuffer = await QRCode.toBuffer(token, {
      type: 'png',
      width: 400,
      margin: 2
    });
    res.setHeader('Content-Type', 'image/png');
    return res.send(qrBuffer);
  } catch (err) {
    return res.status(500).send('Error generating QR code.');
  }
});

// ================= PAGE ROUTING =================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'play.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 DIGITAL TREASURE HUNT SERVER RUNNING`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🎯 Participant Interface: http://localhost:${PORT}/play`);
  console.log(`🛡️  Admin Dashboard:      http://localhost:${PORT}/admin`);
  console.log(`🔑 Admin Credentials:     admin / admin123`);
  console.log(`====================================================`);
});
