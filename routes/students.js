// routes/students.js

const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');

router.use(protect);

// GET /api/students
router.get('/', allRoles, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const q = req.query.q || '';

    let where = '';
    let params = [];

    if (q) {
      where = 'WHERE nom LIKE ? OR prenom LIKE ? OR matricule LIKE ?';
      params = [`%${q}%`, `%${q}%`, `%${q}%`];
    }

    const [students] = await pool.execute(
      `SELECT * FROM students ${where} ORDER BY nom, prenom LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM students ${where}`, params
    );

    const total = countRows[0].total;
    res.json({ success: true, students, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

// GET /api/students/:id
router.get('/:id', allRoles, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Étudiant introuvable.' });
    res.json({ success: true, student: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
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
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/students/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Étudiant supprimé.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
