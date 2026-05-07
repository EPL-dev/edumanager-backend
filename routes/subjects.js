// routes/subjects.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');
router.use(protect);

router.get('/', allRoles, async (req, res) => {
  try {
    const [subjects] = await pool.execute('SELECT * FROM subjects ORDER BY name');
    res.json({ success: true, subjects });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, coeff } = req.body;
    if (!name || !coeff) return res.status(400).json({ success: false, message: 'Nom et coefficient requis.' });
    const [result] = await pool.execute('INSERT INTO subjects (name, coeff) VALUES (?, ?)', [name, coeff]);
    res.status(201).json({ success: true, message: 'Matière ajoutée ✅', id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Matière déjà existante.' });
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, coeff } = req.body;
    await pool.execute('UPDATE subjects SET name=?, coeff=? WHERE id=?', [name, coeff, req.params.id]);
    res.json({ success: true, message: 'Matière modifiée ✅' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Matière supprimée.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
