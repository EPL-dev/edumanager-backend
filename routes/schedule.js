// routes/schedule.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly, allRoles } = require('../middleware/auth');
router.use(protect);

router.get('/', allRoles, async (req, res) => {
  try {
    const [schedule] = await pool.execute(
      `SELECT sc.*, s.name as subjectName, s.coeff
       FROM schedule sc JOIN subjects s ON sc.subjectId = s.id
       ORDER BY FIELD(day,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), startTime`
    );
    res.json({ success: true, schedule });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { subjectId, day, startTime, endTime } = req.body;
    if (!subjectId || !day || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Tous les champs requis.' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'Heure de début invalide.' });
    }
    await pool.execute('INSERT INTO schedule (subjectId, day, startTime, endTime) VALUES (?, ?, ?, ?)', [subjectId, day, startTime, endTime]);
    res.status(201).json({ success: true, message: 'Cours ajouté ✅' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM schedule WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Cours supprimé.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

module.exports = router;
