const ADMIN_AUTH_KEY = "atlas-admin-auth-v1";

export function isAdminAuthed() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "1";
}

export function adminSignIn(password: string) {
  if (password === "Pageboi123$#@") {
    localStorage.setItem(ADMIN_AUTH_KEY, "1");
    return true;
  }

  return false;
}

export function adminSignOut() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
}