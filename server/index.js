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
app.use(express.json({ limit: '5mb' }));

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
const { contactsRouter, strengthsRouter, tagsRouter } = require('./routes/contacts');
const { interactionsRouter, pingsRouter } = require('./routes/interactions');
const remindersRouter = require('./routes/reminders');
const statsRouter = require('./routes/stats');
const settingsRouter = require('./routes/settings');
const { lunarRouter } = require('./utils/lunar');

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
app.use('/api/lunar', lunarRouter);

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
