// routes/auth.js — Authentification

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect } = require('../middleware/auth');

// ── POST /api/auth/login ──────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Identifiant et mot de passe requis.' });
    }

    // Chercher l'utilisateur
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND isActive = 1',
      [username.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    const user = rows[0];

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    // Générer le JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id:        user.id,
        username:  user.username,
        nom:       user.nom,
        role:      user.role,
        studentId: user.studentId,
      },
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, nom, email, role, studentId, createdAt FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── PUT /api/auth/change-password ─────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Les deux mots de passe sont requis.' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Nouveau mot de passe trop court (min 4 caractères).' });
    }

    const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── POST /api/auth/setup — Premier superadmin ─────────
router.post('/setup', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    if (rows[0].count > 0) {
      return res.status(403).json({ success: false, message: 'Configuration déjà effectuée.' });
    }

    const { username, password, nom } = req.body;
    if (!username || !password || !nom) {
      return res.status(400).json({ success: false, message: 'username, password et nom requis.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, nom, role) VALUES (?, ?, ?, ?)',
      [username, hashed, nom, 'superadmin']
    );

    const token = jwt.sign(
      { id: result.insertId, role: 'superadmin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Super administrateur créé ✅',
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
