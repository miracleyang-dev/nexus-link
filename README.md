# NexusLink

A personal CRM for managing your social connections — track contacts, interactions, relationships, and never forget a birthday again.

## Features

- Contact management with rich profiles (MBTI, zodiac, personality traits, etc.)
- Interaction timeline with mood tracking
- D3.js force-directed relationship graph
- Smart reminders with auto birthday detection
- Dashboard with Chart.js analytics
- Tag system for flexible contact grouping
- Dark cyber-tech themed UI with Tailwind CSS
- Mobile responsive design

## Tech Stack

- **Backend**: Node.js, Express, better-sqlite3
- **Frontend**: Vanilla JS, Tailwind CSS, D3.js, Chart.js
- **Database**: SQLite (via better-sqlite3, WAL mode)

## Prerequisites

- Node.js >= 16

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The app runs at `http://localhost:3000`. A SQLite database is auto-created in `data/app.db` with sample seed data on first launch.

## API Endpoints

| Resource        | Methods                      | Path                       |
|-----------------|------------------------------|----------------------------|
| Contacts        | GET, POST, PUT, DELETE       | `/api/contacts`            |
| Tags            | GET, POST, DELETE            | `/api/tags`                |
| Contact Tags    | POST                         | `/api/contacts/:id/tags`   |
| Interactions    | GET, POST, DELETE            | `/api/interactions`        |
| Reminders       | GET, POST, PUT, DELETE       | `/api/reminders`           |
| Relationships   | GET, POST, DELETE            | `/api/relationships`       |
| Stats           | GET                          | `/api/stats/*`             |

## Project Structure

```
├── public/               # Frontend static files
│   ├── index.html        # SPA entry point
│   ├── css/
│   │   └── style.css     # Cyber-tech theme styles
│   └── js/
│       ├── api.js        # API client helper
│       ├── app.js        # App entry & view routing
│       ├── contacts.js   # Contacts module
│       ├── dashboard.js  # Dashboard with Chart.js
│       ├── graph.js      # D3.js relationship graph
│       ├── reminders.js  # Smart reminders module
│       ├── timeline.js   # Interaction timeline
│       └── utils.js      # Shared utilities
├── server/               # Backend
│   ├── index.js          # Express server entry
│   ├── db.js             # Database setup & seed data
│   └── routes/
│       ├── contacts.js   # Contacts CRUD
│       ├── interactions.js
│       ├── relationships.js
│       ├── reminders.js
│       ├── stats.js
│       └── tags.js
├── data/                 # SQLite database (auto-created, gitignored)
├── package.json
└── LICENSE
```

## License

This project is licensed under the [MIT License](LICENSE).
