# Audial

A community of musicl enthusiasts brought together through sharing intimate and creator curated playlists.

## What it does

Audial allows for the sharing of one of the most personal types of media out there, the playlist, with others. Built for a hackathon using MindStudio's Remy AI, I am creating its own repository to continue its development on my own. 

## Structure

```
mindstudio.json              ← manifest
src/
  app.md                     ← spec (what the app does)
  interfaces/
    @brand/visual.md         ← design tokens (colors, typography, spacing)
    @brand/voice.md          ← tone and terminology
    web.md                   ← web interface spec
dist/
  methods/
    src/
      helloWorld.ts          ← backend method (AI greeting + db write)
      tables/default.ts      ← greetings table definition
    package.json
  interfaces/
    web/                     ← React frontend (Vite + styled-components)
```

## Stack

- **Backend:** TypeScript method using `@mindstudio-ai/agent` for AI text generation and database access
- **Frontend:** React + Vite + styled-components + framer-motion
- **Database:** SQLite (managed by the platform, defined as TypeScript interfaces)
- **AI:** MindStudio SDK — no API keys to configure

## Developing

Edit files in `dist/` — changes take effect immediately. The platform transpiles methods per-request and the frontend uses Vite HMR.

## Deploying

```bash
git push origin main
```

The platform builds and deploys automatically.
