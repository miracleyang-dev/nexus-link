const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/settings - return all settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/record-start-date
// Sets the global record start date and physically deletes all data before it.
router.put('/record-start-date', (req, res) => {
  try {
    const { date } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Run deletions inside a transaction for atomicity
    const purge = db.transaction(() => {
      // 1. Delete interactions with date before start date
      const delInteractions = db.prepare('DELETE FROM interactions WHERE date < ?').run(date);

      // 2. Delete reminders with remind_date before start date
      const delReminders = db.prepare('DELETE FROM reminders WHERE remind_date < ?').run(date);

      // 3. Save the setting (upsert)
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('record_start_date', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(date);

      return {
        deleted_interactions: delInteractions.changes,
        deleted_reminders: delReminders.changes,
      };
    });

    const result = purge();

    res.json({
      record_start_date: date,
      purged: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/record-start-date - clear the start date restriction
router.delete('/record-start-date', (req, res) => {
  try {
    db.prepare("DELETE FROM settings WHERE key = 'record_start_date'").run();
    res.json({ message: 'Record start date cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
