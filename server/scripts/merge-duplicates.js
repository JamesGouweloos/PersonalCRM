const { getDB } = require('../database');

const db = getDB();

console.log('Finding and merging duplicate contacts...');

// Find all duplicate emails (case-insensitive)
db.all(
  `SELECT LOWER(TRIM(email)) as normalized_email, 
          GROUP_CONCAT(id) as ids, 
          COUNT(*) as count
   FROM contacts 
   WHERE email IS NOT NULL AND email != ''
   GROUP BY LOWER(TRIM(email))
   HAVING COUNT(*) > 1`,
  [],
  (err, duplicates) => {
    if (err) {
      console.error('Error finding duplicates:', err);
      process.exit(1);
    }

    if (duplicates.length === 0) {
      console.log('✓ No duplicates found');
      process.exit(0);
    }

    console.log(`Found ${duplicates.length} duplicate email(s) to merge\n`);

    let merged = 0;
    let processed = 0;

    duplicates.forEach((dup, index) => {
      const ids = dup.ids.split(',').map(id => parseInt(id.trim()));
      const keepId = ids[0]; // Keep the first contact
      const deleteIds = ids.slice(1); // Delete the rest

      // Get the contact we're keeping
      db.get('SELECT * FROM contacts WHERE id = ?', [keepId], (keepErr, keepContact) => {
        if (keepErr) {
          console.error(`Error getting contact ${keepId}:`, keepErr);
          processed++;
          if (processed === duplicates.length) {
            console.log(`\n✓ Merged ${merged} duplicate groups`);
            process.exit(0);
          }
          return;
        }

        // Update all communications to point to the kept contact
        const updatePromises = deleteIds.map(deleteId => {
          return new Promise((resolve) => {
            db.run(
              'UPDATE communications SET contact_id = ? WHERE contact_id = ?',
              [keepId, deleteId],
              (updateErr) => {
                if (updateErr) {
                  console.error(`Error updating communications for contact ${deleteId}:`, updateErr);
                }
                resolve();
              }
            );
          });
        });

        Promise.all(updatePromises).then(() => {
          // Delete duplicate contacts
          const deletePromises = deleteIds.map(deleteId => {
            return new Promise((resolve) => {
              db.run('DELETE FROM contacts WHERE id = ?', [deleteId], (deleteErr) => {
                if (deleteErr) {
                  console.error(`Error deleting contact ${deleteId}:`, deleteErr);
                } else {
                  console.log(`  ✓ Merged contact ${deleteId} into ${keepId} (${keepContact.email})`);
                }
                resolve();
              });
            });
          });

          Promise.all(deletePromises).then(() => {
            merged++;
            processed++;
            if (processed === duplicates.length) {
              console.log(`\n✓ Merged ${merged} duplicate groups`);
              console.log('✓ Duplicate merge complete!');
              process.exit(0);
            }
          });
        });
      });
    });
  }
);





