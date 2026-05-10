// routes/documents.js — filtré par matière

const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');

router.use(protect);

// GET /api/documents
router.get('/', allRoles, async (req, res) => {
  try {
    let where  = 'WHERE 1=1';
    const params = [];

    // Admin → seulement ses documents (sa matière)
    if (req.user.role === 'admin' && req.user.subjectId) {
      where += ' AND (d.subjectId = ? OR d.subjectId IS NULL)';
      params.push(req.user.subjectId);
    }

    // Étudiant → documents de ses matières
    if (req.user.role === 'etudiant' && req.user.studentId) {
      where += ` AND (d.subjectId IN (
        SELECT DISTINCT subjectId FROM grades WHERE studentId = ?
        UNION
        SELECT DISTINCT subjectId FROM attendance WHERE studentId = ?
      ) OR d.subjectId IS NULL)`;
      params.push(req.user.studentId, req.user.studentId);
    }

    const [documents] = await pool.execute(
      `SELECT d.*, s.name as subjectName
       FROM documents d
       LEFT JOIN subjects s ON d.subjectId = s.id
       ${where}
       ORDER BY d.createdAt DESC`,
      params
    );

    res.json({ success: true, documents });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/documents
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, url, type } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Nom et lien requis.' });
    }

    // Admin → lier automatiquement à sa matière
    const subjectId = req.user.role === 'admin' ? (req.user.subjectId || null) : (req.body.subjectId || null);

    await pool.execute(
      'INSERT INTO documents (name, url, type, subjectId, createdBy) VALUES (?, ?, ?, ?, ?)',
      [name, url, type || 'pdf', subjectId, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Document ajouté ✅' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const [rows] = await pool.execute(
        'SELECT subjectId FROM documents WHERE id = ?',
        [req.params.id]
      );
      if (rows.length && rows[0].subjectId != req.user.subjectId) {
        return res.status(403).json({ success: false, message: 'Accès refusé.' });
      }
    }

    await pool.execute('DELETE FROM documents WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Document supprimé.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
