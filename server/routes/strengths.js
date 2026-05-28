const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/contacts/:id/strengths
router.get('/contacts/:id/strengths', (req, res) => {
  try {
    const strengths = db.prepare(
      'SELECT * FROM contact_strengths WHERE contact_id = ? ORDER BY rating DESC, created_at ASC'
    ).all(req.params.id);
    res.json(strengths);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/:id/strengths - add (max 2 per contact)
router.post('/contacts/:id/strengths', (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const { content, rating, progress } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const existing = db.prepare('SELECT COUNT(*) as cnt FROM contact_strengths WHERE contact_id = ?').get(contactId);
    if (existing.cnt >= 2) {
      return res.status(400).json({ error: '每人最多 2 项优点' });
    }

    const info = db.prepare(`
      INSERT INTO contact_strengths (contact_id, content, rating, progress)
      VALUES (?, ?, ?, ?)
    `).run(contactId, content.trim(), rating || 3, progress || 'learning');

    const strength = db.prepare('SELECT * FROM contact_strengths WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(strength);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/strengths/:id - update
router.put('/strengths/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM contact_strengths WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Strength not found' });

    const fields = ['content', 'rating', 'progress'];
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
    db.prepare(`UPDATE contact_strengths SET ${updates.join(', ')} WHERE id = @id`).run(params);

    const strength = db.prepare('SELECT * FROM contact_strengths WHERE id = ?').get(req.params.id);
    res.json(strength);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/strengths/:id
router.delete('/strengths/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM contact_strengths WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Strength not found' });
    res.json({ message: 'Strength deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
