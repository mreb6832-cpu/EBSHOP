import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  "https://pniivrnhhghaalrmlquo.supabase.co";

const SUPABASE_ANON_KEY =
  "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export const supabaseReady =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";
