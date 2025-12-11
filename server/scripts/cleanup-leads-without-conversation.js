const { getDB } = require('../database');

console.log('Cleaning up leads without conversation_id...');

const db = getDB();

db.serialize(() => {
  // First, check how many leads don't have conversation_id
  db.get(
    `SELECT COUNT(*) as count FROM leads WHERE conversation_id IS NULL OR conversation_id = ''`,
    [],
    (err, result) => {
      if (err) {
        console.error('Error counting leads:', err);
        process.exit(1);
      }

      const countToDelete = result.count;
      console.log(`Found ${countToDelete} lead(s) without conversation_id`);

      if (countToDelete === 0) {
        console.log('No leads to clean up. All leads have conversation_id.');
        process.exit(0);
      }

      // Delete leads without conversation_id
      db.run(
        `DELETE FROM leads WHERE conversation_id IS NULL OR conversation_id = ''`,
        [],
        function(deleteErr) {
          if (deleteErr) {
            console.error('Error deleting leads:', deleteErr);
            process.exit(1);
          }

          console.log(`✓ Successfully deleted ${this.changes} lead(s) without conversation_id`);
          process.exit(0);
        }
      );
    }
  );
});





