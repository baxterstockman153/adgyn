import { Resend } from "resend";

// Lazily hold a single Resend client. If RESEND_API_KEY is not configured
// (e.g. local dev), we degrade gracefully: sending is skipped and callers
// fall back to sharing the invite link manually.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Verified sending identity. Once adgyn.com is verified in Resend, the default
// works. Before then, set RESEND_FROM to "onboarding@resend.dev" to test.
const FROM = process.env.RESEND_FROM || "Adgyn <invites@adgyn.com>";

export type SendResult = { sent: boolean; error?: string };

export async function sendInviteEmail({
  to,
  inviteUrl,
  orgName,
  orgType,
  role,
}: {
  to: string;
  inviteUrl: string;
  orgName: string;
  orgType: "venue" | "brand";
  role: string;
}): Promise<SendResult> {
  if (!resend) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const term = orgType === "venue" ? "host" : "guest";
  const verb = role === "member" ? "help manage" : "manage";
  const blurb =
    orgType === "venue"
      ? "add a QR code to your coffee sleeves and start earning from local advertising."
      : "advertise on local café sleeves and get discovered by nearby customers.";
  const subject = `You're invited to manage ${orgName} on Adgyn`;

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;letter-spacing:-0.01em;color:#1a1a1a;margin:0 0 24px">ad<span style="color:#7e22ce">gyn</span></div>
    <h1 style="font-size:20px;margin:0 0 16px">You're invited to Adgyn</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 12px">
      You've been invited to ${verb} <strong>${orgName}</strong> as a ${term} on Adgyn &mdash; ${blurb}
    </p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 24px">
      Click below to set up your account and accept the invite.
    </p>
    <a href="${inviteUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:600">
      Accept invite
    </a>
    <p style="font-size:13px;line-height:1.5;color:#666;margin:24px 0 0">
      Or paste this link into your browser:<br />
      <a href="${inviteUrl}" style="color:#666">${inviteUrl}</a>
    </p>
    <p style="font-size:13px;color:#999;margin:16px 0 0">This invite expires in 7 days.</p>
  </div>`;

  const text = `You've been invited to ${verb} ${orgName} as a ${term} on Adgyn — ${blurb}

Accept your invite: ${inviteUrl}

This invite expires in 7 days.`;

  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
