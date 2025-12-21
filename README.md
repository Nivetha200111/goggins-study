Study Sentry is a Vercel-deployable focus companion that watches this tab for topic drift and triggers a full-screen video interruption when you leave or go off-topic.

## Chrome Extension

The extension lives in `extension/` and keeps the companion visible across browser tabs.

Setup:

1. Copy a scream clip to `extension/media/scream.mp4` (already copied from `public/scream.mp4`).
2. Open Chrome > `chrome://extensions` > enable Developer Mode.
3. Click "Load unpacked" and select the `extension/` folder.

The companion will appear on every page the extension can inject into and react to off-topic tabs or typing drift.

Picture-in-Picture:

- Click the companion "Pin" button (or the popup "Pin Companion") to keep it visible across tabs.
- PiP requires a user click and may be blocked on some pages until you interact.

Voice + Yell mode:

- Toggle voice prompts and yell mode in the extension settings.
- Yell mode uses more aggressive voice lines and louder speech.

## Container Modes

Web app (Next.js):

```bash
docker compose --profile web up --build
```

Chrome extension (zip bundle output):

```bash
docker build -f docker/Dockerfile.extension -o dist-extension .
```

Electron build output:

```bash
docker build -f docker/Dockerfile.electron -o dist-electron-build .
```

## Getting Started

Add a scream clip:

- Place a short video at `public/scream.mp4`.

Supabase auth:

1. Create a Supabase project.
2. Set the following environment variables (local `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

- Topic drift is detected in the Focus Notes panel.
- Leaving the tab triggers the same alert.
- A lightweight local profile tracks sessions, focus minutes, and distractions.

## Deploy

Deploy on Vercel as a standard Next.js app.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Next

Add a learning layer that adapts thresholds based on your study patterns.
# goggins-study
