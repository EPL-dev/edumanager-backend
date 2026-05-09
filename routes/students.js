// routes/students.js — avec filtrage par matière admin

const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');

router.use(protect);

// Fonction utilitaire : récupérer la matière de l'admin connecté
async function getAdminSubjectId(user) {
  if (user.role === 'superadmin') return null; // superadmin voit tout
  if (user.role === 'admin' && user.subjectId) return user.subjectId;
  return null;
}

// GET /api/students
router.get('/', allRoles, async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const q      = req.query.q || '';

    let where  = 'WHERE 1=1';
    let params = [];

    // Recherche par nom/matricule
    if (q) {
      where += ' AND (s.nom LIKE ? OR s.prenom LIKE ? OR s.matricule LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // Si admin avec matière assignée → filtrer les étudiants qui ont des notes/présences dans cette matière
    const adminSubjectId = await getAdminSubjectId(req.user);
    if (adminSubjectId) {
      where += ` AND s.id IN (
        SELECT DISTINCT studentId FROM grades WHERE subjectId = ?
        UNION
        SELECT DISTINCT studentId FROM attendance WHERE subjectId = ?
      )`;
      params.push(adminSubjectId, adminSubjectId);
    }

    const [students] = await pool.execute(
      `SELECT s.* FROM students s ${where} ORDER BY s.nom, s.prenom LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM students s ${where}`,
      params
    );

    res.json({
      success:  true,
      students,
      total:    countRows[0].total,
      page,
      pages:    Math.ceil(countRows[0].total / limit),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// GET /api/students/:id
router.get('/:id', allRoles, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Étudiant introuvable.' });
    res.json({ success: true, student: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/students
router.post('/', adminOnly, async (req, res) => {
  try {
    const { matricule, nom, prenom, sexe } = req.body;
    if (!matricule || !nom || !prenom || !sexe) {
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
    }
    const [result] = await pool.execute(
      'INSERT INTO students (matricule, nom, prenom, sexe) VALUES (?, ?, ?, ?)',
      [matricule.toUpperCase(), nom, prenom, sexe]
    );
    res.status(201).json({ success: true, message: 'Étudiant ajouté ✅', id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Matricule déjà utilisé.' });
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/students/:id
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { matricule, nom, prenom, sexe } = req.body;
    await pool.execute(
      'UPDATE students SET matricule=?, nom=?, prenom=?, sexe=? WHERE id=?',
      [matricule.toUpperCase(), nom, prenom, sexe, req.params.id]
    );
    res.json({ success: true, message: 'Étudiant modifié ✅' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/students/:id
// Si admin → supprimer seulement notes+présences dans SA matière
// Si superadmin → supprimer complètement l'étudiant
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const studentId      = req.params.id;
    const adminSubjectId = await getAdminSubjectId(req.user);

    if (adminSubjectId) {
      // Admin → supprimer seulement les données dans sa matière
      await pool.execute(
        'DELETE FROM grades WHERE studentId = ? AND subjectId = ?',
        [studentId, adminSubjectId]
      );
      await pool.execute(
        'DELETE FROM attendance WHERE studentId = ? AND subjectId = ?',
        [studentId, adminSubjectId]
      );
      res.json({
        success: true,
        message: 'Notes et présences de l\'étudiant supprimées dans votre matière. L\'étudiant reste dans la liste générale.',
      });
    } else {
      // Superadmin → supprimer complètement
      await pool.execute('DELETE FROM grades WHERE studentId = ?',     [studentId]);
      await pool.execute('DELETE FROM attendance WHERE studentId = ?', [studentId]);
      await pool.execute('DELETE FROM students WHERE id = ?',          [studentId]);
      res.json({ success: true, message: 'Étudiant supprimé complètement.' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
    
