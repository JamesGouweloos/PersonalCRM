/**
 * Add "email" to opportunities source CHECK constraint
 * SQLite doesn't support modifying CHECK constraints, so we need to recreate the table
 */

const { getDB } = require('../database');
const db = getDB();

console.log('Adding "email" to opportunities source CHECK constraint...');

db.serialize(() => {
  // Step 1: Create new table with correct constraint
  db.run(`
    CREATE TABLE IF NOT EXISTS opportunities_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      contact_id INTEGER NOT NULL,
      stage_id INTEGER,
      source TEXT NOT NULL CHECK(source IN ('webform', 'cold_outreach', 'social', 'previous_enquiry', 'previous_client', 'forwarded', 'email')),
      sub_source TEXT NOT NULL,
      linked_opportunity_id INTEGER,
      assigned_to TEXT NOT NULL DEFAULT 'me',
      value REAL,
      currency TEXT DEFAULT 'USD',
      probability INTEGER DEFAULT 0,
      expected_close_date DATE,
      description TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'won', 'lost', 'reversed')),
      reversed_reason TEXT,
      form_id TEXT,
      form_submission_time DATETIME,
      campaign_id TEXT,
      lead_id TEXT,
      origin_list TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id),
      FOREIGN KEY (linked_opportunity_id) REFERENCES opportunities(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      process.exit(1);
    }
    console.log('✓ Created new opportunities table');

    // Step 2: Copy all data from old table to new table
    db.run(`
      INSERT INTO opportunities_new 
      (id, title, contact_id, stage_id, source, sub_source, linked_opportunity_id, assigned_to, 
       value, currency, probability, expected_close_date, description, status, reversed_reason,
       form_id, form_submission_time, campaign_id, lead_id, origin_list, created_at, updated_at, closed_at)
      SELECT 
      id, title, contact_id, stage_id, source, sub_source, linked_opportunity_id, assigned_to, 
      value, currency, probability, expected_close_date, description, status, reversed_reason,
      form_id, form_submission_time, campaign_id, lead_id, origin_list, created_at, updated_at, closed_at
      FROM opportunities
    `, (err) => {
      if (err) {
        console.error('Error copying data:', err);
        process.exit(1);
      }
      console.log('✓ Copied all opportunity data');

      // Step 3: Drop old table
      db.run('DROP TABLE opportunities', (err) => {
        if (err) {
          console.error('Error dropping old table:', err);
          process.exit(1);
        }
        console.log('✓ Dropped old opportunities table');

        // Step 4: Rename new table to original name
        db.run('ALTER TABLE opportunities_new RENAME TO opportunities', (err) => {
          if (err) {
            console.error('Error renaming table:', err);
            process.exit(1);
          }
          console.log('✓ Renamed new table to opportunities');
          console.log('✓ Opportunity source "email" added successfully!');
          process.exit(0);
        });
      });
    });
  });
});





