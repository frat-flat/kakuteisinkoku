import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!');
    console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
    console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'MISSING');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
