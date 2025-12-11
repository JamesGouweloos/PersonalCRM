/**
 * Fix contact_type CHECK constraint to include 'Spam'
 * SQLite doesn't support modifying CHECK constraints, so we need to recreate the table
 */

const { getDB } = require('../database');
const db = getDB();

console.log('Fixing contact_type CHECK constraint to include "Spam"...');

db.serialize(() => {
  // Step 1: Create new table with correct constraint
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      company TEXT,
      title TEXT,
      notes TEXT,
      contact_type TEXT CHECK(contact_type IN ('Agent', 'Direct', 'Other', 'Spam')) DEFAULT 'Other',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      process.exit(1);
    }
    console.log('✓ Created new contacts table');

    // Step 2: Copy all data from old table to new table
    db.run(`
      INSERT INTO contacts_new (id, name, email, phone, company, title, notes, contact_type, created_at, updated_at)
      SELECT id, name, email, phone, company, title, notes, contact_type, created_at, updated_at
      FROM contacts
    `, (err) => {
      if (err) {
        console.error('Error copying data:', err);
        process.exit(1);
      }
      console.log('✓ Copied all contact data');

      // Step 3: Drop old table
      db.run('DROP TABLE contacts', (err) => {
        if (err) {
          console.error('Error dropping old table:', err);
          process.exit(1);
        }
        console.log('✓ Dropped old contacts table');

        // Step 4: Rename new table to original name
        db.run('ALTER TABLE contacts_new RENAME TO contacts', (err) => {
          if (err) {
            console.error('Error renaming table:', err);
            process.exit(1);
          }
          console.log('✓ Renamed new table to contacts');
          console.log('✓ Contact type constraint fixed! "Spam" is now allowed.');
          process.exit(0);
        });
      });
    });
  });
});





