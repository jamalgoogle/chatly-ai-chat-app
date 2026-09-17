# Chatly — a simple ChatGPT-style app

React + Express + MySQL. Text chat with image/file uploads and persistent chat history per user.

```
chatapp/
├── server/     Express API (auth, conversations, messages, OpenAI calls)
└── client/     React app (Vite)
```

## 1. Requirements

- Node.js 18+
- A running MySQL server (local or remote)
- A Gemini API key (see "Getting a Gemini API key" below)

## 2. Set up the database

```bash
mysql -u root -p < server/schema.sql
```

This creates a `chatapp` database with `users`, `conversations`, `messages`, and `attachments` tables.

## 3. Backend setup

```bash
cd server
cp .env.example .env
# edit .env: DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev
```

### Getting a Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account.
3. Click "Create API key" (pick or create a Google Cloud project if it asks — the free tier needs no billing setup).
4. Copy the key into `GEMINI_API_KEY` in your `.env`.

The API runs on `http://localhost:5000`. Uploaded files are saved to `server/uploads/`.

## 4. Frontend setup

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/uploads` to the backend, so you don't need to configure CORS URLs by hand.

## 5. Using the app

1. Sign up for an account (stored in the `users` table, password hashed with bcrypt).
2. Start a new chat, type a message, optionally attach images or files (📎), and send.
3. Images are sent to the model directly (vision), so you can ask questions about a photo.
4. Text-like files (`.txt`, `.md`, `.csv`, `.json`, `.log`, code files) have their content read and included as context. Other formats (PDF, Word, etc.) are attached and downloadable, but their content isn't extracted yet — see "Extending" below.
5. Every conversation and message is saved in MySQL, so chat history survives a refresh or logging back in later. Rename or delete chats from the sidebar.

## How it fits together

- **Auth**: `POST /api/auth/signup` / `login` return a JWT, stored in the browser's `localStorage` and sent as `Authorization: Bearer <token>` on every request.
- **Conversations**: `server/src/routes/conversations.js` handles listing, creating, renaming, deleting conversations, and the core `POST /:id/messages` endpoint that saves the user's message + attachments, replays the conversation to OpenAI, and saves + returns the reply.
- **File uploads**: handled by `multer`, saved to disk under `server/uploads/`, served statically, and referenced in the DB by path.
- **Frontend state**: `Chat.jsx` is the top-level page — it owns the conversation list and current messages and passes callbacks down to `Sidebar`, `MessageList`, and `Composer`.

## Extending it

- **PDF/Word text extraction**: add `pdf-parse` / `mammoth` and use them inside `server/src/utils/fileParser.js`.
- **Streaming replies**: swap the single `chat.completions.create` call in `server/src/utils/openai.js` for a streamed response and pipe it to the client over Server-Sent Events or a WebSocket.
- **Switch to OpenAI or Claude**: the whole provider integration lives in `server/src/utils/ai.js` and the part-format in `server/src/utils/fileParser.js` — swap the SDK there and the rest of the app doesn't need to change.
- **Production build**: `npm run build` in `client/` produces static files you can serve from Express or a CDN; put the real backend URL behind a reverse proxy (e.g. nginx) in front of both.
