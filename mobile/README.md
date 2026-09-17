# DigitalCarda mobile app

The iPhone and Android app for card owners, built with Expo (SDK 57) and React Native. It talks to the same API as digitalcarda.in, fully typed against `api/router.ts`. The plan it follows is PRD-MOB-001.

## What's in this build

| Tab | What it does |
|---|---|
| Home | Card at a glance (live/paused, link, plan), last-30-day views and visitor actions, next step to finish the card, latest enquiries |
| Edit | Name, role, business, contact details, address and About — autosaved to the live card, with a guard against overwriting newer edits made on the website or another phone |
| Share | QR code (full screen, screen brightened), copy link, send on WhatsApp, system share sheet |
| Leads | Enquiry inbox with search and status filters; detail with one-tap WhatsApp / call / email, status, follow-up reminders and private notes |
| More | Insights, notifications, refer & earn, plan status, support, sign out |

Sign-in uses email (or card address / mobile) and password. Sections not yet in the app — design, services, gallery, payments, subscription — open the website.

## Run it on your phone

1. Install **Expo Go** from the Play Store or App Store.
2. On the computer, with the phone on the same Wi-Fi:
   ```bash
   cd app/mobile
   npm install
   npx expo start
   ```
3. Scan the QR code shown in the terminal (Android: with Expo Go; iPhone: with the Camera app).

By default the app uses the **live** API at digitalcarda.in, so you sign in with a real account and **edits in the Edit tab change that live card**.

## Run against a local server

```bash
# terminal 1 — the web app + API on port 3005 (from app/)
npx vite --port 3005 --strictPort

# terminal 2 — the app
cd app/mobile
npx expo start
```

Point the app at the local server with a file `app/mobile/.env.local` (not committed):

```
EXPO_PUBLIC_API_URL=http://192.168.1.20:3005
```

Use your computer's Wi-Fi IP for a phone, or `http://localhost:3005` for the browser preview (`npx expo start --web`). Delete the file to go back to the live API. The API allows cross-origin calls from localhost only outside production.

## Checks

```bash
npm run typecheck   # includes the server's API types — a wrong input or a removed procedure fails here
```

## Next up (from the PRD)

- Server: refresh tokens and device sessions, push notifications for new enquiries, photo uploads to file storage, account deletion, Sign in with Apple.
- App: push for new enquiries, photo & logo with crop, designs, NFC tag writing, in-app plan purchase, account deletion, first-card guide for new sign-ups.
- Store: EAS builds, bundle id `in.digitalcarda.app`, Apple Developer and Google Play organisation accounts.
