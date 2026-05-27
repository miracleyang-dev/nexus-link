const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize database (triggers table creation and seeding)
require('./db');

// Routes
const contactsRouter = require('./routes/contacts');
const tagsRouter = require('./routes/tags');
const interactionsRouter = require('./routes/interactions');
const remindersRouter = require('./routes/reminders');
const statsRouter = require('./routes/stats');
const relationshipsRouter = require('./routes/relationships');

app.use('/api/contacts', contactsRouter);
app.use('/api/tags', tagsRouter);
// Also mount the tag assignment route for /api/contacts/:id/tags
app.use('/api', tagsRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/relationships', relationshipsRouter);

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
