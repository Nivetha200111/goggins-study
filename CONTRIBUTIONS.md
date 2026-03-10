# Contributions

## Scope

This repo currently has two realities:

- active local-agent flow
- legacy webcam/AI flow kept in-repo for reference

Contributions should default to the active local-agent flow unless there is an explicit request to revive or modify legacy webcam monitoring.

## Active areas

These paths are the primary product surface:

- `src/app/`
- `src/components/StudyTabs/`
- `src/components/ChromeAgentSync.tsx`
- `src/store/gameStore.ts`
- `src/types/index.ts`
- `extension/`
- `android-app/`

## Legacy areas

These paths are currently not part of the active mounted product flow:

- `src/components/Companion/`
- `src/components/PostureMonitor/`
- `src/components/Quiz/`
- `src/hooks/useContentAnalyzer.ts`
- `src/hooks/useDemonMode.ts`
- `src/hooks/usePostureMonitor.ts`
- `src/hooks/useQuizGenerator.ts`
- `src/store/studyIntelligenceStore.ts`

Do not couple new work to those files unless the task explicitly requires it.

## Setup

### Web

```bash
npm install
npm run dev
```

### Verify

```bash
npm run lint
npm run build
```

### Chrome extension

Load `extension/` as an unpacked extension in Chrome.

### Android

Open `android-app/` in Android Studio.

## Working rules

- Preserve the pixel-art visual language in the active website flow.
- Keep the Chrome monitoring local and rule-based.
- Do not introduce webcam monitoring back into the active path unless requested.
- Keep Android changes focused on notification/foreground usage enforcement unless the product scope changes.
- Avoid mixing unrelated dirty worktree changes into a commit.

## Commit guidance

- Stage only files relevant to the current task.
- Prefer small, focused commits.
- Run lint and build before pushing changes that touch the active web path.

## If you touch docs

Update these when behavior changes:

- `README.md`
- `PRD.md`
- `CONTRIBUTIONS.md`
