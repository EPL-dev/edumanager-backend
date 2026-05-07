// routes/announcements.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');
router.use(protect);

router.get('/', allRoles, async (req, res) => {
  try {
    const [anns] = await pool.execute(
      `SELECT a.*, u.nom as createdByNom FROM announcements a
       LEFT JOIN users u ON a.createdBy = u.id ORDER BY a.createdAt DESC`
    );
    res.json({ success: true, announcements: anns });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'Titre et message requis.' });
    await pool.execute('INSERT INTO announcements (title, body, createdBy) VALUES (?, ?, ?)', [title, body, req.user.id]);
    res.status(201).json({ success: true, message: 'Annonce publiée ✅' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Annonce supprimée.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
