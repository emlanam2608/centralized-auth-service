import { createClient } from "@supabase/supabase-js";
import { environment } from "./environment";

// Ensure environment variables are defined
if (
  !environment.supabaseUrl ||
  !environment.supabaseKey ||
  !environment.supabaseServiceKey
) {
  throw new Error("Supabase configuration is missing");
}

// Create Supabase client with anon key (for client-side operations)
export const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseKey
);

// Create Supabase admin client with service role key (for admin operations)
export const supabaseAdmin = createClient(
  environment.supabaseUrl,
  environment.supabaseServiceKey
);
