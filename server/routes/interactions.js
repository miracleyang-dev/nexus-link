const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/interactions - list all, support ?contact_id filter
router.get('/', (req, res) => {
  try {
    const { contact_id } = req.query;
    let query, params = [];

    if (contact_id) {
      query = `
        SELECT i.*, GROUP_CONCAT(c.name) as contact_names
        FROM interactions i
        JOIN interaction_contacts ic ON i.id = ic.interaction_id
        JOIN contacts c ON ic.contact_id = c.id
        WHERE i.id IN (SELECT interaction_id FROM interaction_contacts WHERE contact_id = ?)
        GROUP BY i.id
        ORDER BY i.date DESC
      `;
      params.push(contact_id);
    } else {
      query = `
        SELECT i.*, GROUP_CONCAT(c.name) as contact_names
        FROM interactions i
        JOIN interaction_contacts ic ON i.id = ic.interaction_id
        JOIN contacts c ON ic.contact_id = c.id
        GROUP BY i.id
        ORDER BY i.date DESC
      `;
    }

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
      SELECT i.*, GROUP_CONCAT(c.name) as contact_names
      FROM interactions i
      JOIN interaction_contacts ic ON i.id = ic.interaction_id
      JOIN contacts c ON ic.contact_id = c.id
      GROUP BY i.id
      ORDER BY i.date DESC
    `).all();

    const grouped = {};
    for (const item of interactions) {
      const month = item.date.substring(0, 7);
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

// POST /api/interactions - create (supports multiple contact_ids)
router.post('/', (req, res) => {
  try {
    const { contact_ids, type, title, content, location, date, mood } = req.body;
    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({ error: 'contact_ids array is required' });
    }
    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    // Validate all contacts exist
    for (const cid of contact_ids) {
      const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(cid);
      if (!contact) return res.status(404).json({ error: `Contact ${cid} not found` });
    }

    // Check record start date
    const startDateRow = db.prepare("SELECT value FROM settings WHERE key = 'record_start_date'").get();
    if (startDateRow && date < startDateRow.value) {
      return res.status(400).json({ error: `日期不能早于记录起始日期 (${startDateRow.value})` });
    }

    const info = db.prepare(`
      INSERT INTO interactions (type, title, content, location, date, mood)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type || 'other', title, content || null, location || null, date, mood || 3);

    const interactionId = info.lastInsertRowid;
    const insertIC = db.prepare('INSERT INTO interaction_contacts (interaction_id, contact_id) VALUES (?, ?)');
    for (const cid of contact_ids) {
      insertIC.run(interactionId, cid);
    }

    const interaction = db.prepare('SELECT * FROM interactions WHERE id = ?').get(interactionId);
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
