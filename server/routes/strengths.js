// Strength update/delete routes (kept separate because they mount at /api/strengths/:id)
// GET and POST are in contacts.js under /api/contacts/:id/strengths
const express = require('express');
const router = express.Router();
const db = require('../db');

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
