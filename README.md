Study Sentry is a Vercel-deployable focus companion that watches this tab for topic drift and triggers a full-screen video interruption when you leave or go off-topic.

## Getting Started

Add a scream clip:

- Place a short video at `public/scream.mp4`.

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
