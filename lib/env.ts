export function allowSignup(): boolean {
  return (process.env.ALLOW_SIGNUP ?? "true").trim().toLowerCase() === "true";
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function adminEmail(): string | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return email ? email : null;
}

export function isAdminEmail(email: string): boolean {
  const admin = adminEmail();
  return admin !== null && admin === email.toLowerCase();
}
