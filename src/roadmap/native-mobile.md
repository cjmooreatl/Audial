---
name: Native Mobile App
description: A native iOS and Android app where The Wire plays from your locked screen — Audial as a radio station, not a browser tab.
effort: large
status: planned
---

The Wire is a radio. Right now it stops when you lock your phone. That's not a radio — that's a website. A native mobile app changes the fundamental relationship: Audial runs in the background, The Wire persists through lock screens and notification shades, and the whole experience is built for thumbs and earbuds. This is the version of Audial that people carry everywhere.

## What it looks like

- Full parity with the web app on all three pages — Home, Channel, Search — rebuilt with native components that feel at home on each platform.
- The Wire runs as a background audio session. Lock your screen: the track continues, the lock screen shows the cover art, track name, and Wire controls (pause, skip). Control Center integration on iOS. Notification controls on Android.
- The On Air bar becomes a native mini-player that lives at the bottom of the screen, persistent across all pages, collapsible into a full-screen player with the set's full track list.
- Haptic feedback on mark, file, and subscribe actions — small pulses that confirm intent without a visual.
- Push notifications enabled: a channel you're tuned to goes live and your lock screen receives a broadcast-coded push — `@curator BROADCAST "Late Hours" ▪`. Tap to open the set directly.
- The channel entry animation is native: the accent color sweeps in with a native animation that runs at 120fps on Pro devices.

## Key details

- Built with React Native + Expo, sharing the backend API and as much business logic as possible with the web frontend.
- The web and native apps are separate surfaces but share the same backend methods and data. No native-only features at the data layer.
- Background audio: iOS Audio Session Category `playback`, Android `AudioFocusRequest` with `AUDIOFOCUS_GAIN`. The Wire's queue management moves server-side to support background pre-fetching of the next track URL without the web page being open.
- Push notifications via Expo's push notification service, which handles both APNS (iOS) and FCM (Android).
- The native app is the context where full Spotify playback (via Spotify Connect) and Apple Music playback feel most natural — all three audio surfaces need testing here.
- App Store and Play Store distribution. Deep linking from web set URLs (`audial.fm/s/:id`) opens the native app if installed.

~~~
React Native with Expo SDK. `expo-av` or `react-native-track-player` for background audio — the latter is preferred for lock screen integration. Push notifications via `expo-notifications`. Shared type definitions between web and native via a `@audial/shared` package in the monorepo. The backend API is already REST-accessible via the MindStudio API interface — the native app calls the same methods.
~~~
