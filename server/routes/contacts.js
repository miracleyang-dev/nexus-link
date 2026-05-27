const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/contacts - list all with tags, support filters
router.get('/', (req, res) => {
  try {
    const { search, category, tag } = req.query;
    let query = `
      SELECT c.*, GROUP_CONCAT(DISTINCT t.id || ':' || t.name || ':' || t.color) as tag_list
      FROM contacts c
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
    `;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.notes LIKE ?)`);
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (category) {
      conditions.push(`c.category = ?`);
      params.push(category);
    }
    if (tag) {
      conditions.push(`c.id IN (SELECT contact_id FROM contact_tags ct2 JOIN tags t2 ON ct2.tag_id = t2.id WHERE t2.name = ?)`);
      params.push(tag);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' GROUP BY c.id ORDER BY c.updated_at DESC';

    const contacts = db.prepare(query).all(...params);

    const result = contacts.map(c => ({
      ...c,
      tags: c.tag_list
        ? c.tag_list.split(',').map(t => {
            const [id, name, color] = t.split(':');
            return { id: Number(id), name, color };
          })
        : [],
      tag_list: undefined
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/:id - get one with tags and recent interactions
router.get('/:id', (req, res) => {
  try {
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN contact_tags ct ON t.id = ct.tag_id
      WHERE ct.contact_id = ?
    `).all(req.params.id);

    const interactions = db.prepare(`
      SELECT * FROM interactions WHERE contact_id = ? ORDER BY date DESC LIMIT 10
    `).all(req.params.id);

    res.json({ ...contact, tags, recent_interactions: interactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts - create
router.post('/', (req, res) => {
  try {
    const fields = [
      'name', 'avatar_url', 'phone', 'email', 'company', 'position',
      'birthday', 'birthday_type', 'zodiac', 'mbti', 'blood_type', 'hometown', 'current_city',
      'personality_traits', 'strengths', 'preferences', 'notes',
      'relationship_level', 'category'
    ];
    const data = {};
    for (const f of fields) {
      data[f] = req.body[f] !== undefined ? req.body[f] : null;
    }
    if (!data.name) return res.status(400).json({ error: 'Name is required' });

    const cols = fields.filter(f => data[f] !== null);
    const placeholders = cols.map(c => '@' + c).join(', ');
    const stmt = db.prepare(`INSERT INTO contacts (${cols.join(', ')}) VALUES (${placeholders})`);
    const info = stmt.run(data);

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contacts/:id - update
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Contact not found' });

    const fields = [
      'name', 'avatar_url', 'phone', 'email', 'company', 'position',
      'birthday', 'birthday_type', 'zodiac', 'mbti', 'blood_type', 'hometown', 'current_city',
      'personality_traits', 'strengths', 'preferences', 'notes',
      'relationship_level', 'category'
    ];
    const updates = [];
    const params = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = @${f}`);
        params[f] = req.body[f];
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push("updated_at = datetime('now')");
    params.id = req.params.id;

    db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = @id`).run(params);
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id - delete
router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
