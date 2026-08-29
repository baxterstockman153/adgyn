// Hardcoded admin emails — replace with a proper role system later
const ADMIN_EMAILS = [
  "mark.huber153@gmail.com",
  "uxhuber@gmail.com",
];

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
