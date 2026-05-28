const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/interactions - list all, support ?contact_id filter
router.get('/', (req, res) => {
  try {
    const { contact_id } = req.query;
    let query = `
      SELECT i.*, c.name as contact_name
      FROM interactions i
      JOIN contacts c ON i.contact_id = c.id
    `;
    const params = [];
    if (contact_id) {
      query += ' WHERE i.contact_id = ?';
      params.push(contact_id);
    }
    query += ' ORDER BY i.date DESC';
    const interactions = db.prepare(query).all(...params);
    res.json(interactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/interactions/timeline - grouped by month
router.get('/timeline', (req, res) => {
  try {
    const interactions = db.prepare(`
      SELECT i.*, c.name as contact_name
      FROM interactions i
      JOIN contacts c ON i.contact_id = c.id
      ORDER BY i.date DESC
    `).all();

    const grouped = {};
    for (const item of interactions) {
      const month = item.date.substring(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(item);
    }

    const timeline = Object.entries(grouped).map(([month, items]) => ({
      month,
      count: items.length,
      interactions: items
    }));

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/interactions - create
router.post('/', (req, res) => {
  try {
    const { contact_id, type, title, content, location, date, mood } = req.body;
    if (!contact_id || !title || !date) {
      return res.status(400).json({ error: 'contact_id, title, and date are required' });
    }
    const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Check record start date
    const startDateRow = db.prepare("SELECT value FROM settings WHERE key = 'record_start_date'").get();
    if (startDateRow && date < startDateRow.value) {
      return res.status(400).json({ error: `日期不能早于记录起始日期 (${startDateRow.value})` });
    }

    const info = db.prepare(`
      INSERT INTO interactions (contact_id, type, title, content, location, date, mood)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(contact_id, type || 'other', title, content || null, location || null, date, mood || 3);

    const interaction = db.prepare('SELECT * FROM interactions WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(interaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/interactions/:id - delete
router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM interactions WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Interaction not found' });
    res.json({ message: 'Interaction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
