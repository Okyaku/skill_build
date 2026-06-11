import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ropxetguyjcmlimaypme.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcHhldGd1eWpjbWxpbWF5cG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODc2OTUsImV4cCI6MjA5NjQ2MzY5NX0.hV7NqqDfYU9ShqKZXbCiqdMmEAXse0g93pLxqiGenic';

console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Key exists:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
