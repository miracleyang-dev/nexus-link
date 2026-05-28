const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/settings - return all settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      if (r.key === 'custom_categories' || r.key === 'custom_interaction_types') {
        try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
      } else {
        settings[r.key] = r.value;
      }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/custom-categories - save custom categories config
router.put('/custom-categories', (req, res) => {
  try {
    const { categories } = req.body;
    if (!categories || typeof categories !== 'object') {
      return res.status(400).json({ error: '无效的分类配置' });
    }
    const value = JSON.stringify(categories);
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('custom_categories', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(value);
    res.json({ message: '分类配置已保存', categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/custom-interaction-types - save custom interaction types config
router.put('/custom-interaction-types', (req, res) => {
  try {
    const { types } = req.body;
    if (!types || typeof types !== 'object') {
      return res.status(400).json({ error: '无效的互动类型配置' });
    }
    const value = JSON.stringify(types);
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('custom_interaction_types', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(value);
    res.json({ message: '互动类型配置已保存', types });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/export - export all data as JSON
router.get('/export', (req, res) => {
  try {
    const data = {
      version: 1,
      exported_at: new Date().toISOString(),
      contacts: db.prepare('SELECT * FROM contacts').all(),
      contact_methods: db.prepare('SELECT * FROM contact_methods').all(),
      tags: db.prepare('SELECT * FROM tags').all(),
      contact_tags: db.prepare('SELECT * FROM contact_tags').all(),
      interactions: db.prepare('SELECT * FROM interactions').all(),
      interaction_contacts: db.prepare('SELECT * FROM interaction_contacts').all(),
      reminders: db.prepare('SELECT * FROM reminders').all(),
      online_pings: db.prepare('SELECT * FROM online_pings').all(),
      contact_strengths: db.prepare('SELECT * FROM contact_strengths').all(),
      settings: db.prepare('SELECT * FROM settings').all(),
    };
    res.setHeader('Content-Disposition', `attachment; filename=nexuslink-backup-${new Date().toISOString().slice(0,10)}.json`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/import - import data from JSON
router.post('/import', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.version) {
      return res.status(400).json({ error: '无效的备份文件格式' });
    }

    const importData = db.transaction(() => {
      db.prepare('DELETE FROM online_pings').run();
      db.prepare('DELETE FROM contact_strengths').run();
      db.prepare('DELETE FROM interaction_contacts').run();
      db.prepare('DELETE FROM contact_tags').run();
      db.prepare('DELETE FROM reminders').run();
      db.prepare('DELETE FROM interactions').run();
      db.prepare('DELETE FROM contact_methods').run();
      db.prepare('DELETE FROM tags').run();
      db.prepare('DELETE FROM contacts').run();
      db.prepare('DELETE FROM settings').run();

      const counts = {};

      if (data.contacts && data.contacts.length) {
        const cols = Object.keys(data.contacts[0]);
        const stmt = db.prepare(`INSERT INTO contacts (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.contacts) stmt.run(...cols.map(c => row[c]));
        counts.contacts = data.contacts.length;
      }

      if (data.contact_methods && data.contact_methods.length) {
        const cols = Object.keys(data.contact_methods[0]);
        const stmt = db.prepare(`INSERT INTO contact_methods (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.contact_methods) stmt.run(...cols.map(c => row[c]));
        counts.contact_methods = data.contact_methods.length;
      }

      if (data.tags && data.tags.length) {
        const cols = Object.keys(data.tags[0]);
        const stmt = db.prepare(`INSERT INTO tags (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.tags) stmt.run(...cols.map(c => row[c]));
        counts.tags = data.tags.length;
      }

      if (data.contact_tags && data.contact_tags.length) {
        const cols = Object.keys(data.contact_tags[0]);
        const stmt = db.prepare(`INSERT INTO contact_tags (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.contact_tags) stmt.run(...cols.map(c => row[c]));
        counts.contact_tags = data.contact_tags.length;
      }

      if (data.interactions && data.interactions.length) {
        const cols = Object.keys(data.interactions[0]);
        const stmt = db.prepare(`INSERT INTO interactions (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.interactions) stmt.run(...cols.map(c => row[c]));
        counts.interactions = data.interactions.length;
      }

      if (data.interaction_contacts && data.interaction_contacts.length) {
        const cols = Object.keys(data.interaction_contacts[0]);
        const stmt = db.prepare(`INSERT INTO interaction_contacts (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.interaction_contacts) stmt.run(...cols.map(c => row[c]));
        counts.interaction_contacts = data.interaction_contacts.length;
      }

      if (data.reminders && data.reminders.length) {
        const cols = Object.keys(data.reminders[0]);
        const stmt = db.prepare(`INSERT INTO reminders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.reminders) stmt.run(...cols.map(c => row[c]));
        counts.reminders = data.reminders.length;
      }

      if (data.online_pings && data.online_pings.length) {
        const cols = Object.keys(data.online_pings[0]);
        const stmt = db.prepare(`INSERT INTO online_pings (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.online_pings) stmt.run(...cols.map(c => row[c]));
        counts.online_pings = data.online_pings.length;
      }

      if (data.contact_strengths && data.contact_strengths.length) {
        const cols = Object.keys(data.contact_strengths[0]);
        const stmt = db.prepare(`INSERT INTO contact_strengths (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.contact_strengths) stmt.run(...cols.map(c => row[c]));
        counts.contact_strengths = data.contact_strengths.length;
      }

      if (data.settings && data.settings.length) {
        const cols = Object.keys(data.settings[0]);
        const stmt = db.prepare(`INSERT INTO settings (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of data.settings) stmt.run(...cols.map(c => row[c]));
        counts.settings = data.settings.length;
      }

      return counts;
    });

    const counts = importData();
    res.json({ message: '数据导入成功', counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/clear-all - clear all data
router.delete('/clear-all', (req, res) => {
  try {
    const clearAll = db.transaction(() => {
      const counts = {};
      counts.online_pings = db.prepare('DELETE FROM online_pings').run().changes;
      counts.contact_strengths = db.prepare('DELETE FROM contact_strengths').run().changes;
      counts.interaction_contacts = db.prepare('DELETE FROM interaction_contacts').run().changes;
      counts.contact_tags = db.prepare('DELETE FROM contact_tags').run().changes;
      counts.reminders = db.prepare('DELETE FROM reminders').run().changes;
      counts.interactions = db.prepare('DELETE FROM interactions').run().changes;
      counts.contact_methods = db.prepare('DELETE FROM contact_methods').run().changes;
      counts.tags = db.prepare('DELETE FROM tags').run().changes;
      counts.contacts = db.prepare('DELETE FROM contacts').run().changes;
      counts.settings = db.prepare('DELETE FROM settings').run().changes;
      return counts;
    });

    const counts = clearAll();
    res.json({ message: '所有数据已清空', counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/record-start-date
// Sets the global record start date and physically deletes all data before it.
router.put('/record-start-date', (req, res) => {
  try {
    const { date } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const purge = db.transaction(() => {
      const delInteractions = db.prepare('DELETE FROM interactions WHERE date < ?').run(date);
      const delReminders = db.prepare('DELETE FROM reminders WHERE remind_date < ?').run(date);
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('record_start_date', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(date);

      return {
        deleted_interactions: delInteractions.changes,
        deleted_reminders: delReminders.changes,
      };
    });

    const result = purge();

    res.json({
      record_start_date: date,
      purged: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/record-start-date - clear the start date restriction
router.delete('/record-start-date', (req, res) => {
  try {
    db.prepare("DELETE FROM settings WHERE key = 'record_start_date'").run();
    res.json({ message: 'Record start date cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
