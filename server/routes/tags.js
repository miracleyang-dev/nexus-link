const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tags - list all tags with contact count
router.get('/', (req, res) => {
  try {
    const tags = db.prepare(`
      SELECT t.*, COUNT(ct.contact_id) as contact_count
      FROM tags t
      LEFT JOIN contact_tags ct ON t.id = ct.tag_id
      GROUP BY t.id
      ORDER BY contact_count DESC
    `).all();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags - create tag
router.post('/', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name is required' });
    const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color || '#3B82F6');
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(tag);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tags/:id - delete tag
router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/:id/tags - assign tags to contact
router.post('/contacts/:id/tags', (req, res) => {
  try {
    const contactId = req.params.id;
    const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contactId);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const { tag_ids } = req.body;
    if (!Array.isArray(tag_ids)) return res.status(400).json({ error: 'tag_ids must be an array' });

    const assign = db.transaction((ids) => {
      db.prepare('DELETE FROM contact_tags WHERE contact_id = ?').run(contactId);
      const insert = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)');
      for (const tagId of ids) {
        insert.run(contactId, tagId);
      }
    });
    assign(tag_ids);

    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN contact_tags ct ON t.id = ct.tag_id
      WHERE ct.contact_id = ?
    `).all(contactId);

    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
