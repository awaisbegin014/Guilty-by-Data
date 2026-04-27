import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const updates = [
    {
      order_index: 1,
      title: "Phase I: The Suspect Matrix",
      description: "Profile the personnel and identify persons of interest.",
      objective: "Clean the HR database, engineer a Risk Score, and isolate the top 20 suspects.",
      case_brief: "We have a massive list of over 1,200 employees, but the data is messy and full of copies. The killer is hiding somewhere on this list. Your job is to clean up this data first. Then, find the people who are already marked as \"Under Investigation.\" Finally, you will score them based on their salary, overtime, and performance to see who is the biggest risk. We need you to cut this list down to the top 20 suspects."
    },
    {
      order_index: 2,
      title: "Phase II: The Lethal Ledger",
      description: "Conduct forensic analysis on employee financial records.",
      objective: "Isolate the poison window and locate the lethal transaction.",
      case_brief: "We now have our top 20 suspects. Next, we need to follow the money. The medical timeline shows the poison was given to Victor between October 10th and 11th. You must look at what these suspects bought during those exact dates. Don't let big, normal business expenses trick you. You are hunting for something very specific: hidden chemical purchases, lab tools, or strange vendors. Check their company credit cards and find out who bought the deadly poison."
    },
    {
      order_index: 3,
      title: "Phase III: Encrypted Shadows",
      description: "Analyze internal communication patterns for criminal intent.",
      objective: "Detect encrypted stealth bursts and calculate the final Guilt Multiplier.",
      case_brief: "Only 10 suspects are left. To catch the killer, we need to look at their digital footprints. Criminals do not talk openly. They use secret, locked messages sent very quickly in the dark. We call these \"Stealth Bursts.\" The computer logs we have are broken and hard to read. You must fix the logs, find out who sent the most secret messages, and check for angry words. Put all the clues together, do the final math, and catch Victor's killer once and for all."
    }
  ];

  for (const update of updates) {
    const { data, error } = await supabase
      .from('rounds')
      .update({
        title: update.title,
        description: update.description,
        objective: update.objective,
        case_brief: update.case_brief
      })
      .eq('order_index', update.order_index)
      .select('id');

    if (error) {
      console.error(`Error updating Round ${update.order_index}:`, error.message);
    } else if (!data || data.length === 0) {
      console.warn(`No round found for order_index ${update.order_index}`);
    } else {
      console.log(`Successfully updated Round ${update.order_index}`);
    }
  }
}

main().catch(console.error);
