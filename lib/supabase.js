import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// null → приложение работает в демо-режиме на данных из lib/seed.js
export const sb = url && key ? createClient(url, key) : null;
