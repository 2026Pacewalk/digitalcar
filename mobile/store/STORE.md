# DigitalCarda app — store listing and submission

Everything the App Store and Google Play ask for, ready to paste. The app is a
free companion to the digitalcarda.in service: it has no in-app purchases, and
store builds show plan status only (see "Payments and the store rules" below).

Bundle id / package: `in.digitalcarda.app` · Version: see `app.json` → `version`
(build numbers are managed by EAS, `appVersionSource: remote`).

## Links

| What | URL |
|---|---|
| Website / marketing | https://digitalcarda.in |
| Support | https://digitalcarda.in/contact |
| Privacy policy | https://digitalcarda.in/privacy |
| Terms | https://digitalcarda.in/terms-of-service |
| Delete your account (Play's "account deletion URL") | https://digitalcarda.in/account/delete |

In the app, accounts are deleted under More → Delete account (password
confirmed; switched off at once, erased after 30 days). The web page above does
the same for people who no longer have the app.

## Listing text

**App name** (App Store, max 30): `DigitalCarda: Business Card`
**Title** (Google Play, max 30): `DigitalCarda: Business Card`
**Subtitle** (App Store, max 30): `Your digital card and leads`
**Short description** (Google Play, max 80):
`Edit your digital business card, share it by QR and reply to enquiries fast.`

**Keywords** (App Store, max 100, comma separated):
`visiting card,digital card,vcard,qr code,nfc,leads,whatsapp,networking,contact,profile`

**Promotional text** (App Store, max 170, can change without review):
`Update your card from anywhere — new photo, new offer, new number — and it's live the moment you save.`

**Description** (both stores, max 4000):

```
DigitalCarda is the app for your DigitalCarda digital business card. Keep your card up to date, share it in a second, and never miss an enquiry.

YOUR CARD, ALWAYS CURRENT
• Change your photo, logo, contact details, address and About — saved to your live card as you type
• Add services and offers with photos, prices and a button (call, WhatsApp, buy, book)
• Add gallery photos and YouTube videos
• Show UPI QR codes and payment details so customers can pay you
• Link your social profiles and Google reviews
• Switch sections on or off and pick a design
• Preview the card exactly as visitors see it

SHARE IN A SECOND
• Full-screen QR code with the screen brightened for easy scanning
• Send your card on WhatsApp or any app, or copy the link

ENQUIRIES IN ONE PLACE
• Every enquiry from your card lands in the app
• Reply by WhatsApp, call or email in one tap
• Mark progress, set a follow-up reminder and keep private notes
• Save an enquiry to your phone's contacts, or export your list as a spreadsheet
• Get an alert when a new enquiry arrives

SEE WHAT'S WORKING
• Card views and visitor taps for the last 30 days
• What visitors do — calls, WhatsApp chats, contacts saved, QR scans, directions

WRITE WITH AI
• Draft your About, services and Google listing text from your website or a few details — you choose what goes on the card

Your card and the website dashboard stay in sync: edit on the phone or on digitalcarda.in and both show the same card.

New to DigitalCarda? Create an account in the app and your card goes live straight away on a free trial.
```

**What's new** (first release):
`Your DigitalCarda card in your pocket: edit it, share it by QR, and reply to enquiries from one app.`

## Categories and ratings

- App Store: primary **Business**, secondary **Productivity**. Age rating: answer "None" to every content question → **4+**.
- Google Play: category **Business**. Content rating (IARC): no violence, sexual content, profanity, drugs, gambling; no user-to-user chat or content shared between users inside the app; no location sharing → **Everyone / 3+**.
- Target audience (Play): 18 and over (business owners). Not designed for children.
- Ads: **No ads**.

## Payments and the store rules

Plans for the card are bought on digitalcarda.in. The app has no in-app
purchase yet, so store builds must not send people to pay elsewhere (App Store
guideline 3.1.3(f) for free companion apps; Google Play's payments policy).
`EXPO_PUBLIC_PURCHASE_LINKS=off` is set on the `preview` and `production`
profiles in `eas.json`, and the app then:

- shows the plan, its end date, usage and past payments, without prices or "choose / upgrade / renew" buttons;
- words plan-limit messages as "Remove one to add another";
- shows add-on designs as not included, without a link to buy.

NFC cards and standees are physical goods and may be ordered through the website link.
Development builds keep the purchase links so they can be tested.

App Review notes (paste into "Notes" / "App access"):

```
DigitalCarda is a free companion app for business owners who already use digitalcarda.in, or who create a free account in the app. There are no in-app purchases and the app does not link to paid plans.

To review: sign in with the demo account below (it owns a sample card). Everything can also be tested by creating a new account from the sign-in screen ("Create your free card"), which starts a free trial.

Account deletion: More → Delete account.
```

Create a dedicated demo account for review (not a real customer's), give it a
sample card with a few services and enquiries, and enter its email and password
only in App Store Connect / Play Console — never in this repository.

## Privacy answers

What the app handles, and why. Nothing is used for tracking or advertising, and
nothing is sold. No analytics or crash-reporting SDKs are included. All traffic
is HTTPS to digitalcarda.in. Push alerts go through Expo's push service to Apple
(APNs) and Google (FCM). "Write with AI" sends the text the owner asks about to
our AI provider to draft suggestions, as a service provider on our behalf.

### Apple — App Privacy ("nutrition label")

Data used to track you: **None**. For every type below: *Linked to the user: yes · Used for tracking: no · Purpose: App Functionality* (Customer Support too for contact info).

| Apple category | Data type | Why |
|---|---|---|
| Contact Info | Name, Email Address, Phone Number, Physical Address | Account sign-in and the owner's own card |
| User Content | Photos or Videos | Card photo, logo, service and gallery photos the owner picks |
| User Content | Other User Content | Card text, private notes and follow-ups on enquiries |
| Identifiers | User ID | The account the app is signed in to |
| Identifiers | Device ID | Push token, to deliver enquiry alerts to this phone |

Not collected: location, contacts (the app only opens the phone's own
new-contact form, prefilled; it never reads the address book), health, financial
info (plan payments happen on the website), browsing/search history, usage
data, diagnostics, sensitive info.

### Google Play — Data safety

- Does the app collect or share user data? **Yes, collects. Not shared** (processing by service providers is not "sharing").
- Encrypted in transit: **Yes**. Users can request deletion: **Yes** (in the app and at the deletion URL above).

| Play category | Data type | Collected | Optional? | Purpose |
|---|---|---|---|---|
| Personal info | Name | Yes | Required | Account management, App functionality |
| Personal info | Email address | Yes | Required | Account management, App functionality |
| Personal info | Phone number | Yes | Optional | App functionality |
| Personal info | Address | Yes | Optional | App functionality (shown on the owner's card) |
| Photos and videos | Photos | Yes | Optional | App functionality |
| App activity | Other user-generated content | Yes | Optional | App functionality |
| Device or other IDs | Device or other IDs | Yes | Optional | App functionality (push alerts, signed-in devices list) |

Permissions in the Android build: internet, notifications, camera and photo
picker (only when the owner adds a photo), storage (older Android versions).
Contacts, microphone and system-settings permissions are removed
(`android.blockedPermissions` in `app.json`). No advertising ID is used.

Export compliance (iOS): standard HTTPS only — `ITSAppUsesNonExemptEncryption`
is `false` in `app.json`.

## Screenshots

Take them from a store build signed in to the demo account (no real customer
data on screen). Five to eight per platform, in this order: Home, Edit,
Share/QR, Leads, lead detail, Insights, Services & offers, Designs.

| Store | Size (portrait) |
|---|---|
| App Store — 6.9" iPhone (required) | 1320 × 2868 (or 1290 × 2796) |
| App Store — 6.5" iPhone | 1284 × 2778 (or 1242 × 2688) |
| Google Play — phone | 1080 × 1920 to 1080 × 2400, PNG or JPEG |
| Google Play — feature graphic | 1024 × 500 |
| Google Play — app icon | 512 × 512 (export of `assets/icon.png`) |

iPad screenshots are not needed: `ios.supportsTablet` is `false`.

## Building and submitting

These steps need the company's Expo, Apple Developer and Google Play accounts,
so the account owner runs them.

```bash
cd app/mobile
npx eas-cli login                 # the company Expo account
npx eas-cli init                  # once: creates the project and writes its id into app.json
npx eas-cli build --profile preview --platform android    # an APK to install and try
npx eas-cli build --profile production --platform all     # store builds
npx eas-cli submit --profile production --platform ios
npx eas-cli submit --profile production --platform android
```

- `eas init` also turns on push alerts: the project id it adds is what the app registers push tokens against.
- The first Android upload may have to be done by hand in Play Console (internal testing track); after that `eas submit` works with a Play service-account key.
- iOS: EAS creates the certificates and provisioning profile on the first build when signed in to the Apple Developer team.
- Profiles: `development` (a development build with the dev menu, for NFC and other native work), `preview` (internal testing, APK on Android), `production` (store; build numbers increase automatically).
