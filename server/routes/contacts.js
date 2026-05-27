const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/contacts - list all, support search/category/tag filters
router.get('/', (req, res) => {
  try {
    const { search, category, tag } = req.query;
    let query = `
      SELECT c.*,
        GROUP_CONCAT(DISTINCT t.name) as tag_names,
        GROUP_CONCAT(DISTINCT t.id) as tag_ids,
        GROUP_CONCAT(DISTINCT t.color) as tag_colors
      FROM contacts c
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
    `;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(c.name LIKE ? OR c.company LIKE ? OR c.notes LIKE ?)`);
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category) {
      conditions.push(`c.category = ?`);
      params.push(category);
    }
    if (tag) {
      conditions.push(`c.id IN (SELECT ct2.contact_id FROM contact_tags ct2 JOIN tags t2 ON ct2.tag_id = t2.id WHERE t2.name = ?)`);
      params.push(tag);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY c.id ORDER BY c.relationship_level DESC, c.updated_at DESC';

    const contacts = db.prepare(query).all(...params);

    // Parse tags into array
    const result = contacts.map(c => {
      const tags = [];
      if (c.tag_names) {
        const names = c.tag_names.split(',');
        const ids = c.tag_ids.split(',');
        const colors = c.tag_colors.split(',');
        for (let i = 0; i < names.length; i++) {
          tags.push({ id: parseInt(ids[i]), name: names[i], color: colors[i] });
        }
      }
      delete c.tag_names;
      delete c.tag_ids;
      delete c.tag_colors;
      return { ...c, tags };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/:id - get single contact with tags and recent interactions
router.get('/:id', (req, res) => {
  try {
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN contact_tags ct ON t.id = ct.tag_id
      WHERE ct.contact_id = ?
    `).all(req.params.id);

    const recent_interactions = db.prepare(`
      SELECT * FROM interactions
      WHERE contact_id = ?
      ORDER BY date DESC
      LIMIT 10
    `).all(req.params.id);

    res.json({ ...contact, tags, recent_interactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts - create
router.post('/', (req, res) => {
  try {
    const { name, avatar_url, phone, email, company, position, birthday, zodiac, mbti, blood_type, hometown, current_city, personality_traits, strengths, preferences, notes, relationship_level, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const info = db.prepare(`
      INSERT INTO contacts (name, avatar_url, phone, email, company, position, birthday, zodiac, mbti, blood_type, hometown, current_city, personality_traits, strengths, preferences, notes, relationship_level, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, avatar_url || null, phone || null, email || null, company || null, position || null, birthday || null, zodiac || null, mbti || null, blood_type || null, hometown || null, current_city || null, personality_traits || null, strengths || null, preferences || null, notes || null, relationship_level || 3, category || 'other');

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contacts/:id - update
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Contact not found' });

    const { name, avatar_url, phone, email, company, position, birthday, zodiac, mbti, blood_type, hometown, current_city, personality_traits, strengths, preferences, notes, relationship_level, category } = req.body;

    db.prepare(`
      UPDATE contacts SET
        name = COALESCE(?, name), avatar_url = ?, phone = ?, email = ?, company = ?, position = ?,
        birthday = ?, zodiac = ?, mbti = ?, blood_type = ?, hometown = ?, current_city = ?,
        personality_traits = ?, strengths = ?, preferences = ?, notes = ?,
        relationship_level = COALESCE(?, relationship_level), category = COALESCE(?, category),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name, avatar_url || null, phone || null, email || null, company || null, position || null, birthday || null, zodiac || null, mbti || null, blood_type || null, hometown || null, current_city || null, personality_traits || null, strengths || null, preferences || null, notes || null, relationship_level, category, req.params.id);

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
