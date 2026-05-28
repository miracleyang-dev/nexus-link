const express = require('express');
const router = express.Router();
const db = require('../db');
const { getNextBirthdaySolarDate } = require('../utils/lunar');

// Helper: roll expired birthday reminders to next year
function rollExpiredBirthdays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Find completed or past-date birthday reminders
  const expired = db.prepare(`
    SELECT r.*, c.birthday, c.birthday_type, c.name
    FROM reminders r
    JOIN contacts c ON r.contact_id = c.id
    WHERE r.remind_date < ? AND r.is_completed = 0
  `).all(todayStr);

  for (const r of expired) {
    if (!r.birthday) continue;
    const [, month, day] = r.birthday.split('-').map(Number);
    const result = getNextBirthdaySolarDate(month, day, r.birthday_type);
    if (!result) continue;

    const newDateStr = result.solarDate.toISOString().split('T')[0];
    // Update the reminder to next occurrence
    db.prepare(`
      UPDATE reminders SET remind_date = ?, is_completed = 0, description = ?
      WHERE id = ?
    `).run(newDateStr, `${result.calLabel} ${r.birthday.slice(5)}`, r.id);
  }
}

// GET /api/reminders - list all birthday reminders
router.get('/', (req, res) => {
  try {
    rollExpiredBirthdays();
    const reminders = db.prepare(`
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
      ORDER BY r.remind_date ASC
    `).all();
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders/upcoming - next 30 days
router.get('/upcoming', (req, res) => {
  try {
    rollExpiredBirthdays();
    const reminders = db.prepare(`
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
      WHERE r.remind_date BETWEEN date('now') AND date('now', '+30 days')
      AND r.is_completed = 0
      ORDER BY r.remind_date ASC
    `).all();
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reminders/:id - update (mark completed etc)
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Reminder not found' });

    const fields = ['is_completed'];
    const updates = [];
    const params = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = @${f}`);
        params[f] = req.body[f];
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.id = req.params.id;
    db.prepare(`UPDATE reminders SET ${updates.join(', ')} WHERE id = @id`).run(params);

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reminders/:id - delete
router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
