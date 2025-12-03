const { getDB } = require('../database');

const db = getDB();

console.log('Checking for duplicate contacts...');

db.all(
  `SELECT email, COUNT(*) as count, GROUP_CONCAT(id) as ids, GROUP_CONCAT(name) as names
   FROM contacts 
   WHERE email IS NOT NULL AND email != ''
   GROUP BY LOWER(TRIM(email))
   HAVING COUNT(*) > 1`,
  [],
  (err, duplicates) => {
    if (err) {
      console.error('Error checking duplicates:', err);
      process.exit(1);
    }

    if (duplicates.length === 0) {
      console.log('✓ No duplicate contacts found');
    } else {
      console.log(`\nFound ${duplicates.length} duplicate email(s):\n`);
      duplicates.forEach(dup => {
        console.log(`Email: ${dup.email}`);
        console.log(`  Count: ${dup.count}`);
        console.log(`  IDs: ${dup.ids}`);
        console.log(`  Names: ${dup.names}`);
        console.log('');
      });
    }

    process.exit(0);
  }
);

