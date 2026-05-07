// routes/attendance.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');
router.use(protect);

// GET /api/attendance
router.get('/', allRoles, async (req, res) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'etudiant' && req.user.studentId) {
      where += ' AND a.studentId = ?'; params.push(req.user.studentId);
    } else {
      if (req.query.student) { where += ' AND a.studentId = ?'; params.push(req.query.student); }
    }
    if (req.query.subject) { where += ' AND a.subjectId = ?'; params.push(req.query.subject); }
    if (req.query.date)    { where += ' AND a.date = ?';      params.push(req.query.date); }

    const [records] = await pool.execute(
      `SELECT a.*, s.nom, s.prenom, s.matricule, m.name as subjectName
       FROM attendance a
       JOIN students s ON a.studentId = s.id
       JOIN subjects m ON a.subjectId = m.id
       ${where} ORDER BY a.date DESC, a.createdAt DESC`,
      params
    );
    res.json({ success: true, records });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

// POST /api/attendance/session — Enregistrer une séance entière
router.post('/session', adminOnly, async (req, res) => {
  try {
    const { subjectId, date, records } = req.body;
    if (!subjectId || !date || !records?.length) {
      return res.status(400).json({ success: false, message: 'Données de séance incomplètes.' });
    }

    // Supprimer les enregistrements existants pour cette séance
    await pool.execute('DELETE FROM attendance WHERE subjectId = ? AND date = ?', [subjectId, date]);

    // Insérer les nouveaux
    for (const r of records) {
      await pool.execute(
        'INSERT INTO attendance (studentId, subjectId, date, status) VALUES (?, ?, ?, ?)',
        [r.studentId, subjectId, date, r.status]
      );
    }

    res.status(201).json({ success: true, message: `Séance enregistrée — ${records.length} étudiants ✅` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/attendance/:id
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.execute('UPDATE attendance SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true, message: 'Présence modifiée.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
