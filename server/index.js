const express = require('express');
const cors = require('cors');
const path = require('path');

// Catch any uncaught errors so the process never dies silently
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Startup diagnostics
console.log(`[startup] pid=${process.pid}`);
console.log(`[startup] node=${process.version}`);
console.log(`[startup] NODE_ENV=${process.env.NODE_ENV || '(not set)'}`);
console.log(`[startup] PORT env=${process.env.PORT || '(not set)'}, resolved=${PORT}`);
console.log(`[startup] DB_PATH=${process.env.DB_PATH || '(not set, using default)'}`);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check endpoint — must be registered before db init so Railway
// can reach it even if database initialization is slow
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', port: PORT });
});

// Initialize database (triggers table creation and seeding)
try {
  require('./db');
} catch (err) {
  console.error('Failed to initialize database:', err.message);
  console.error(err.stack);
  process.exit(1);
}

// Routes
const contactsRouter = require('./routes/contacts');
const tagsRouter = require('./routes/tags');
const interactionsRouter = require('./routes/interactions');
const remindersRouter = require('./routes/reminders');
const statsRouter = require('./routes/stats');
const strengthsRouter = require('./routes/strengths');
const settingsRouter = require('./routes/settings');
const pingsRouter = require('./routes/pings');
const { Solar, Lunar } = require('lunar-javascript');

// Lunar-solar date conversion endpoint
app.get('/api/lunar/convert', (req, res) => {
  try {
    const { date, from } = req.query;
    if (!date || !from) {
      return res.status(400).json({ error: 'Missing required query parameters: date, from' });
    }
    if (from !== 'solar' && from !== 'lunar') {
      return res.status(400).json({ error: 'Parameter "from" must be "solar" or "lunar"' });
    }

    const parts = date.split('-');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    let solar, lunar;
    if (from === 'solar') {
      solar = Solar.fromYmd(year, month, day);
      lunar = solar.getLunar();
    } else {
      lunar = Lunar.fromYmd(year, month, day);
      solar = lunar.getSolar();
    }

    res.json({
      solar: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
      lunar: `${lunar.getYear()}-${String(Math.abs(lunar.getMonth())).padStart(2, '0')}-${String(lunar.getDay()).padStart(2, '0')}`,
      lunarChinese: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/contacts', contactsRouter);
app.use('/api/tags', tagsRouter);
// Also mount the tag assignment route for /api/contacts/:id/tags
app.use('/api', tagsRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/stats', statsRouter);
app.use('/api', strengthsRouter);
app.use('/api/pings', pingsRouter);
app.use('/api/settings', settingsRouter);

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Prevent Railway reverse proxy timeout mismatches
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

// Graceful shutdown — close DB and HTTP connections cleanly
process.on('SIGTERM', () => {
  console.log('[shutdown] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    try {
      const db = require('./db');
      db.close();
    } catch (_) { /* db may already be closed */ }
    console.log('[shutdown] Server closed');
    process.exit(0);
  });
});

module.exports = app;
