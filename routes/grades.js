// routes/grades.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');
router.use(protect);

// GET /api/grades
router.get('/', allRoles, async (req, res) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'etudiant' && req.user.studentId) {
      where += ' AND g.studentId = ?'; params.push(req.user.studentId);
    } else {
      if (req.query.student) { where += ' AND g.studentId = ?'; params.push(req.query.student); }
    }
    if (req.query.subject)  { where += ' AND g.subjectId = ?'; params.push(req.query.subject); }
    if (req.query.semester) { where += ' AND g.semester = ?';  params.push(req.query.semester); }

    const [grades] = await pool.execute(
      `SELECT g.*, s.nom, s.prenom, s.matricule, m.name as subjectName, m.coeff
       FROM grades g
       JOIN students s ON g.studentId = s.id
       JOIN subjects m ON g.subjectId = m.id
       ${where} ORDER BY g.createdAt DESC`,
      params
    );
    res.json({ success: true, grades });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

// GET /api/grades/ranking
router.get('/ranking', allRoles, async (req, res) => {
  try {
    const [ranking] = await pool.execute(
      `SELECT s.id, s.nom, s.prenom,
              SUM(g.value * m.coeff) / SUM(m.coeff) as average
       FROM grades g
       JOIN students s ON g.studentId = s.id
       JOIN subjects m ON g.subjectId = m.id
       GROUP BY s.id, s.nom, s.prenom
       ORDER BY average DESC`
    );
    res.json({ success: true, ranking });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

// POST /api/grades
router.post('/', adminOnly, async (req, res) => {
  try {
    const { studentId, subjectId, value, semester } = req.body;
    if (!studentId || !subjectId || value === undefined || !semester) {
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
    }
    if (value < 0 || value > 20) {
      return res.status(400).json({ success: false, message: 'Note invalide (0-20).' });
    }

    // Upsert : si note existe déjà pour ce triplet, on met à jour
    await pool.execute(
      `INSERT INTO grades (studentId, subjectId, value, semester)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [studentId, subjectId, value, semester]
    );

    res.status(201).json({ success: true, message: 'Note enregistrée ✅' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/grades/:id
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { value, semester } = req.body;
    await pool.execute('UPDATE grades SET value=?, semester=? WHERE id=?', [value, semester, req.params.id]);
    res.json({ success: true, message: 'Note modifiée ✅' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/grades/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM grades WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Note supprimée.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
