import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://zfieaqyctllvpxqhfuds.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_MiaCjYNbhsvWn4hadaSFaQ_jokbx0mG";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

export const supabaseReady = true;
