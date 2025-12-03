const { getDB } = require('../database');

const db = getDB();

console.log('Fixing database index...');

// Drop the problematic unique index if it exists
db.run('DROP INDEX IF EXISTS idx_contacts_email_unique', (err) => {
  if (err) {
    console.error('Error dropping index:', err);
  } else {
    console.log('✓ Dropped problematic index (if it existed)');
  }
  
  // The UNIQUE constraint on the email column will still work for exact duplicates
  // Application-level checking handles case-insensitive duplicates
  console.log('✓ Database fix complete');
  process.exit(0);
});

