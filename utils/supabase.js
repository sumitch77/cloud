const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
   process.env.SUPABASE_KEY,
   {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
    },
  }
  );



module.exports = { supabase };