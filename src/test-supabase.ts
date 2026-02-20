
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Mimic verify environment in Node
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

let supabaseUrl = ''
let supabaseAnonKey = ''

try {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = value.trim()
    if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = value.trim()
  })
} catch (e) {
  console.error('Could not read .env file', e)
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Testing Supabase connection...')

  try {
    // 1. Check if we can select from foods
    const { data: foods, error: selectError } = await supabase
      .from('foods')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('Error selecting foods:', selectError);
    } else {
      console.log('Foods select successful:', foods);
      if (foods && foods.length > 0) {
        console.log('Shape of a food item:', Object.keys(foods[0]));
        if ('micros' in foods[0]) {
             console.log('micros column exists!');
        } else {
             console.log('micros column MISSING in returned data');
        }
      } else {
        console.log('Foods table is empty, trying insert test...');
      }
    }

    // 2. Try an insert with micros
    const testFood = {
      name: 'Test Food ' + Date.now(),
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 2,
      micros: { calcium: 10, iron: 5 }
      // user_id is optional if RLS permits or it's public
    };
    
    // Attempting insert. Note: If RLS is on, this might fail without auth.
    // However, the error we are chasing is "schema cache", which happens before RLS usually.
    // Or if RLS is strict, maybe anon can't see columns?
    // The previous error happened with authenticated user though.
    // We are using anon key here, so we might hit RLS issues, but let's see the error message.
    
    const { data: insertData, error: insertError } = await supabase
      .from('foods')
      .insert(testFood)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('Insert successful:', insertData);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

test()

