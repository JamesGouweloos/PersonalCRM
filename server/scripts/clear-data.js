const { getDB } = require('../database');

const db = getDB();

console.log('Clearing email and contact data...');

// Clear communications (emails)
db.run('DELETE FROM communications WHERE type = ?', ['email'], function(err) {
  if (err) {
    console.error('Error clearing emails:', err);
  } else {
    console.log(`✓ Cleared ${this.changes} email records`);
  }
  
  // Clear contacts
  db.run('DELETE FROM contacts', function(err) {
    if (err) {
      console.error('Error clearing contacts:', err);
    } else {
      console.log(`✓ Cleared ${this.changes} contact records`);
      console.log('✓ Data clearing complete!');
      process.exit(0);
    }
  });
});

