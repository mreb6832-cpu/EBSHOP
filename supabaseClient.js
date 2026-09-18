import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://pniivrnhhghaalrmlquo.supabase.co";

// Shyiramo Publishable key ya Supabase hano
const SUPABASE_PUBLISHABLE_KEY = "SHYIRAMO_KEY_YAWE_HANO";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

export const supabaseReady = true;
