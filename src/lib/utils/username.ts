// Supabase Auth's user model is email-based — there's no native "username" identity type.
// To offer username+password auth without standing up a custom auth backend, we derive a
// synthetic email from the username and use that internally for signUp/signInWithPassword.
// This is safe only because "Confirm email" is off in the Supabase dashboard (see rule.md) —
// no email is ever actually sent to this fake address.
const USERNAME_EMAIL_DOMAIN = "voca-user.internal";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}
