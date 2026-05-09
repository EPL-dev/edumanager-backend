// server.js — EduManager Backend avec keep-alive

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const https     = require('https');
const { testConnection } = require('./config/db');

testConnection();

const app = express();

app.use(helmet());

const allowedOrigins = [
  'https://edumanager-frontends.vercel.app',
  'https://inquisitive-dodol-a8c7e6.netlify.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Non autorisé par CORS : ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Trop de requêtes.' },
}));

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives.' },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

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

app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   '🚀 EduManager API opérationnelle',
    database:  'MySQL',
    version:   '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route ' + req.originalUrl + ' introuvable.' });
});

app.use((err, req, res, next) => {
  console.error('Erreur :', err.message);
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ success: false, message: 'Cette valeur existe déjà.' });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur.',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n🚀 Serveur EduManager démarré');
  console.log('   → URL : http://localhost:' + PORT);
  console.log('   → API : http://localhost:' + PORT + '/api/health\n');

  // ── Keep-alive : pinguer le serveur toutes les 14 minutes ──
  // Empêche Render de mettre le serveur en veille (plan gratuit)
  if (process.env.NODE_ENV === 'production') {
    const serverUrl = process.env.RENDER_URL || 'https://edumanager-api-5n33.onrender.com';
    setInterval(() => {
      https.get(serverUrl + '/api/health', (res) => {
        console.log('💓 Keep-alive ping envoyé — statut : ' + res.statusCode);
      }).on('error', (err) => {
        console.log('⚠️  Keep-alive ping échoué : ' + err.message);
      });
    }, 14 * 60 * 1000); // toutes les 14 minutes
    console.log('💓 Keep-alive activé (ping toutes les 14 min)\n');
  }
});

module.exports = app;
