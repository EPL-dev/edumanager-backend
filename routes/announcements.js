// routes/announcements.js — filtré par matière

const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');

router.use(protect);

// GET /api/announcements
router.get('/', allRoles, async (req, res) => {
  try {
    let where  = 'WHERE 1=1';
    const params = [];

    // Admin → seulement ses annonces (sa matière)
    if (req.user.role === 'admin' && req.user.subjectId) {
      where += ' AND (a.subjectId = ? OR a.subjectId IS NULL)';
      params.push(req.user.subjectId);
    }

    // Étudiant → annonces de toutes ses matières
    if (req.user.role === 'etudiant' && req.user.studentId) {
      where += ` AND (a.subjectId IN (
        SELECT DISTINCT subjectId FROM grades WHERE studentId = ?
        UNION
        SELECT DISTINCT subjectId FROM attendance WHERE studentId = ?
      ) OR a.subjectId IS NULL)`;
      params.push(req.user.studentId, req.user.studentId);
    }

    const [announcements] = await pool.execute(
      `SELECT a.*, u.nom as createdByNom, s.name as subjectName
       FROM announcements a
       LEFT JOIN users u ON a.createdBy = u.id
       LEFT JOIN subjects s ON a.subjectId = s.id
       ${where}
       ORDER BY a.createdAt DESC`,
      params
    );

    res.json({ success: true, announcements });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/announcements
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Titre et message requis.' });
    }

    // Admin → lier automatiquement à sa matière
    const subjectId = req.user.role === 'admin' ? (req.user.subjectId || null) : (req.body.subjectId || null);

    await pool.execute(
      'INSERT INTO announcements (title, body, subjectId, createdBy) VALUES (?, ?, ?, ?)',
      [title, body, subjectId, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Annonce publiée ✅' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    // Admin → peut supprimer seulement ses propres annonces
    if (req.user.role === 'admin') {
      const [rows] = await pool.execute(
        'SELECT subjectId FROM announcements WHERE id = ?',
        [req.params.id]
      );
      if (rows.length && rows[0].subjectId != req.user.subjectId) {
        return res.status(403).json({ success: false, message: 'Accès refusé.' });
      }
    }

    await pool.execute('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Annonce supprimée.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
  
