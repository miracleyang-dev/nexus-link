const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stats/overview
router.get('/overview', (req, res) => {
  try {
    const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
    const interactionsThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM interactions
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `).get().count;
    const upcomingReminders = db.prepare(`
      SELECT COUNT(*) as count FROM reminders
      WHERE remind_date BETWEEN date('now') AND date('now', '+7 days')
      AND is_completed = 0
    `).get().count;
    const tagDistribution = db.prepare(`
      SELECT t.name, t.color, COUNT(ct.contact_id) as count
      FROM tags t
      LEFT JOIN contact_tags ct ON t.id = ct.tag_id
      GROUP BY t.id
      ORDER BY count DESC
    `).all();

    const tagCount = db.prepare('SELECT COUNT(*) as count FROM tags').get().count;

    const totalInteractions = db.prepare('SELECT COUNT(*) as count FROM interactions').get().count;

    // Average relationship level
    const avgLevel = db.prepare('SELECT AVG(relationship_level) as avg FROM contacts').get().avg || 0;

    // Contacts added this month
    const newThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM contacts
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get().count;

    res.json({
      total_contacts: totalContacts,
      interactions_this_month: interactionsThisMonth,
      total_interactions: totalInteractions,
      upcoming_reminders: upcomingReminders,
      tag_count: tagCount,
      avg_relationship_level: Math.round(avgLevel * 10) / 10,
      new_contacts_this_month: newThisMonth,
      tag_distribution: tagDistribution
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/interaction-frequency - top 10
router.get('/interaction-frequency', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT c.id, c.name, c.category, COUNT(i.id) as interaction_count
      FROM contacts c
      LEFT JOIN interactions i ON c.id = i.contact_id
      GROUP BY c.id
      HAVING interaction_count > 0
      ORDER BY interaction_count DESC
      LIMIT 10
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/relationship-levels
router.get('/relationship-levels', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT relationship_level, COUNT(*) as count
      FROM contacts
      GROUP BY relationship_level
      ORDER BY relationship_level
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/monthly-interactions - last 12 months
router.get('/monthly-interactions', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, COUNT(*) as count
      FROM interactions
      WHERE date >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/category-distribution
router.get('/category-distribution', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM contacts
      GROUP BY category
      ORDER BY count DESC
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/interaction-types - breakdown by type
router.get('/interaction-types', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM interactions
      GROUP BY type
      ORDER BY count DESC
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/mood-trend - average mood per month
router.get('/mood-trend', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT strftime('%Y-%m', date) as month,
             ROUND(AVG(mood), 1) as avg_mood,
             COUNT(*) as count
      FROM interactions
      WHERE date >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/city-distribution - contacts by city
router.get('/city-distribution', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT current_city as city, COUNT(*) as count
      FROM contacts
      WHERE current_city IS NOT NULL AND current_city != ''
      GROUP BY current_city
      ORDER BY count DESC
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/neglected - contacts with no recent interactions (30+ days)
router.get('/neglected', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT c.id, c.name, c.category, c.relationship_level,
             MAX(i.date) as last_interaction,
             CAST(julianday('now') - julianday(MAX(i.date)) AS INTEGER) as days_since
      FROM contacts c
      LEFT JOIN interactions i ON c.id = i.contact_id
      GROUP BY c.id
      HAVING last_interaction IS NOT NULL AND days_since >= 30
      ORDER BY days_since DESC
      LIMIT 10
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
