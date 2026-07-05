import { supabase } from "@/lib/supabase";

type EmailPayload = {
  profile_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  event_type: string;
};

export async function queueEmail({
  profile_id,
  recipient_email,
  subject,
  body,
  event_type,
}: EmailPayload) {
  const { error } = await supabase.from("email_queue").insert({
    profile_id,
    recipient_email,
    subject,
    body,
    event_type,
    status: "pending",
  });

  if (error) {
    console.error("Email queue error:", error);
  }
}

export function transferSubmittedEmail({
  name,
  amount,
  recipient,
  reference,
}: {
  name: string;
  amount: string;
  recipient: string;
  reference: string;
}) {
  return `
Hello ${name},

Your transfer request has been received by Atlas Capital Bank.

Amount: ${amount}
Recipient: ${recipient}
Reference: ${reference}
Status: Pending Review

Our operations team will review and process your transfer shortly.

Atlas Capital Bank
Secure Digital Banking
`;
}

export function transferCompletedEmail({
  name,
  amount,
  recipient,
  reference,
}: {
  name: string;
  amount: string;
  recipient: string;
  reference: string;
}) {
  return `
Hello ${name},

Your transfer has been completed successfully.

Amount: ${amount}
Recipient: ${recipient}
Reference: ${reference}
Status: Completed

Thank you for banking with Atlas Capital Bank.

Atlas Capital Bank
Secure Digital Banking
`;
}

export function kycApprovedEmail(name: string) {
  return `
Hello ${name},

Your identity verification has been approved.

Your Atlas Capital Bank account is now verified.

Atlas Capital Bank
Secure Digital Banking
`;
}

export function kycRejectedEmail(name: string, reason?: string) {
  return `
Hello ${name},

Your identity verification was not approved.

Reason:
${reason || "Please review your submitted documents and upload valid verification documents."}

Atlas Capital Bank
Secure Digital Banking
`;
}

export function accountLockedEmail(name: string) {
  return `
Hello ${name},

Your Atlas Capital Bank account has been temporarily locked for security review.

Please contact support if you believe this was a mistake.

Atlas Capital Bank
Security Team
`;
}