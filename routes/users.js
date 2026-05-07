// routes/users.js — Gestion des comptes (superadmin)

const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, superAdminOnly } = require('../middleware/auth');

router.use(protect, superAdminOnly);

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.id, u.username, u.nom, u.email, u.role, u.studentId,
              s.nom as studentNom, s.prenom as studentPrenom,
              u.isActive, u.createdAt
       FROM users u
       LEFT JOIN students s ON u.studentId = s.id
       ORDER BY u.createdAt DESC`
    );
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { username, password, nom, email, role, studentId } = req.body;
    if (!username || !password || !nom) {
      return res.status(400).json({ success: false, message: 'Identifiant, mot de passe et nom requis.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Mot de passe trop court (min 4 caractères).' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, nom, email, role, studentId) VALUES (?, ?, ?, ?, ?, ?)',
      [username.trim(), hashed, nom, email || '', role || 'etudiant', studentId || null]
    );

    res.status(201).json({ success: true, message: 'Compte créé ✅', id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Identifiant déjà utilisé.' });
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas modifier votre propre compte ici.' });
    }

    const { nom, email, role, password, studentId, isActive } = req.body;
    let query = 'UPDATE users SET nom=?, email=?, role=?, studentId=?, isActive=?';
    let params = [nom, email || '', role, studentId || null, isActive !== undefined ? isActive : 1];

    if (password && password.length >= 4) {
      const hashed = await bcrypt.hash(password, 12);
      query += ', password=?';
      params.push(hashed);
    }

    query += ' WHERE id=?';
    params.push(id);

    await pool.execute(query, params);
    res.json({ success: true, message: 'Compte modifié ✅' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte.' });
    }
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Compte supprimé.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
