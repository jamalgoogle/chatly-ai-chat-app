# Chatly — a simple AI chat app

Chatly is a full-stack chat application built with React, Express, MySQL, and the Google Gemini API. It supports authenticated users, persistent conversations, image and file uploads, and vision-enabled questions about images.

```
chatapp/
├── server/     Express API (auth, conversations, messages, OpenAI calls)
└── client/     React app (Vite)
```

## Features

- JWT-based signup and login
- Persistent conversations and messages in MySQL
- Gemini-powered text and image chat
- Image and file attachments
- Text extraction for common text and code files
- Conversation rename and delete actions
- Vite development proxy for local API and upload requests

## 1. Requirements

- Node.js 18+
- A running MySQL server (local or remote)
- A Google Gemini API key (see [Getting a Gemini API key](#getting-a-gemini-api-key))

## 2. Clone and install

From the project directory, install dependencies for both applications:

```bash
cd server
npm install

cd ../client
npm install
```

## 3. Set up the database

```bash
mysql -u root -p < server/schema.sql
```

This creates a `chatapp` database with `users`, `conversations`, `messages`, and `attachments` tables.

## 4. Backend setup

```bash
cd server
cp .env.example .env
# edit .env: DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev
```

The server reads configuration from `server/.env`. At minimum, configure:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=chatapp
JWT_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

### Getting a Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account.
3. Click "Create API key" (pick or create a Google Cloud project if it asks — the free tier needs no billing setup).
4. Copy the key into `GEMINI_API_KEY` in your `.env`.

The API runs on `http://localhost:5000`. Uploaded files are saved to `server/uploads/`; make sure this directory is writable and is excluded from version control.

## 5. Frontend setup

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/uploads` to the backend, so you don't need to configure CORS URLs by hand.

## 6. Using the app

1. Sign up for an account (stored in the `users` table, password hashed with bcrypt).
2. Start a new chat, type a message, optionally attach images or files (📎), and send.
3. Images are sent to the model directly (vision), so you can ask questions about a photo.
4. Text-like files (`.txt`, `.md`, `.csv`, `.json`, `.log`, code files) have their content read and included as context. Other formats (PDF, Word, etc.) are attached and downloadable, but their content isn't extracted yet — see "Extending" below.
5. Every conversation and message is saved in MySQL, so chat history survives a refresh or logging back in later. Rename or delete chats from the sidebar.

## How it works

- **Auth**: `POST /api/auth/signup` / `login` return a JWT, stored in the browser's `localStorage` and sent as `Authorization: Bearer <token>` on every request.
- **Conversations**: `server/src/routes/conversations.js` handles listing, creating, renaming, deleting conversations, and the core `POST /:id/messages` endpoint that saves the user's message and attachments, sends conversation history to Gemini, and saves and returns the reply.
- **File uploads**: handled by `multer`, saved to disk under `server/uploads/`, served statically, and referenced in the DB by path.
- **Frontend state**: `Chat.jsx` is the top-level page—it owns the conversation list and current messages and passes callbacks to `Sidebar`, `MessageList`, and `Composer`.

## API overview

All protected endpoints require:

```http
Authorization: Bearer <jwt>
```

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create an account |
| `POST` | `/api/auth/login` | Sign in and receive a JWT |
| `GET` | `/api/conversations` | List the current user's conversations |
| `POST` | `/api/conversations` | Create a conversation |
| `GET` | `/api/conversations/:id/messages` | Load conversation messages |
| `POST` | `/api/conversations/:id/messages` | Send a message and optional attachments |

## Troubleshooting

- **Database connection errors:** confirm MySQL is running, the credentials in `.env` are correct, and `server/schema.sql` has been imported.
- **Gemini errors:** verify `GEMINI_API_KEY` is present, valid, and available for the selected API quota.
- **Uploads fail:** check that `server/uploads/` exists and the server process can write to it.
- **Frontend cannot reach the API:** run the backend on port `5000`, or update the Vite proxy configuration to match your backend port.

## Extending it

- **PDF/Word text extraction**: add `pdf-parse` / `mammoth` and use them inside `server/src/utils/fileParser.js`.
- **Streaming replies**: replace the current single Gemini request with a streamed response and pipe it to the client over Server-Sent Events or a WebSocket.
- **Switch providers**: keep provider-specific logic isolated in `server/src/utils/ai.js`; the rest of the application can remain unchanged.
- **PDF/Word text extraction**: add `pdf-parse` or `mammoth` in `server/src/utils/fileParser.js`.

## Production checklist

- Use a strong, unique `JWT_SECRET` and keep all secrets out of source control.
- Restrict upload size and allowed file types for your deployment.
- Serve the application over HTTPS.
- Use a managed or secured MySQL instance and back up the database.
- Run `npm run build` in `client/` and serve the generated files through a CDN or reverse proxy.
- Configure the production frontend proxy/API URL and persist `server/uploads/` separately from the application container.
