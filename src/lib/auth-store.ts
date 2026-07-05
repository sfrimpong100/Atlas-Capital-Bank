import { supabase } from "@/lib/supabase";

export async function isAuthed(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return !!session;
}

export async function signIn(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return false;
  }

  return true;
}

export async function signOut() {
  await supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
}