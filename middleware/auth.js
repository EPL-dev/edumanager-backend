// middleware/auth.js — Vérification JWT + rôles

const jwt        = require('jsonwebtoken');
const { pool }   = require('../config/db');

// ── Vérifier le token JWT ─────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Accès refusé. Connexion requise.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe toujours en base
    const [rows] = await pool.execute(
      'SELECT id, username, nom, role, studentId, isActive FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length || !rows[0].isActive) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable ou désactivé.' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expirée. Reconnectez-vous.' });
    }
    return res.status(401).json({ success: false, message: 'Token invalide.' });
  }
};

// ── Autoriser certains rôles ──────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Rôle insuffisant.',
      });
    }
    next();
  };
};

const adminOnly      = authorize('admin', 'superadmin');
const superAdminOnly = authorize('superadmin');
const allRoles       = authorize('admin', 'superadmin', 'etudiant');

module.exports = { protect, authorize, adminOnly, superAdminOnly, allRoles };
