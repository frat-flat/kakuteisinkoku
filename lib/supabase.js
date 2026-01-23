import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('------- SUPABASE CONFIG ERROR -------');
    console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
    console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'MISSING');
    console.error('-------------------------------------');
    throw new Error('Supabase environment variables are missing. Check Vercel Settings.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
