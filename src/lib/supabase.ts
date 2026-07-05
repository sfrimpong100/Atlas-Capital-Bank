import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://avznrqmaqelegzeetioe.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2em5ycW1hcWVsZWd6ZWV0aW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjY2NDksImV4cCI6MjA5NjM0MjY0OX0.lFD_vmuCsDdyOt7ITdwgXAsIIICL2uHHs_-f89Q0woU";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);