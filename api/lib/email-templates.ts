/*
 * Branded, responsive HTML email templates for DigitalCarda.
 * Every template returns { subject, html, text } and shares one layout, so all
 * emails look consistent. Email-client-safe: tables + inline styles only.
 */

const SITE = "https://digitalcarda.in";
const BRAND = {
  gold: "#F7B31C",
  goldDark: "#D97706",
  navy: "#14243E",
  ink: "#0F172A",
  sub: "#64748B",
  line: "#E8EDF3",
  soft: "#F6F8FB",
};

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

export const inr = (n: unknown) => "₹" + Number(n || 0).toLocaleString("en-IN");

/* ── Shared building blocks ──────────────────────────────────────────── */

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px"><tr><td align="center" bgcolor="${BRAND.gold}" style="border-radius:12px">
    <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${BRAND.ink};text-decoration:none;border-radius:12px">${esc(label)}</a>
  </td></tr></table>`;
}

function detailTable(rows: [string, string][], opts: { accentLast?: boolean } = {}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BRAND.line};border-radius:12px;overflow:hidden">
    ${rows.map(([k, v], i) => {
      const last = opts.accentLast && i === rows.length - 1;
      return `<tr>
        <td style="padding:11px 16px;background:${BRAND.soft};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${BRAND.sub};width:42%;border-bottom:1px solid ${BRAND.line}">${esc(k)}</td>
        <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:${last ? "16px" : "14px"};font-weight:${last ? "bold" : "normal"};color:${last ? BRAND.goldDark : BRAND.ink};border-bottom:1px solid ${BRAND.line}">${v}</td>
      </tr>`;
    }).join("")}
  </table>`;
}

/** Wrap content in the branded shell. `accent` sets the header strip mood. */
function layout(opts: { preheader: string; badge?: string; heading: string; bodyHtml: string; accent?: string }): string {
  const accent = opts.accent || BRAND.gold;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background:${BRAND.soft}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06)">
        <!-- header -->
        <tr><td style="background:${BRAND.navy};padding:22px 32px">
          <table role="presentation" width="100%"><tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#fff;letter-spacing:.2px">Digital<span style="color:${BRAND.gold}">Carda</span></td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#93a4bd">Digital Business Cards</td>
          </tr></table>
        </td></tr>
        <!-- accent strip -->
        <tr><td style="height:4px;background:${accent};line-height:4px;font-size:0">&nbsp;</td></tr>
        <!-- body -->
        <tr><td style="padding:34px 32px 12px">
          ${opts.badge ? `<div style="display:inline-block;padding:5px 12px;border-radius:999px;background:${BRAND.soft};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:${BRAND.goldDark};text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">${esc(opts.badge)}</div>` : ""}
          <h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:23px;line-height:1.25;color:${BRAND.ink}">${opts.heading}</h1>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#334155">${opts.bodyHtml}</div>
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:24px 32px 30px">
          <div style="border-top:1px solid ${BRAND.line};padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8">
            <a href="${SITE}" style="color:${BRAND.goldDark};text-decoration:none;font-weight:bold">digitalcarda.in</a> &nbsp;·&nbsp; Your all-in-one digital business card.<br>
            You're receiving this because you have a DigitalCarda account.
          </div>
        </td></tr>
      </table>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b6c0cf;padding:16px 0 0">© DigitalCarda · Made by Pacewalk</div>
    </td></tr>
  </table>
</body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
const hi = (name?: string | null) => p(`Hi ${esc(name || "there")},`);

/* ── Templates ───────────────────────────────────────────────────────── */

export function welcomeEmail(o: { name?: string; role?: string }): Email {
  const heading = "Welcome to DigitalCarda 🎉";
  const bodyHtml =
    hi(o.name) +
    p("Your account is ready. You can now create your digital business card, add products &amp; a gallery, capture leads, and share it anywhere with a single link or QR code.") +
    p("Here's how to get started:") +
    `<ul style="margin:0 0 14px;padding-left:20px;color:#334155">
      <li style="margin-bottom:6px">Fill in your business details &amp; logo</li>
      <li style="margin-bottom:6px">Add products, gallery and payment options</li>
      <li style="margin-bottom:6px">Share your card link &amp; start collecting leads</li>
    </ul>` +
    button("Go to your dashboard", `${SITE}/dashboard`);
  return {
    subject: "Welcome to DigitalCarda 🎉",
    html: layout({ preheader: "Your DigitalCarda account is ready — let's build your card.", badge: "Welcome", heading, bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nWelcome to DigitalCarda! Your account is ready. Build your digital card, add products & gallery, and start capturing leads.\n\nDashboard: ${SITE}/dashboard`,
  };
}

export function leadNotificationEmail(o: { name: string; email?: string | null; contact?: string | null; message?: string | null; slug?: string | null; cardName?: string | null }): Email {
  const label = o.cardName || o.slug || "your card";
  const bodyHtml =
    p(`You just received a new enquiry on <strong>${esc(label)}</strong>.`) +
    detailTable([
      ["Name", esc(o.name || "—")],
      ["Email", o.email ? `<a href="mailto:${esc(o.email)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.email)}</a>` : "—"],
      ["Phone", o.contact ? `<a href="tel:${esc(o.contact)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.contact)}</a>` : "—"],
      ["Message", esc(o.message || "—")],
    ]) +
    (o.slug ? button("View card", `${SITE}/${esc(o.slug)}`) : "");
  return {
    subject: `New lead: ${o.name || "Enquiry"} — ${label}`,
    html: layout({ preheader: `New enquiry from ${o.name} on ${label}`, badge: "New Lead", heading: "You've got a new lead 🎯", bodyHtml, accent: "#22C55E" }),
    text: `New lead on ${label}\n\nName: ${o.name}\nEmail: ${o.email || "—"}\nPhone: ${o.contact || "—"}\nMessage: ${o.message || "—"}`,
  };
}

export function hotLeadEmail(o: { name: string; email?: string | null; contact?: string | null; message?: string | null; slug?: string | null; cardName?: string | null }): Email {
  const label = o.cardName || o.slug || "your card";
  const bodyHtml =
    p(`<strong style="color:#EA580C">This looks like a high-intent lead</strong> — reach out fast. Enquiry on <strong>${esc(label)}</strong>:`) +
    detailTable([
      ["Name", esc(o.name || "—")],
      ["Email", o.email ? `<a href="mailto:${esc(o.email)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.email)}</a>` : "—"],
      ["Phone", o.contact ? `<a href="tel:${esc(o.contact)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.contact)}</a>` : "—"],
      ["Message", esc(o.message || "—")],
    ]) +
    (o.contact ? button("Call now", `tel:${esc(o.contact)}`) : o.slug ? button("View card", `${SITE}/${esc(o.slug)}`) : "");
  return {
    subject: `🔥 Hot lead: ${o.name || "Enquiry"} — ${label}`,
    html: layout({ preheader: `High-intent enquiry from ${o.name} — respond fast`, badge: "🔥 Hot Lead", heading: "🔥 Hot lead — respond fast", bodyHtml, accent: "#EA580C" }),
    text: `HOT LEAD on ${label}\n\nName: ${o.name}\nEmail: ${o.email || "—"}\nPhone: ${o.contact || "—"}\nMessage: ${o.message || "—"}`,
  };
}

export function paymentSubmittedEmail(o: { name?: string; planName: string; amount: number; reference: string; method?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`We've received your payment details for the <strong>${esc(o.planName)}</strong> plan. Our team is verifying it now — your plan activates as soon as it's confirmed (usually within a few hours).`) +
    detailTable([
      ["Plan", esc(o.planName)],
      ["Method", esc((o.method || "").toUpperCase() || "—")],
      ["Reference", esc(o.reference)],
      ["Amount", inr(o.amount)],
    ], { accentLast: true }) +
    p(`We'll email you the moment it's verified.`);
  return {
    subject: `Payment received — ${o.planName} (under review)`,
    html: layout({ preheader: "We're verifying your payment — plan activates shortly.", badge: "Payment · Pending", heading: "Payment received ⏳", bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nWe received your ${o.planName} payment (ref ${o.reference}, ${inr(o.amount)}). It's under verification and your plan activates once confirmed.`,
  };
}

export function paymentToVerifyAdminEmail(o: { name?: string; email?: string; planName: string; amount: number; reference: string; method?: string }): Email {
  const bodyHtml =
    p(`A customer submitted a manual payment that needs your verification.`) +
    detailTable([
      ["Customer", esc(o.name || "—")],
      ["Email", esc(o.email || "—")],
      ["Plan", esc(o.planName)],
      ["Method", esc((o.method || "").toUpperCase() || "—")],
      ["Reference", esc(o.reference)],
      ["Amount", inr(o.amount)],
    ], { accentLast: true }) +
    button("Review in admin", `${SITE}/admin/payments`);
  return {
    subject: `Payment to verify: ${o.planName} — ${inr(o.amount)}`,
    html: layout({ preheader: `${o.name} submitted a ${o.planName} payment to verify.`, badge: "Action needed", heading: "New payment to verify 🔎", bodyHtml, accent: "#3B82F6" }),
    text: `New payment to verify.\n\nCustomer: ${o.name} (${o.email})\nPlan: ${o.planName}\nRef: ${o.reference}\nAmount: ${inr(o.amount)}\n\nReview: ${SITE}/admin/payments`,
  };
}

export function paymentVerifiedEmail(o: { name?: string; planName: string; amount: number; billingCycle?: string; invoiceNo: string; validTill: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your payment is verified and your <strong>${esc(o.planName)}</strong> plan is now <strong>active</strong> — your card is live and every feature is unlocked. 🎉`) +
    `<p style="margin:18px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.5px">Invoice</p>` +
    detailTable([
      ["Invoice no.", esc(o.invoiceNo)],
      ["Plan", esc(o.planName)],
      ["Billing", esc((o.billingCycle || "").replace(/^\w/, (m) => m.toUpperCase()) || "—")],
      ["Valid till", esc(o.validTill)],
      ["Amount paid", inr(o.amount)],
    ], { accentLast: true }) +
    button("Open dashboard", `${SITE}/dashboard`);
  return {
    subject: `Payment confirmed — ${o.planName} is active 🎉`,
    html: layout({ preheader: `Your ${o.planName} plan is active. Invoice ${o.invoiceNo}.`, badge: "Payment · Confirmed", heading: "You're all set 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour ${o.planName} plan is active.\nInvoice: ${o.invoiceNo}\nValid till: ${o.validTill}\nAmount: ${inr(o.amount)}\n\nDashboard: ${SITE}/dashboard`,
  };
}

export function paymentRejectedEmail(o: { name?: string; planName: string; note?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`We couldn't verify your <strong>${esc(o.planName)}</strong> payment.${o.note ? ` <br><br><em style="color:${BRAND.sub}">Reason: ${esc(o.note)}</em>` : ""}`) +
    p("Please double-check the payment reference and submit again — or reply to this email and we'll help sort it out.") +
    button("Try again", `${SITE}/dashboard/subscription`);
  return {
    subject: `Couldn't verify your ${o.planName} payment`,
    html: layout({ preheader: "We couldn't verify your payment — please try again.", badge: "Payment · Action needed", heading: "Payment not verified", bodyHtml, accent: "#EF4444" }),
    text: `Hi ${o.name || "there"},\n\nWe couldn't verify your ${o.planName} payment.${o.note ? ` Reason: ${o.note}.` : ""} Please check the reference and try again: ${SITE}/dashboard/subscription`,
  };
}

export function passwordChangedEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("This is a confirmation that your DigitalCarda account password was just changed.") +
    p(`If this was you, no action is needed. <strong>If you didn't change it</strong>, reset your password immediately and contact us.`) +
    button("Secure your account", `${SITE}/dashboard/settings`);
  return {
    subject: "Your password was changed",
    html: layout({ preheader: "Your DigitalCarda password was just changed.", badge: "Security", heading: "Password changed 🔒", bodyHtml, accent: "#3B82F6" }),
    text: `Hi ${o.name || "there"},\n\nYour DigitalCarda password was just changed. If this wasn't you, reset it immediately: ${SITE}/dashboard/settings`,
  };
}

export function passwordResetEmail(o: { name?: string; link: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("We received a request to reset your DigitalCarda password. Click below to choose a new one — this link expires in 60 minutes.") +
    button("Reset password", o.link) +
    p(`<span style="color:${BRAND.sub};font-size:13px">If you didn't request this, you can safely ignore this email — your password stays the same.</span>`);
  return {
    subject: "Reset your DigitalCarda password",
    html: layout({ preheader: "Reset your password — link expires in 60 minutes.", badge: "Security", heading: "Reset your password", bodyHtml, accent: "#3B82F6" }),
    text: `Hi ${o.name || "there"},\n\nReset your DigitalCarda password (link expires in 60 min): ${o.link}\n\nDidn't request this? Ignore this email.`,
  };
}

export function trialEndingEmail(o: { name?: string; daysLeft: number; cardUrl?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your free trial ends in <strong style="color:${BRAND.goldDark}">${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"}</strong>. After that your card is paused and won't be visible to visitors.`) +
    p("Upgrade now to keep your card live, keep capturing leads, and unlock every feature — plus a limited-time discount waiting on your dashboard.") +
    button("Upgrade & keep my card live", `${SITE}/dashboard/subscription`);
  return {
    subject: `⏳ Your card goes offline in ${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"}`,
    html: layout({ preheader: `Only ${o.daysLeft} day(s) left on your trial — upgrade to stay live.`, badge: "Trial ending", heading: `${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"} left on your trial ⏳`, bodyHtml, accent: BRAND.gold }),
    text: `Hi ${o.name || "there"},\n\nYour trial ends in ${o.daysLeft} day(s) — after that your card is paused. Upgrade to stay live: ${SITE}/dashboard/subscription`,
  };
}

/* ── Owner / admin alerts ────────────────────────────────────────────── */

export function newSignupAdminEmail(o: { name?: string; email?: string; role?: string; phone?: string | null }): Email {
  const bodyHtml =
    p(`A new ${esc(o.role || "customer")} just created a free-trial account on DigitalCarda.`) +
    detailTable([
      ["Name", esc(o.name || "—")],
      ["Email", esc(o.email || "—")],
      ["Phone", esc(o.phone || "—")],
      ["Role", esc(o.role || "customer")],
    ]) +
    button("View in admin", `${SITE}/admin/customers`);
  return {
    subject: `New signup: ${o.name || o.email || "New user"}`,
    html: layout({ preheader: `${o.name || o.email} started a free trial.`, badge: "New Signup", heading: "New account created 🎉", bodyHtml, accent: "#22C55E" }),
    text: `New signup on DigitalCarda.\n\nName: ${o.name}\nEmail: ${o.email}\nRole: ${o.role}`,
  };
}

export function referralSignupAdminEmail(o: { newUserName?: string; newUserEmail?: string; referrerName?: string; code?: string }): Email {
  const bodyHtml =
    p(`Someone joined through the <strong>Refer &amp; Earn</strong> program.`) +
    detailTable([
      ["New user", esc(o.newUserName || "—")],
      ["Email", esc(o.newUserEmail || "—")],
      ["Referred by", esc(o.referrerName || "—")],
      ["Referral code", esc(o.code || "—")],
    ]) +
    p(`<span style="color:${BRAND.sub};font-size:13px">The referrer earns a reward once this user upgrades to a paid plan.</span>`);
  return {
    subject: `Referral signup: ${o.newUserName || "New user"} (via ${o.referrerName || o.code || "referral"})`,
    html: layout({ preheader: `${o.newUserName} joined via ${o.referrerName}'s referral.`, badge: "Referral", heading: "New referral signup 🔗", bodyHtml, accent: "#8B5CF6" }),
    text: `Referral signup.\n\nNew user: ${o.newUserName} (${o.newUserEmail})\nReferred by: ${o.referrerName}\nCode: ${o.code}`,
  };
}

export function payoutRequestAdminEmail(o: { name?: string; email?: string; amount: number; method: string; destination: string; accountName?: string | null; ifsc?: string | null }): Email {
  const rows: [string, string][] = [
    ["Requested by", esc(o.name || "—")],
    ["Email", esc(o.email || "—")],
    ["Method", esc((o.method || "").toUpperCase())],
    ["Destination", esc(o.destination)],
  ];
  if (o.accountName) rows.push(["Account name", esc(o.accountName)]);
  if (o.ifsc) rows.push(["IFSC", esc(o.ifsc)]);
  rows.push(["Amount", inr(o.amount)]);
  const bodyHtml =
    p(`A user requested a payout from their Refer &amp; Earn wallet. The funds are on hold until you process it.`) +
    detailTable(rows, { accentLast: true }) +
    button("Review payouts", `${SITE}/admin/referrals`);
  return {
    subject: `Payout request: ${inr(o.amount)} — ${o.name || o.email || "user"}`,
    html: layout({ preheader: `${o.name} requested a ${inr(o.amount)} payout.`, badge: "Action needed", heading: "New payout request 💸", bodyHtml, accent: "#3B82F6" }),
    text: `Payout request.\n\nUser: ${o.name} (${o.email})\nMethod: ${o.method}\nDestination: ${o.destination}\nAmount: ${inr(o.amount)}`,
  };
}

/* ── Reseller / partner application ──────────────────────────────────── */

export function resellerApplicationAdminEmail(o: { name?: string; email?: string; phone?: string | null; companyName?: string | null; message?: string | null }): Email {
  const rows: [string, string][] = [
    ["Name", esc(o.name || "—")],
    ["Email", esc(o.email || "—")],
    ["Phone", esc(o.phone || "—")],
    ["Company", esc(o.companyName || "—")],
    ["Message", esc(o.message || "—")],
  ];
  const bodyHtml =
    p("Someone applied to become a reseller partner. Review and approve or reject them in the admin panel.") +
    detailTable(rows) +
    button("Review application", `${SITE}/admin/reseller-applications`);
  return {
    subject: `Reseller application: ${o.name || o.email || "New partner"}`,
    html: layout({ preheader: `${o.name} wants to become a reseller.`, badge: "Action needed", heading: "New reseller application 🤝", bodyHtml, accent: "#8B5CF6" }),
    text: `New reseller application.\n\nName: ${o.name}\nEmail: ${o.email}\nPhone: ${o.phone || "—"}\nCompany: ${o.companyName || "—"}\nMessage: ${o.message || "—"}\n\nReview: ${SITE}/admin/reseller-applications`,
  };
}

export function resellerApplicationReceivedEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Thanks for applying to become a <strong>DigitalCarda reseller partner</strong>! 🤝") +
    p("Our team is reviewing your application. We'll email you as soon as it's approved — usually within 1–2 business days.") +
    p(`<span style="color:${BRAND.sub};font-size:13px">Questions? Just reply to this email.</span>`);
  return {
    subject: "We received your reseller application 🤝",
    html: layout({ preheader: "Thanks for applying — we're reviewing your application.", badge: "Application received", heading: "Application received 🤝", bodyHtml, accent: "#8B5CF6" }),
    text: `Hi ${o.name || "there"},\n\nThanks for applying to become a DigitalCarda reseller. We're reviewing your application and will email you once it's approved.`,
  };
}

export function resellerApprovedEmail(o: { name?: string; link: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Great news — your <strong>reseller partner</strong> application is <strong>approved</strong>! 🎉") +
    p("Set your password to activate your reseller account, then you can start onboarding customers and earning commissions.") +
    button("Set your password", o.link) +
    p(`<span style="color:${BRAND.sub};font-size:13px">This link expires in 60 minutes. If it expires, use “Forgot password” on the login page.</span>`);
  return {
    subject: "You're approved — welcome, partner! 🎉",
    html: layout({ preheader: "Your reseller application is approved — set your password.", badge: "Approved", heading: "You're a reseller now 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour reseller application is approved! Set your password to activate your account: ${o.link}`,
  };
}

export function resellerApprovedExistingEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Great news — your <strong>reseller partner</strong> application is <strong>approved</strong>! 🎉") +
    p("Your existing account has been upgraded to a reseller account. Just sign in with your usual password to access your reseller dashboard.") +
    button("Go to reseller dashboard", `${SITE}/reseller`);
  return {
    subject: "You're approved — welcome, partner! 🎉",
    html: layout({ preheader: "Your reseller application is approved.", badge: "Approved", heading: "You're a reseller now 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour reseller application is approved and your account is upgraded. Sign in to access your reseller dashboard: ${SITE}/reseller`,
  };
}

export function resellerRejectedEmail(o: { name?: string; note?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Thank you for your interest in becoming a DigitalCarda reseller. After review, we're unable to approve your application at this time.${o.note ? `<br><br><em style="color:${BRAND.sub}">${esc(o.note)}</em>` : ""}`) +
    p("You're welcome to use DigitalCarda as a customer, and you can reach out to us if your circumstances change.");
  return {
    subject: "Update on your reseller application",
    html: layout({ preheader: "An update on your reseller application.", badge: "Application", heading: "Reseller application update", bodyHtml, accent: "#64748B" }),
    text: `Hi ${o.name || "there"},\n\nThank you for applying. We're unable to approve your reseller application at this time.${o.note ? ` ${o.note}` : ""}`,
  };
}

export function trialEndedEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Your free trial has ended, so your digital card is now <strong>paused</strong> and hidden from visitors.") +
    p("Everything you built is safe. Upgrade any time to bring your card back online instantly and pick up right where you left off.") +
    button("Reactivate my card", `${SITE}/dashboard/subscription`);
  return {
    subject: "Your trial ended — reactivate your card anytime",
    html: layout({ preheader: "Your card is paused. Upgrade to bring it back online.", badge: "Trial ended", heading: "Your trial has ended", bodyHtml, accent: "#EF4444" }),
    text: `Hi ${o.name || "there"},\n\nYour trial ended and your card is paused. Your data is safe — upgrade to reactivate: ${SITE}/dashboard/subscription`,
  };
}
