# Focus Companion - Posture + Soul Contract PRD

## Overview
Focus Companion is a web app that enforces deep focus through an aggressive mascot, real-time posture and phone detection, and a ritualized "sell your distractions" contract. The product is intentionally intense: the user trades distractions for future success under the mascot's watch.

## Goals
- Enforce attention and posture using real-time computer vision.
- Interrupt phone use immediately and require a hands-up reset.
- Create a memorable, ritualized onboarding moment via a soul contract.
- Make monitoring status transparent via a popout camera window.
- Gate access with single-use invite codes tied to a single user.

## Non-goals
- Medical or ergonomic posture diagnosis.
- Long-term habit coaching or therapy.
- Mobile-native apps or OS-level monitoring.

## Target Users
- Students and knowledge workers who want extreme accountability.
- Users who respond well to harsh external enforcement.

## Narrative / Tone
- The mascot is a "devil" figure that promises success and fame in exchange for time and focus.
- The user signs a soul contract on first login.
- The system shouts when the user breaks the pact.

## Key Flows
### Authentication and Access
1. User enters username and invite code.
2. Invite code is validated and consumed once (single-use).
3. Invite code becomes the user's permanent password.
4. Existing users must present their invite code every login.

### Contract Ceremony
1. After login, user is routed to a soul contract page.
2. Scroll-style contract UI with sound effects.
3. User signs the contract to proceed.
4. Contract status is persisted in Supabase and enforced on all devices.

### Focus Session
1. User starts a session and selects a study tab.
2. Posture monitor runs in the background (face + object + hands).
3. If slouching, looking down too long, or looking away from the screen for too long, the mascot shouts.
4. If a phone is detected, shouting continues until the phone is removed and both hands are raised.

### Monitoring Popout
1. When debug monitoring is enabled, a popout appears automatically.
2. The popout shows the camera feed and posture stats.
3. The mascot popout follows the same behavior and can be minimized.

## Functional Requirements
### F1: Posture and Attention Detection
- Detect slouching vs baseline upright posture.
- Detect looking down for sustained periods.
- Detect looking away from the screen beyond a time threshold (e.g., 3 minutes).
- Use MediaPipe Tasks (face landmarking + head angles).
- Maintain a baseline reference for upright posture.

### F2: Phone Detection and Reset
- Detect a phone in the camera frame.
- When phone is detected, the mascot shouts continuously.
- Shouting stops only when:
  - Phone is no longer detected, and
  - Both hands are raised and visible.

### F3: Mascot Behavior
- The mascot shouts for posture, attention, and phone violations.
- Mascot transitions between moods (happy, suspicious, angry, demon) based on violations.
- Demon overlay appears if the user leaves the tab.

### F4: Monitoring Popout
- Auto-open when posture monitoring + debug is enabled.
- Displays camera feed + stats (posture state, timers, phone/hands state).
- Can be minimized or restored.

### F5: Invite Codes
- Invites are single-use and unique.
- Invite becomes the user's password.
- If a user has no invite yet, first valid invite binds to that user.
- If invite is already used, login is blocked.

### F6: Soul Contract
- Contract is required once per account and stored in Supabase.
- Contract page includes scroll UI, sigils, and sound effects.
- Declining logs the user out.

## Data Model (Supabase)
- users
  - id (uuid)
  - username (text)
  - invite_code (text, unique)
  - contract_signed_at (timestamptz)
  - xp / level / streak / last_active_date
- invite_codes
  - code (text, unique)
  - uses_remaining (int, default 1)
  - expires_at (timestamptz)

## Permissions and Privacy
- Webcam access is required and must be permitted by the browser.
- No raw frames are stored server-side.
- All inference runs in-browser.

## UX Requirements
- The contract page feels ritualistic, heavy, and ceremonial.
- The focus experience is tense and strict.
- Animations are purposeful (embers, scroll glow, reveal effects).

## Technical Requirements
- Next.js 16 with client-side hooks for posture detection.
- MediaPipe Tasks Vision assets hosted and referenced via env vars.
- Supabase used for user profile, invites, whitelist, and contract state.

## Success Metrics
- Percent of users who complete the contract.
- Average duration of uninterrupted focus session.
- Reduction in phone detections per session.

## Risks and Constraints
- Camera access can be blocked by deployment permissions policy.
- Users may mute audio; alerts could be ignored.
- Performance could degrade on low-end devices.

## Open Questions
- Should thresholds for posture/attention be user-configurable?
- Do we need a cooldown to prevent alert spam?
- Should contract signature be re-confirmed after long inactivity?
