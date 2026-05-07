// routes/dashboard.js — Statistiques globales
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const { protect, allRoles } = require('../middleware/auth');
router.use(protect);

router.get('/stats', allRoles, async (req, res) => {
  try {
    // Statistiques de base
    const [[{ totalStudents }]] = await pool.execute('SELECT COUNT(*) as totalStudents FROM students');
    const [[{ totalSubjects }]] = await pool.execute('SELECT COUNT(*) as totalSubjects FROM subjects');
    const [[{ totalPresent, totalAtt }]] = await pool.execute(
      `SELECT SUM(status='present') as totalPresent, COUNT(*) as totalAtt FROM attendance`
    );
    const [[{ classAvg }]] = await pool.execute('SELECT AVG(value) as classAvg FROM grades');

    // Taux de présence
    const presenceRate = totalAtt > 0 ? Math.round(totalPresent / totalAtt * 100) : null;

    // Alertes absences (≥ 3 absences)
    const [absenceAlerts] = await pool.execute(
      `SELECT s.id, s.nom, s.prenom, COUNT(*) as absences
       FROM attendance a JOIN students s ON a.studentId = s.id
       WHERE a.status = 'absent'
       GROUP BY s.id, s.nom, s.prenom
       HAVING absences >= 3
       ORDER BY absences DESC`
    );

    // Annonces récentes
    const [recentAnnouncements] = await pool.execute(
      `SELECT a.*, u.nom as createdByNom FROM announcements a
       LEFT JOIN users u ON a.createdBy = u.id
       ORDER BY a.createdAt DESC LIMIT 5`
    );

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalSubjects,
        presenceRate,
        classAvg: classAvg ? parseFloat(classAvg).toFixed(2) : null,
        absenceAlerts,
        recentAnnouncements,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
