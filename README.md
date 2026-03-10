# Local Focus Agent

Local Focus Agent is a pixel-themed study dashboard plus a Chrome extension that keeps a pinned timer on screen, watches Chrome usage locally, and shouts when you drift off-topic before the session ends.

The repo also contains an Android scaffold that warns when Instagram, LinkedIn, or WhatsApp open before your study block is complete.

## Stack

- Next.js 16 app in `src/`
- Chrome extension in `extension/`
- Native Android scaffold in `android-app/`
- Supabase for auth, tabs, and whitelist persistence

## What changed

The active product flow now uses:

- local rule-based relevance checks
- Chrome page text + typed text monitoring
- pinned timer overlay
- pixel-art website theme

The active flow does not use:

- webcam monitoring
- posture detection
- TensorFlow or cloud AI inference

Legacy webcam/AI code is still present in the repo, but it is not mounted in the active path.

## Prerequisites

### Web app

- Node.js 20+
- npm

### Chrome extension

- Google Chrome or Chromium with Developer Mode enabled

### Android app

- Android Studio
- Java 17
- Android SDK

The current environment where these changes were made did not have Java, Gradle, or the Android SDK, so the Android app source is included but no APK was built here.

## Environment setup

Create `.env.local` in the repo root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If you do not have Supabase configured yet, the login and cloud-backed tab syncing will not work.

## Install and run the dashboard

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000`

Then:

1. Sign in with your username.
2. Leave the access code blank on first login to auto-generate one, or enter an existing code if you already have one.
3. Save the generated code because it becomes your future login key.
4. Create a study subject.
5. Set a timer.
6. Start the session.

## Load the Chrome extension

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension/` directory

Once loaded, the extension can be controlled in two ways:

- from the popup
- from the dashboard running on `localhost`

When the dashboard is open, it syncs:

- active subject
- timer duration
- sound setting
- whitelist domains
- topic keywords

## How the Chrome agent works

The extension evaluates:

- active tab URL
- tab title
- visible page text
- text typed into editable fields

It raises pressure when:

- the page is on a blocked distractor domain
- typed text does not overlap enough with the current study keywords
- the text looks like chat/social/distraction language
- the page is neither allowlisted nor relevant

When the timer finishes, the extension stops punitive alerts for that session.

## Android app setup

The Android source is under `android-app/`.

Recommended path:

1. Open `android-app/` in Android Studio
2. Let Gradle sync
3. Build or generate an APK from Android Studio
4. Install the APK on your phone
5. Grant:
   - Usage Access
   - Notifications

The app currently watches:

- Instagram
- LinkedIn
- WhatsApp

It uses a foreground service plus Usage Access to detect the current foreground app and trigger notifications and voice prompts before the study timer is complete.

## Verification

The active desktop path was verified with:

```bash
npm run lint
npm run build
```

## Repository layout

```text
src/                 Next.js dashboard
extension/           Chrome extension
android-app/         Native Android scaffold
PRD.md               Product description for the pivot
CONTRIBUTIONS.md     Contribution and workflow guidance
```

## Known limitations

- The Chrome extension only sees what browser extensions are allowed to observe in tabs and editable fields.
- The Android app is a warning system, not a hard app blocker.
- APK generation must happen on a machine with Android tooling installed.
