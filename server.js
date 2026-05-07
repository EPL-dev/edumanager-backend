// server.js — EduManager Backend (CORS corrigé)

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

// ── CORS — Autoriser Vercel + Netlify + localhost ─────
const allowedOrigins = [
  'https://edumanager-frontends.vercel.app',
  'https://inquisitive-dodol-a8c7e6.netlify.app',
];

app.use(cors({
  origin: function(origin, callback) {
    // Autoriser les requêtes sans origin (Postman, mobile)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Non autorisé par CORS : ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Répondre aux requêtes OPTIONS (preflight)
app.options('*', cors());

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

// ── Routes API ────────────────────────────────────────
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
    success:   true,
    message:   '🚀 EduManager API opérationnelle',
    database:  'MySQL',
    version:   '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route ' + req.originalUrl + ' introuvable.',
  });
});

// ── Gestion globale des erreurs ───────────────────────
app.use((err, req, res, next) => {
  console.error('Erreur serveur :', err.message);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ success: false, message: 'Cette valeur existe déjà.' });
  }

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ success: false, message: 'Accès non autorisé (CORS).' });
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
         
