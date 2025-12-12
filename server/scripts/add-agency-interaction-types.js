const { getDB } = require('../database');
const db = getDB();

console.log('Adding agency interaction types to activities table CHECK constraint...');

db.serialize(() => {
  // Step 1: Create new table with updated constraint
  db.run(`
    CREATE TABLE IF NOT EXISTS activities_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER,
      contact_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('email_sent', 'email_received', 'call_made', 'call_received', 'status_changed', 'note_added', 'follow_up_scheduled', 'social_dm', 'social_comment', 'social_lead_form', 'webform_submission', 'teams_message', 'teams_call', 'written_communication')),
      description TEXT NOT NULL,
      direction TEXT CHECK(direction IN ('inbound', 'outbound')),
      user TEXT NOT NULL,
      conversation_id TEXT,
      message_id TEXT,
      deep_link TEXT,
      platform TEXT,
      platform_thread_url TEXT,
      call_duration INTEGER,
      call_outcome TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new activities table:', err);
      process.exit(1);
    }
    console.log('✓ Created new activities table');

    // Step 2: Copy all data from old table to new table
    db.run(`
      INSERT INTO activities_new (id, opportunity_id, contact_id, type, description, direction, user, conversation_id, message_id, deep_link, platform, platform_thread_url, call_duration, call_outcome, created_at)
      SELECT id, opportunity_id, contact_id, type, description, direction, user, conversation_id, message_id, deep_link, platform, platform_thread_url, call_duration, call_outcome, created_at
      FROM activities
    `, (err) => {
      if (err) {
        console.error('Error copying data:', err);
        process.exit(1);
      }
      console.log('✓ Copied all activity data');

      // Step 3: Drop old table
      db.run('DROP TABLE activities', (err) => {
        if (err) {
          console.error('Error dropping old table:', err);
          process.exit(1);
        }
        console.log('✓ Dropped old activities table');

        // Step 4: Rename new table to original name
        db.run('ALTER TABLE activities_new RENAME TO activities', (err) => {
          if (err) {
            console.error('Error renaming table:', err);
            process.exit(1);
          }
          console.log('✓ Renamed new table to activities');
          console.log('✓ Agency interaction types added successfully!');
          console.log('  - teams_message');
          console.log('  - teams_call');
          console.log('  - written_communication');
          process.exit(0);
        });
      });
    });
  });
});






