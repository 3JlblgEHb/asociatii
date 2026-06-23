import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Asociatii <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data?.id };
}

export async function sendAnnouncementEmail({
  to,
  organizationName,
  title,
  content,
}: {
  to: string[];
  organizationName: string;
  title: string;
  content: string;
}) {
  return sendEmail({
    to,
    subject: `[${organizationName}] ${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${organizationName}</h2>
        <h3>${title}</h3>
        <div style="white-space: pre-wrap;">${content}</div>
        <hr />
        <p style="color: #666; font-size: 12px;">Trimis prin platforma Asociatii</p>
      </div>
    `,
  });
}

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  token,
  role,
}: {
  to: string;
  organizationName: string;
  inviterName: string;
  token: string;
  role: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${token}`;

  return sendEmail({
    to,
    subject: `Invitație în ${organizationName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invitație în ${organizationName}</h2>
        <p>${inviterName} te-a invitat să te alături ca <strong>${role}</strong>.</p>
        <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Acceptă invitația</a></p>
        <p style="color: #666; font-size: 12px;">Link expiră în 7 zile.</p>
      </div>
    `,
  });
}
