// routes/subjects.js — Seul superadmin peut modifier

const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, superAdminOnly, allRoles } = require('../middleware/auth');

router.use(protect);

// GET — Tout le monde voit les matières
router.get('/', allRoles, async (req, res) => {
  try {
    const [subjects] = await pool.execute('SELECT * FROM subjects ORDER BY name');
    res.json({ success: true, subjects });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST — SEULEMENT superadmin (pas admin)
router.post('/', superAdminOnly, async (req, res) => {
  try {
    const { name, coeff } = req.body;
    if (!name || !coeff) {
      return res.status(400).json({ success: false, message: 'Nom et coefficient requis.' });
    }
    const [result] = await pool.execute(
      'INSERT INTO subjects (name, coeff) VALUES (?, ?)',
      [name, parseInt(coeff)]
    );
    res.status(201).json({ success: true, message: 'Matière ajoutée ✅', id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Matière déjà existante.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT — SEULEMENT superadmin
router.put('/:id', superAdminOnly, async (req, res) => {
  try {
    const { name, coeff } = req.body;
    await pool.execute(
      'UPDATE subjects SET name=?, coeff=? WHERE id=?',
      [name, parseInt(coeff), req.params.id]
    );
    res.json({ success: true, message: 'Matière modifiée ✅' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE — SEULEMENT superadmin
router.delete('/:id', superAdminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Matière supprimée.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
