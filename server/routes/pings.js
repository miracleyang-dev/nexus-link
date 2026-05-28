const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/pings?days=7 - get pings for recent N days (default 7)
router.get('/', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const pings = db.prepare(`
      SELECT p.date, p.contact_id, c.name as contact_name, c.category
      FROM online_pings p
      JOIN contacts c ON p.contact_id = c.id
      WHERE p.date >= date('now', '-' || ? || ' days')
      ORDER BY p.date DESC, c.name ASC
    `).all(days);

    // Group by date
    const grouped = {};
    for (const p of pings) {
      if (!grouped[p.date]) grouped[p.date] = [];
      grouped[p.date].push(p);
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pings - add a ping (idempotent: same day+contact = no-op)
router.post('/', (req, res) => {
  try {
    const { date, contact_id } = req.body;
    if (!date || !contact_id) {
      return res.status(400).json({ error: 'date and contact_id are required' });
    }
    const contact = db.prepare('SELECT id, name FROM contacts WHERE id = ?').get(contact_id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    db.prepare('INSERT OR IGNORE INTO online_pings (date, contact_id) VALUES (?, ?)').run(date, contact_id);
    res.status(201).json({ date, contact_id, contact_name: contact.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pings?date=YYYY-MM-DD&contact_id=N - remove a ping
router.delete('/', (req, res) => {
  try {
    const { date, contact_id } = req.query;
    if (!date || !contact_id) {
      return res.status(400).json({ error: 'date and contact_id query params are required' });
    }
    const info = db.prepare('DELETE FROM online_pings WHERE date = ? AND contact_id = ?').run(date, contact_id);
    if (info.changes === 0) return res.status(404).json({ error: 'Ping not found' });
    res.json({ message: 'Ping removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
