import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL =
  "https://akbictykozgaeuvbqbjl.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Y4soeQaBE8hn8RazFTZPpQ_7eoaw_cB";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
