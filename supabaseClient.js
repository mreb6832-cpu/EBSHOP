import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 
  "https://akbictykozgaeuvbqbjl.supabase.co";
const supabaseKey = 
  "sb_publishable_Y4soeQaBE8hn8RazFTZPpQ_7eoaw_cB";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
