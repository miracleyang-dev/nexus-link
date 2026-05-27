const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/relationships - get all for graph visualization
router.get('/', (req, res) => {
  try {
    const relationships = db.prepare(`
      SELECT r.*, c1.name as contact_name_1, c2.name as contact_name_2
      FROM relationships r
      JOIN contacts c1 ON r.contact_id_1 = c1.id
      JOIN contacts c2 ON r.contact_id_2 = c2.id
    `).all();
    res.json(relationships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/relationships - create
router.post('/', (req, res) => {
  try {
    const { contact_id_1, contact_id_2, relationship_type, strength, notes } = req.body;
    if (!contact_id_1 || !contact_id_2) {
      return res.status(400).json({ error: 'contact_id_1 and contact_id_2 are required' });
    }
    if (contact_id_1 === contact_id_2) {
      return res.status(400).json({ error: 'Cannot create relationship with self' });
    }

    const c1 = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id_1);
    const c2 = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id_2);
    if (!c1 || !c2) return res.status(404).json({ error: 'Contact not found' });

    const info = db.prepare(`
      INSERT INTO relationships (contact_id_1, contact_id_2, relationship_type, strength, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(contact_id_1, contact_id_2, relationship_type || 'friend', strength || 3, notes || null);

    const rel = db.prepare(`
      SELECT r.*, c1.name as contact_name_1, c2.name as contact_name_2
      FROM relationships r
      JOIN contacts c1 ON r.contact_id_1 = c1.id
      JOIN contacts c2 ON r.contact_id_2 = c2.id
      WHERE r.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(rel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/relationships/:id - delete
router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM relationships WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Relationship not found' });
    res.json({ message: 'Relationship deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
