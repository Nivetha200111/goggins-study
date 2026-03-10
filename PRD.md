ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

# Local Focus Agent PRD

## Overview

Local Focus Agent is a study enforcement system built around local monitoring instead of webcam analysis. The desktop path combines a Next.js dashboard with a Chrome extension that keeps a pinned timer visible, watches the active Chrome tab, scores page text and typed snippets with rule-based NLP, and shouts when the user drifts off topic before the timer is done.

The mobile path is an Android app that monitors foreground usage and warns when Instagram, LinkedIn, or WhatsApp are opened before the study block is complete.

## Goals

- Replace webcam and posture monitoring in the active product flow.
- Keep all browser-side relevance checks local and rule-based.
- Maintain a visible pinned timer during study sessions.
- Warn aggressively when the user types irrelevant text in Chrome.
- Warn on Android when distracting apps are opened before the timer completes.

## Non-goals

- Webcam posture or phone detection in the active experience.
- Cloud AI or remote inference for topic detection.
- Full mobile app blocking or device admin controls.
- System-wide Linux keylogging outside Chrome.

## Product Components

### Dashboard

- Authenticated Next.js app for subject selection, timer planning, and whitelist settings.
- Stores study tabs, notes, streak, XP, and default session length.
- Syncs local session config into the Chrome extension when opened on `localhost`.

### Chrome Extension

- Runs entirely in the browser.
- Pins a timer overlay to the front of Chrome pages.
- Monitors URLs, page titles, visible page text, and typed text from editable fields.
- Uses keyword overlap plus simple distraction phrase detection for relevance scoring.
- Shouts through browser speech synthesis when off-topic behavior is detected before time is up.

### Android App

- Native Android app with a foreground service.
- Uses Usage Access to inspect the foreground app.
- Sends notifications and voice prompts when Instagram, LinkedIn, or WhatsApp open before the study timer ends.

## Key Flows

### Desktop Session

1. User signs in to the dashboard.
2. User selects a study subject and sets a target duration.
3. User starts the session.
4. Dashboard syncs subject, keywords, timer, and sound settings into the Chrome extension.
5. Extension pins the timer overlay and begins local monitoring.
6. If typed text or page content is off-topic, the extension escalates mood and shouts.
7. Once the timer reaches zero, shouting stops for that session.

### Mobile Session

1. User opens the Android app.
2. User grants Usage Access and notification permission.
3. User starts a study block with a target duration.
4. Foreground service watches app switches.
5. If Instagram, LinkedIn, or WhatsApp become foreground before the block finishes, the app warns immediately.

## Functional Requirements

### F1: Rule-based Relevance Scoring

- Tokenize topic name plus user keywords.
- Tokenize page text and typed snippets locally.
- Compute overlap-based relevance score without ML models.
- Use explicit distractor phrase patterns for chat/social language.

### F2: Chrome Enforcement

- Detect blocked distractor domains.
- Detect typed text that is irrelevant to the active subject.
- Keep a pinned timer visible during active sessions.
- Use browser speech synthesis for audible warnings.

### F3: Session Timing

- Support configurable study goals in minutes.
- Track start time, end time, remaining time, and elapsed time.
- Stop punitive warnings once the goal is complete.

### F4: Android Foreground Monitoring

- Poll recent usage events.
- Detect foreground switches into targeted distracting apps.
- Raise a high-priority notification and TextToSpeech warning.

## Privacy

- No webcam is required for the active flow.
- No raw browser text is sent to a server for analysis.
- Android app inspects foreground package names only.

## Risks

- Chrome monitoring is limited to what the extension can observe in tabs and editable fields.
- Android warnings depend on Usage Access being granted and background execution not being heavily restricted.
- The current repo environment does not include Java or the Android SDK, so APK generation must happen elsewhere.
