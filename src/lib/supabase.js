import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gqdtabkntozriqnrwlme.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZHRhYmtudG96cmlxbnJ3bG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODIzODQsImV4cCI6MjA3Mzk1ODM4NH0.7ri_VXDzJ3MdskjpNLlXlzSre9ebDS6RAM9F8empiMg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
