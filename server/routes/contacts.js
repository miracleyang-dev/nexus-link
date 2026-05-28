const express = require('express');
const router = express.Router();
const db = require('../db');
const { getNextBirthdaySolarDate } = require('../utils/lunar');

// Helper: sync birthday reminder for a contact
function syncBirthdayReminder(contactId) {
  // Delete existing birthday reminders for this contact
  db.prepare('DELETE FROM reminders WHERE contact_id = ?').run(contactId);

  const contact = db.prepare('SELECT id, name, birthday, birthday_type FROM contacts WHERE id = ?').get(contactId);
  if (!contact || !contact.birthday) return;

  const [, month, day] = contact.birthday.split('-').map(Number);
  const result = getNextBirthdaySolarDate(month, day, contact.birthday_type);
  if (!result) return;

  const dateStr = result.solarDate.toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO reminders (contact_id, title, description, remind_date, is_completed)
    VALUES (?, ?, ?, ?, 0)
  `).run(contact.id, `${contact.name}的生日`, `${result.calLabel} ${contact.birthday.slice(5)}`, dateStr);
}

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
      conditions.push(`(c.name LIKE ? OR c.company LIKE ? OR c.notes LIKE ?)`);
      const s = `%${search}%`;
      params.push(s, s, s);
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

// GET /api/contacts/:id - get one with tags, recent interactions, contact methods
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
      SELECT i.* FROM interactions i
      JOIN interaction_contacts ic ON i.id = ic.interaction_id
      WHERE ic.contact_id = ?
      ORDER BY i.date DESC LIMIT 10
    `).all(req.params.id);

    // For each interaction, get all associated contact names
    const enrichedInteractions = interactions.map(i => {
      const contactNames = db.prepare(`
        SELECT c.name FROM contacts c
        JOIN interaction_contacts ic ON c.id = ic.contact_id
        WHERE ic.interaction_id = ?
      `).all(i.id).map(c => c.name);
      return { ...i, contact_names: contactNames };
    });

    const strengthsList = db.prepare(`
      SELECT * FROM contact_strengths WHERE contact_id = ? ORDER BY rating DESC, created_at ASC
    `).all(req.params.id);

    const contactMethods = db.prepare(`
      SELECT * FROM contact_methods WHERE contact_id = ? ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ ...contact, tags, recent_interactions: enrichedInteractions, strengths: strengthsList, contact_methods: contactMethods });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts - create
router.post('/', (req, res) => {
  try {
    const fields = [
      'name', 'avatar_url', 'company', 'position',
      'birthday', 'birthday_type', 'zodiac', 'mbti', 'hometown', 'current_city',
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
    const contactId = info.lastInsertRowid;

    // Save contact methods
    if (req.body.contact_methods && Array.isArray(req.body.contact_methods)) {
      const insertMethod = db.prepare('INSERT INTO contact_methods (contact_id, type, value) VALUES (?, ?, ?)');
      for (const m of req.body.contact_methods) {
        if (m.type && m.value) insertMethod.run(contactId, m.type, m.value);
      }
    }

    // Sync birthday reminder
    if (data.birthday) {
      syncBirthdayReminder(contactId);
    }

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
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
      'name', 'avatar_url', 'company', 'position',
      'birthday', 'birthday_type', 'zodiac', 'mbti', 'hometown', 'current_city',
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
    if (updates.length === 0 && !req.body.contact_methods) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.id = req.params.id;
      db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = @id`).run(params);
    }

    // Replace contact methods if provided
    if (req.body.contact_methods && Array.isArray(req.body.contact_methods)) {
      db.prepare('DELETE FROM contact_methods WHERE contact_id = ?').run(req.params.id);
      const insertMethod = db.prepare('INSERT INTO contact_methods (contact_id, type, value) VALUES (?, ?, ?)');
      for (const m of req.body.contact_methods) {
        if (m.type && m.value) insertMethod.run(req.params.id, m.type, m.value);
      }
    }

    // Sync birthday reminder
    syncBirthdayReminder(req.params.id);

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

// ── Strengths (sub-resource of contacts) ──────────────────────────

// GET /api/contacts/:id/strengths
router.get('/:id/strengths', (req, res) => {
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
router.post('/:id/strengths', (req, res) => {
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

// ── Tags (merged from tags.js) ──────────────────────────────────

// GET /api/tags - list all tags with contact count (mounted at /api/tags by index.js)
const tagsRouter = express.Router();

tagsRouter.get('/', (req, res) => {
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
tagsRouter.post('/', (req, res) => {
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
tagsRouter.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/:id/tags - assign tags to contact (mounted at /api by index.js)
tagsRouter.post('/contacts/:id/tags', (req, res) => {
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

// ── Standalone Strengths routes (mounted at /api by index.js) ────
const strengthsRouter = express.Router();

// PUT /api/strengths/:id - update
strengthsRouter.put('/strengths/:id', (req, res) => {
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
strengthsRouter.delete('/strengths/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM contact_strengths WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Strength not found' });
    res.json({ message: 'Strength deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { contactsRouter: router, strengthsRouter, tagsRouter };
