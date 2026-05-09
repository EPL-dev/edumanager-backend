// routes/attendance.js — filtré par matière admin

const express    = require('express');
const router     = express.Router();
const { pool }   = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');

router.use(protect);

// GET /api/attendance
router.get('/', allRoles, async (req, res) => {
  try {
    let where  = 'WHERE 1=1';
    const params = [];

    // Étudiant → ses propres présences
    if (req.user.role === 'etudiant' && req.user.studentId) {
      where += ' AND a.studentId = ?';
      params.push(req.user.studentId);
    }

    // Admin → seulement sa matière
    if (req.user.role === 'admin' && req.user.subjectId) {
      where += ' AND a.subjectId = ?';
      params.push(req.user.subjectId);
    }

    if (req.query.subject && req.user.role === 'superadmin') {
      where += ' AND a.subjectId = ?';
      params.push(req.query.subject);
    }
    if (req.query.date) {
      where += ' AND DATE(a.date) = ?';
      params.push(req.query.date);
    }

    const [records] = await pool.execute(
      `SELECT a.*, s.nom, s.prenom, s.matricule, m.name as subjectName
       FROM attendance a
       JOIN students s ON a.studentId = s.id
       JOIN subjects m ON a.subjectId = m.id
       ${where} ORDER BY a.date DESC`,
      params
    );

    res.json({ success: true, records });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/attendance/session
router.post('/session', adminOnly, async (req, res) => {
  try {
    const { subjectId, date, records } = req.body;

    if (!subjectId || !date || !records?.length) {
      return res.status(400).json({ success: false, message: 'Données incomplètes.' });
    }

    // Admin → peut seulement enregistrer dans SA matière
    if (req.user.role === 'admin' && req.user.subjectId && req.user.subjectId != subjectId) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez gérer que votre matière assignée.' });
    }

    await pool.execute(
      'DELETE FROM attendance WHERE subjectId = ? AND DATE(date) = ?',
      [subjectId, date]
    );

    for (const r of records) {
      await pool.execute(
        'INSERT INTO attendance (studentId, subjectId, date, status) VALUES (?, ?, ?, ?)',
        [r.studentId, subjectId, date, r.status]
      );
    }

    res.status(201).json({
      success: true,
      message: `Séance enregistrée — ${records.length} étudiants ✅`,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/attendance/:id
router.put('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE attendance SET status=? WHERE id=?',
      [req.body.status, req.params.id]
    );
    res.json({ success: true, message: 'Présence modifiée.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// DELETE /api/attendance/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Présence supprimée.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
         
