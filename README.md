# NexusLink

A personal CRM for managing your social connections — track contacts, interactions, relationships, and never forget a birthday again.

## Features

- Contact management with rich profiles (MBTI, zodiac, personality traits, etc.)
- Interaction timeline with mood tracking
- D3.js force-directed relationship graph
- Smart reminders with auto birthday detection
- Dashboard with Chart.js analytics
- Dark cyber-tech themed UI with Tailwind CSS
- Mobile responsive design

## Tech Stack

- **Backend**: Node.js, Express, better-sqlite3
- **Frontend**: Vanilla JS, Tailwind CSS, D3.js, Chart.js

## Getting Started

```bash
npm install
npm start
```

The app runs at `http://localhost:3000`.

## Project Structure

```
├── public/           # Frontend static files
│   ├── css/          # Stylesheets
│   ├── js/           # Frontend JavaScript modules
│   └── index.html    # SPA entry point
├── server/           # Backend
│   ├── routes/       # Express API routes
│   ├── db.js         # Database setup & seed data
│   └── index.js      # Express server entry
└── package.json
```
