// server.js — Serveur EduManager (Node.js + MySQL)

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/db');

// ── Connexion MySQL ───────────────────────────────────
testConnection();

const app = express();

// ── Sécurité ──────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Trop de requêtes. Réessayez dans 15 minutes.' },
}));

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
}));

// ── Body Parser ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logger ────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/students',      require('./routes/students'));
app.use('/api/subjects',      require('./routes/subjects'));
app.use('/api/grades',        require('./routes/grades'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/documents',     require('./routes/documents'));
app.use('/api/schedule',      require('./routes/schedule'));
app.use('/api/dashboard',     require('./routes/dashboard'));

// ── Route santé ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 EduManager API opérationnelle',
    database: 'MySQL',
    version: '2.0.0',
  });
});

// ── 404 ───────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} introuvable.` });
});

// ── Gestion des erreurs ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erreur :', err.message);

  // Erreur MySQL doublon
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ success: false, message: 'Cette valeur existe déjà.' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur.',
  });
});

// ── Démarrage ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n🚀 Serveur EduManager démarré');
  console.log('   → URL    : http://localhost:' + PORT);
  console.log('   → API    : http://localhost:' + PORT + '/api/health');
  console.log('   → Env    : ' + process.env.NODE_ENV + '\n');
});

module.exports = app;
