const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/settings - return all settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      if (r.key === 'custom_categories' || r.key === 'custom_interaction_types' || r.key === 'tag_order' || r.key === 'custom_category_order' || r.key === 'custom_interaction_type_order' || r.key === 'custom_star_labels') {
        try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
      } else {
        settings[r.key] = r.value;
      }
    }
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/settings/tag-order - save tag order array
router.put('/tag-order', (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: '无效的标签排序' });
    }
    const value = JSON.stringify(order);
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('tag_order', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(value);
    res.json({ message: '标签排序已保存', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/settings/custom-category-order - save category order array
router.put('/custom-category-order', (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: '无效的分类排序' });
    }
    const value = JSON.stringify(order);
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('custom_category_order', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(value);
    res.json({ message: '分类排序已保存', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/settings/custom-interaction-type-order - save interaction type order array
router.put('/custom-interaction-type-order', (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: '无效的互动类型排序' });
    }
    const value = JSON.stringify(order);
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('custom_interaction_type_order', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(value);
    res.json({ message: '互动类型排序已保存', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/settings/custom-star-labels - save custom star rating labels
router.put('/custom-star-labels', (req, res) => {
  try {
    const { labels } = req.body;
    if (!labels || typeof labels !== 'object') {
      return res.status(400).json({ error: '无效的星级标签配置' });
    }
    const value = JSON.stringify(labels);
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('custom_star_labels', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(value);
    res.json({ message: '星级标签已保存', labels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/settings/import - import data from JSON
router.post('/import', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.version) {
      return res.status(400).json({ error: '无效的备份文件格式' });
    }

    // Whitelist of legal column names per table. Any column key in the user-supplied
    // backup that is not listed here will be silently dropped before being interpolated
    // into the INSERT statement, eliminating column-name injection risk.
    const ALLOWED_COLS = {
      contacts: ['id','name','avatar_url','company','position','birthday','birthday_type','zodiac','mbti','hometown','current_city','personality_traits','strengths','preferences','notes','relationship_level','category','record_start_date','created_at','updated_at'],
      contact_methods: ['id','contact_id','type','value','created_at'],
      tags: ['id','name','color','created_at'],
      contact_tags: ['contact_id','tag_id'],
      interactions: ['id','type','title','content','location','date','mood','created_at'],
      interaction_contacts: ['interaction_id','contact_id'],
      reminders: ['id','contact_id','title','description','remind_date','is_completed','created_at'],
      online_pings: ['date','contact_id','created_at'],
      contact_strengths: ['id','contact_id','content','rating','progress','created_at'],
      settings: ['key','value','updated_at'],
    };

    const safeInsert = (table, rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return 0;
      const allowed = ALLOWED_COLS[table];
      const stmtCache = new Map();
      let inserted = 0;

      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const cols = Object.keys(row).filter(c => allowed.includes(c) && row[c] !== undefined);
        if (cols.length === 0) continue;
        const key = cols.join(',');
        let stmt = stmtCache.get(key);
        if (!stmt) {
          stmt = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
          stmtCache.set(key, stmt);
        }
        const values = cols.map(c => row[c]);
        stmt.run(...values);
        inserted++;
      }

      return inserted;
    };

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
      counts.contacts             = safeInsert('contacts',             data.contacts);
      counts.contact_methods      = safeInsert('contact_methods',      data.contact_methods);
      counts.tags                 = safeInsert('tags',                 data.tags);
      counts.contact_tags         = safeInsert('contact_tags',         data.contact_tags);
      counts.interactions         = safeInsert('interactions',         data.interactions);
      counts.interaction_contacts = safeInsert('interaction_contacts', data.interaction_contacts);
      counts.reminders            = safeInsert('reminders',            data.reminders);
      counts.online_pings         = safeInsert('online_pings',         data.online_pings);
      counts.contact_strengths    = safeInsert('contact_strengths',    data.contact_strengths);
      counts.settings             = safeInsert('settings',             data.settings);
      return counts;
    });

    const counts = importData();
    res.json({ message: '数据导入成功', counts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
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
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/settings/record-start-date
// DEPRECATED — global record start date has been removed.
// Per-contact record_start_date is now stored on the contact directly.
router.put('/record-start-date', (req, res) => {
  res.status(410).json({ error: '全局起始日期已废弃，请在联系人编辑页设置专属起始日期。' });
});

router.delete('/record-start-date', (req, res) => {
  res.status(410).json({ error: '全局起始日期已废弃，请在联系人编辑页设置专属起始日期。' });
});

module.exports = router;
