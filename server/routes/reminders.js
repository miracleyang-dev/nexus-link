const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reminders - list all, support ?upcoming=N (next N days)
router.get('/', (req, res) => {
  try {
    const { upcoming } = req.query;
    let query = `
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
    `;
    const params = [];
    if (upcoming) {
      query += ` WHERE r.remind_date BETWEEN date('now') AND date('now', '+' || ? || ' days')`;
      params.push(upcoming);
    }
    query += ' ORDER BY r.remind_date ASC';
    const reminders = db.prepare(query).all(...params);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders/upcoming - next 30 days including auto-generated birthday reminders
router.get('/upcoming', (req, res) => {
  try {
    // Manual reminders in next 30 days
    const manualReminders = db.prepare(`
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
      WHERE r.remind_date BETWEEN date('now') AND date('now', '+30 days')
      AND r.is_completed = 0
      ORDER BY r.remind_date ASC
    `).all();

    // Auto-generate birthday reminders from contacts
    const contacts = db.prepare(`SELECT id, name, birthday FROM contacts WHERE birthday IS NOT NULL`).all();
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const birthdayReminders = [];
    for (const c of contacts) {
      if (!c.birthday) continue;
      const [, month, day] = c.birthday.split('-');
      const thisYearBirthday = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
      }
      if (thisYearBirthday >= today && thisYearBirthday <= thirtyDaysLater) {
        const dateStr = thisYearBirthday.toISOString().split('T')[0];
        // Check if manual birthday reminder already exists for this contact around this date
        const exists = manualReminders.some(r => r.contact_id === c.id && r.type === 'birthday');
        if (!exists) {
          birthdayReminders.push({
            id: null,
            contact_id: c.id,
            contact_name: c.name,
            title: `${c.name}的生日`,
            description: '自动生成的生日提醒',
            remind_date: dateStr,
            type: 'birthday',
            is_completed: 0,
            auto_generated: true
          });
        }
      }
    }

    const all = [...manualReminders, ...birthdayReminders].sort((a, b) =>
      a.remind_date.localeCompare(b.remind_date)
    );

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reminders - create
router.post('/', (req, res) => {
  try {
    const { contact_id, title, description, remind_date, type } = req.body;
    if (!title || !remind_date) {
      return res.status(400).json({ error: 'title and remind_date are required' });
    }
    const info = db.prepare(`
      INSERT INTO reminders (contact_id, title, description, remind_date, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(contact_id || null, title, description || null, remind_date, type || 'custom');

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reminders/:id - update
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Reminder not found' });

    const fields = ['contact_id', 'title', 'description', 'remind_date', 'type', 'is_completed'];
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
