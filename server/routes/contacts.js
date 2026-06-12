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

  db.prepare(`
    INSERT INTO reminders (contact_id, title, description, remind_date, is_completed)
    VALUES (?, ?, ?, ?, 0)
  `).run(contact.id, `${contact.name}的生日`, `${result.calLabel} ${contact.birthday.slice(5)}`, result.dateStr);
}

// Helper: purge interactions / online pings for a contact that occurred before startDate.
// - Online pings are per-contact, so just delete them.
// - Interactions are shared via interaction_contacts; we only unlink this contact,
//   then sweep interactions that have no remaining links.
// Returns { pings, interactions } — counts of records actually removed.
function purgeRecordsBefore(contactId, startDate) {
  if (!startDate) return { pings: 0, interactions: 0 };
  const tx = db.transaction(() => {
    const pingInfo = db.prepare(
      'DELETE FROM online_pings WHERE contact_id = ? AND date < ?'
    ).run(contactId, startDate);

    db.prepare(`
      DELETE FROM interaction_contacts
      WHERE contact_id = ?
        AND interaction_id IN (SELECT id FROM interactions WHERE date < ?)
    `).run(contactId, startDate);

    const interInfo = db.prepare(`
      DELETE FROM interactions
      WHERE id NOT IN (SELECT DISTINCT interaction_id FROM interaction_contacts)
    `).run();

    return { pings: pingInfo.changes, interactions: interInfo.changes };
  });
  return tx();
}

// GET /api/contacts - list all with tags, support filters
router.get('/', (req, res) => {
  try {
    const { search, category, tag } = req.query;
    let query = `
      SELECT c.*, li.last_interaction
      FROM contacts c
      LEFT JOIN (
        SELECT ic.contact_id, MAX(i.date) AS last_interaction
        FROM interaction_contacts ic
        JOIN interactions i ON i.id = ic.interaction_id
        GROUP BY ic.contact_id
      ) li ON li.contact_id = c.id
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
    query += ' GROUP BY c.id ORDER BY c.relationship_level DESC, li.last_interaction DESC, c.updated_at DESC';

    const contacts = db.prepare(query).all(...params);

    const result = contacts.map(c => {
      // Fetch strengths preview for card display
      const strengths = db.prepare(
        'SELECT content, rating FROM contact_strengths WHERE contact_id = ? ORDER BY rating DESC LIMIT 2'
      ).all(c.id);

      // Load tags per-contact to avoid delimiter/parsing issues
      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN contact_tags ct ON t.id = ct.tag_id
        WHERE ct.contact_id = ?
      `).all(c.id);

      return {
        ...c,
        strengths_preview: strengths,
        tags: tags || []
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/contacts/:id - get one with tags, recent interactions, contact methods
router.get('/:id', (req, res) => {
  try {
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    if (!contact) return res.status(404).json({ error: '联系人未找到' });

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

    // Batch-fetch all associated contact names in a single query
    let enrichedInteractions = interactions;
    if (interactions.length > 0) {
      const placeholders = interactions.map(() => '?').join(',');
      const nameRows = db.prepare(`
        SELECT ic.interaction_id, GROUP_CONCAT(c.name) as names
        FROM interaction_contacts ic
        JOIN contacts c ON c.id = ic.contact_id
        WHERE ic.interaction_id IN (${placeholders})
        GROUP BY ic.interaction_id
      `).all(...interactions.map(i => i.id));
      const nameMap = new Map(nameRows.map(r => [r.interaction_id, r.names ? r.names.split(',') : []]));
      enrichedInteractions = interactions.map(i => ({ ...i, contact_names: nameMap.get(i.id) || [] }));
    }

    const strengthsList = db.prepare(`
      SELECT * FROM contact_strengths WHERE contact_id = ? ORDER BY rating DESC, created_at ASC
    `).all(req.params.id);

    const contactMethods = db.prepare(`
      SELECT * FROM contact_methods WHERE contact_id = ? ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ ...contact, tags, recent_interactions: enrichedInteractions, strengths: strengthsList, contact_methods: contactMethods });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/contacts - create
router.post('/', (req, res) => {
  try {
    const fields = [
      'name', 'avatar_url', 'company', 'position',
      'birthday', 'birthday_type', 'zodiac', 'mbti', 'hometown', 'current_city',
      'personality_traits', 'strengths', 'preferences', 'notes',
      'relationship_level', 'category', 'record_start_date'
    ];
    const data = {};
    for (const f of fields) {
      data[f] = req.body[f] !== undefined ? req.body[f] : null;
    }
    if (!data.name) return res.status(400).json({ error: '姓名为必填项' });

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

    // Auto-purge records older than record_start_date (no-op for fresh contact)
    if (data.record_start_date) {
      purgeRecordsBefore(contactId, data.record_start_date);
    }

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
    res.status(201).json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
      'relationship_level', 'category', 'record_start_date'
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
      return res.status(400).json({ error: '没有要更新的字段' });
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

    // Auto-purge records older than record_start_date when it is set (or updated).
    // Only triggers when the caller actually included record_start_date in the payload
    // AND the value is a non-empty date string — clearing it does nothing destructive.
    if (Object.prototype.hasOwnProperty.call(req.body, 'record_start_date') && req.body.record_start_date) {
      purgeRecordsBefore(req.params.id, req.body.record_start_date);
    }

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    res.json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/contacts/:id - delete
router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: '联系人未找到' });
    res.json({ message: '联系人已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/contacts/:id/tags - assign tags to contact
router.post('/:id/tags', (req, res) => {
  try {
    const contactId = req.params.id;
    const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contactId);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const { tag_ids } = req.body;
    if (!Array.isArray(tag_ids)) return res.status(400).json({ error: 'tag_ids 必须为数组' });

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
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
    `).all();

    let order = [];
    const orderRow = db.prepare("SELECT value FROM settings WHERE key = 'tag_order'").get();
    if (orderRow && orderRow.value) {
      try { order = JSON.parse(orderRow.value); } catch { order = []; }
    }

    if (Array.isArray(order) && order.length) {
      const index = new Map(order.map((id, i) => [Number(id), i]));
      tags.sort((a, b) => {
        const ai = index.has(a.id) ? index.get(a.id) : Number.POSITIVE_INFINITY;
        const bi = index.has(b.id) ? index.get(b.id) : Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
        if ((a.contact_count || 0) !== (b.contact_count || 0)) return (b.contact_count || 0) - (a.contact_count || 0);
        return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
      });
    } else {
      tags.sort((a, b) => {
        if ((a.contact_count || 0) !== (b.contact_count || 0)) return (b.contact_count || 0) - (a.contact_count || 0);
        return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
      });
    }
    res.json(tags);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/tags - create tag
tagsRouter.post('/', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: '标签名称为必填项' });
    const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color || '#3B82F6');
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(tag);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: '标签已存在' });
    }
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/tags/:id - delete tag
tagsRouter.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: '标签未找到' });
    res.json({ message: '标签已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/tags/:id - update tag
tagsRouter.put('/:id', (req, res) => {
  try {
    const { name, color } = req.body;
    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '标签未找到' });

    const updates = [];
    const params = { id: req.params.id };
    if (name !== undefined) { updates.push('name = @name'); params.name = name; }
    if (color !== undefined) { updates.push('color = @color'); params.color = color; }
    if (updates.length === 0) return res.status(400).json({ error: '没有要更新的字段' });

    db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = @id`).run(params);
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    res.json(tag);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: '标签名已存在' });
    }
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ── Standalone Strengths routes (mounted at /api by index.js) ────
const strengthsRouter = express.Router();

// PUT /api/strengths/:id - update
strengthsRouter.put('/strengths/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM contact_strengths WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '优点未找到' });

    const fields = ['content', 'rating', 'progress'];
    const updates = [];
    const params = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = @${f}`);
        params[f] = req.body[f];
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: '没有要更新的字段' });

    params.id = req.params.id;
    db.prepare(`UPDATE contact_strengths SET ${updates.join(', ')} WHERE id = @id`).run(params);

    const strength = db.prepare('SELECT * FROM contact_strengths WHERE id = ?').get(req.params.id);
    res.json(strength);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/strengths/:id
strengthsRouter.delete('/strengths/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM contact_strengths WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: '优点未找到' });
    res.json({ message: '优点已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = { contactsRouter: router, strengthsRouter, tagsRouter };
