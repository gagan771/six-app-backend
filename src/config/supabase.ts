import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';
dotenv.config();

const supabase_url = process.env.SUPABASE_URL || '';
const service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';


const supabase = createClient(supabase_url, service_role_key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})


export const supabaseAdmin = supabase;