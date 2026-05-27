const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reminders - list all reminders
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
    `;
    if (status === 'pending') query += ' WHERE r.is_completed = 0';
    else if (status === 'completed') query += ' WHERE r.is_completed = 1';
    query += ' ORDER BY r.remind_date ASC';
    const reminders = db.prepare(query).all();
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders/upcoming - upcoming reminders + auto birthday reminders
router.get('/upcoming', (req, res) => {
  try {
    // Manual reminders within next 30 days
    const reminders = db.prepare(`
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
      WHERE r.remind_date BETWEEN date('now', '-7 days') AND date('now', '+30 days')
      ORDER BY r.remind_date ASC
    `).all();

    // Auto-detect upcoming birthdays within 30 days
    const contacts = db.prepare(`
      SELECT id, name, birthday FROM contacts
      WHERE birthday IS NOT NULL AND birthday != ''
    `).all();

    const now = new Date();
    const autoReminders = [];
    for (const c of contacts) {
      const [, month, day] = c.birthday.split('-');
      const thisYear = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day));
      const nextYear = new Date(now.getFullYear() + 1, parseInt(month) - 1, parseInt(day));
      const upcoming = thisYear >= now ? thisYear : nextYear;
      const daysUntil = Math.ceil((upcoming - now) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) {
        autoReminders.push({
          id: null,
          contact_id: c.id,
          contact_name: c.name,
          title: `${c.name}的生日`,
          description: `${c.birthday.slice(5)} 生日`,
          remind_date: upcoming.toISOString().slice(0, 10),
          type: 'birthday',
          is_completed: 0,
          auto: true
        });
      }
    }

    res.json([...reminders, ...autoReminders]);
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

    const reminder = db.prepare(`
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
      WHERE r.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reminders/:id - update
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM reminders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Reminder not found' });

    const { title, description, remind_date, type, is_completed } = req.body;

    if (is_completed !== undefined) {
      db.prepare('UPDATE reminders SET is_completed = ? WHERE id = ?').run(is_completed, req.params.id);
    }
    if (title !== undefined || description !== undefined || remind_date !== undefined || type !== undefined) {
      const fields = [];
      const params = [];
      if (title !== undefined) { fields.push('title = ?'); params.push(title); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (remind_date !== undefined) { fields.push('remind_date = ?'); params.push(remind_date); }
      if (type !== undefined) { fields.push('type = ?'); params.push(type); }
      if (fields.length) {
        params.push(req.params.id);
        db.prepare(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`).run(...params);
      }
    }

    const reminder = db.prepare(`
      SELECT r.*, c.name as contact_name
      FROM reminders r
      LEFT JOIN contacts c ON r.contact_id = c.id
      WHERE r.id = ?
    `).get(req.params.id);

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
