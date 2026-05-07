// routes/documents.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');
router.use(protect);

router.get('/', allRoles, async (req, res) => {
  try {
    const [docs] = await pool.execute('SELECT * FROM documents ORDER BY createdAt DESC');
    res.json({ success: true, documents: docs });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, url, type } = req.body;
    if (!name || !url) return res.status(400).json({ success: false, message: 'Nom et lien requis.' });
    await pool.execute('INSERT INTO documents (name, url, type, createdBy) VALUES (?, ?, ?, ?)', [name, url, type || 'pdf', req.user.id]);
    res.status(201).json({ success: true, message: 'Document ajouté ✅' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM documents WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Document supprimé.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
