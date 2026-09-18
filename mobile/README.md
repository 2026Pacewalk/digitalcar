# DigitalCarda mobile app

The iPhone and Android app for card owners, built with Expo (SDK 57) and React Native. It talks to the same API as digitalcarda.in, fully typed against `api/router.ts`. The plan it follows is PRD-MOB-001.

## What's in this build

| Tab | What it does |
|---|---|
| Home | Card at a glance (live/paused, link, plan), last-30-day views and visitor actions, next step to finish the card, latest enquiries |
| Edit | Photo and logo (gallery or camera), name, role, business, contact details, address, map link and About — autosaved to the live card. From here: services & offers, photos & videos, payments, social links & reviews, sections on/off, design, and a live preview |
| Share | QR code (full screen, screen brightened), copy link, send on WhatsApp, system share sheet |
| Leads | Enquiry inbox with search and status filters; detail with one-tap WhatsApp / call / email, status, follow-up reminders and private notes |
| More | Insights, enquiry alerts, notifications, refer & earn, plan, account & password, signed-in devices, appearance (phone setting / light / dark), website pages, support, sign out, delete account |

Also: create an account in the app (the starter card goes live on the 30-day trial, then a four-step welcome guide), a design picker (catalogue thumbnails, category filter, live sample, one-tap apply; the ID and Membership designs stay locked unless the add-on is owned), device sessions that renew themselves, and push alerts for new enquiries.

**Saving.** Every change goes through `src/lib/cardStore.ts`: a change is a function from the card as it is to the card as it should be, saved with the version it was applied to. If the card changed on the website or another phone in between, the app fetches the latest card and applies the same change again, so both sides' edits survive (two edits of the very same field: the later wins). Text fields autosave through `src/lib/useCardFields.ts`, which writes only the fields that were actually changed.

The content editors follow the website's rules exactly (`src/lib/cardContent.ts`): plan limits (Gold/trial 50 services, 15 offers, 20 photos, 8 videos, 5 payment QRs; Platinum more), the website's formatted service descriptions are kept unless edited, social links are stored as the website stores them. The preview opens the live card with `?preview=app`, which the card page doesn't count as a visit.

**Account & plan.** Account: name and mobile (a mobile already used by another account is refused), the sign-in email and its verification (changing the sign-in email goes through support), a password change that can sign out the owner's other phones, and the card link (moving the card keeps its permanent QR link and its visit history). Plan: trial or plan status, usage against the plan's limits, Gold and Platinum by term with savings, payment history.

**Website pages open signed in.** Paying for a plan, NFC orders, the email signature and the full dashboard open on digitalcarda.in through a one-time link (`mobile.webLink` → `/auth/app-link`): the code works once, for two minutes, and the page is fixed by the server. The plan page opens on the plan and term picked in the app (`?cycle=&plan=`).

**Write with AI.** From the owner's website (`ai.fromWebsite`) or a few details (`ai.generate`): what you do, About, services, Google listing text, and — from a website — contact details and social profiles. Each suggestion has a tick box; empty parts of the card start ticked, anything that would replace existing text starts unticked. Nothing is saved until "Add to my card".

**Leads out of the app.** Save an enquiry to the phone's contacts (the phone's own new-contact form, prefilled) and export the list on screen as a CSV through the share sheet. Cells can't run as formulas; phone numbers keep their +.

**Cards on the older system.** Many older accounts still have their card only in customers.json. `mobile.legacyCard` recognises them; the app opens the website dashboard once (signed in), whose auto-publish moves the card into the current format, and checks again when the owner comes back.

Sign-in uses email (or card address / mobile) and password. Account-deletion requests land in the website admin under Account Deletions.

**Store builds.** `eas.json` has three profiles: `development` (a development build, for native work such as NFC), `preview` (internal testing; an APK on Android) and `production` (store). Preview and production set `EXPO_PUBLIC_PURCHASE_LINKS=off`: with no in-app purchase yet, the store rules don't allow the app to send people to pay on the website, so those builds show plan status, usage and payments without prices or upgrade/renew buttons (`PURCHASE_LINKS` in `src/lib/config.ts`). Accounts can be deleted in the app or at digitalcarda.in/account/delete. The listing text, privacy answers, screenshot sizes and submit steps are in [store/STORE.md](store/STORE.md).

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

- Server: photo uploads to file storage (photos live inside the card today), Sign in with Apple and Google.
- App: NFC tag writing, in-app plan purchase (store rules — see the PRD), notification settings, several cards per account, paper-card scanner (needs a development build).
- Push: needs an EAS project id (`npx eas init` with the company Expo account) and a development or store build — Expo Go can't receive remote push.
- Store: the company Expo, Apple Developer and Google Play accounts, then the steps in [store/STORE.md](store/STORE.md) (bundle id `in.digitalcarda.app`).
