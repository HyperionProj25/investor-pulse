import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getBrowserSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser credentials are missing.");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const getServiceSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service credentials are missing.");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
};
