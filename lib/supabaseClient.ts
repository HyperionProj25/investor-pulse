import { createClient } from "@supabase/supabase-js";
import { VALIDATION_ERRORS } from "./errorMessages";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getBrowserSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(VALIDATION_ERRORS.SUPABASE_BROWSER_CONFIG_MISSING);
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const getServiceSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(VALIDATION_ERRORS.SUPABASE_SERVICE_CONFIG_MISSING);
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
};
