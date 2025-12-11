const { getDB } = require('../database');
const db = getDB();

console.log('Migrating call log contacts to "Direct" type...');

db.serialize(() => {
  // Find all contacts that were created from call logs
  // These are contacts that:
  // 1. Have a phone number that matches a call log
  // 2. Are currently set to "Agent" type (the default during call log import)
  // 3. Were likely auto-created during call log upload
  
  db.all(
    `SELECT DISTINCT c.id, c.name, c.phone, c.contact_type
     FROM contacts c
     INNER JOIN call_logs cl ON c.phone = cl.phone_number
     WHERE c.contact_type = 'Agent'
     ORDER BY c.id`,
    [],
    (err, contacts) => {
      if (err) {
        console.error('Error fetching contacts:', err);
        process.exit(1);
      }

      console.log(`Found ${contacts.length} contacts created from call logs`);

      if (contacts.length === 0) {
        console.log('No contacts to migrate');
        process.exit(0);
      }

      let updatedCount = 0;
      let errorCount = 0;

      const updateContact = (contact, index) => {
        if (index >= contacts.length) {
          console.log(`\n✓ Migration complete!`);
          console.log(`  - Found ${contacts.length} contacts from call logs`);
          console.log(`  - Updated ${updatedCount} contacts to "Direct"`);
          if (errorCount > 0) {
            console.log(`  - ${errorCount} errors occurred`);
          }
          process.exit(0);
          return;
        }

        db.run(
          'UPDATE contacts SET contact_type = ? WHERE id = ?',
          ['Direct', contact.id],
          (updateErr) => {
            if (updateErr) {
              console.error(`Error updating contact ${contact.id} (${contact.name}):`, updateErr);
              errorCount++;
            } else {
              updatedCount++;
              console.log(`  ✓ Updated contact "${contact.name}" (${contact.phone}) to "Direct"`);
            }
            updateContact(contacts[index + 1], index + 1);
          }
        );
      };

      updateContact(contacts[0], 0);
    }
  );
});





