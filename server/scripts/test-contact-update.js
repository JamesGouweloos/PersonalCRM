/**
 * Test script to verify contact update functionality
 */

const { getDB } = require('../database');
const db = getDB();

console.log('Testing contact update...');

// Get a contact to test with
db.get('SELECT * FROM contacts LIMIT 1', [], (err, contact) => {
  if (err) {
    console.error('Error fetching contact:', err);
    process.exit(1);
  }

  if (!contact) {
    console.log('No contacts found to test with');
    process.exit(0);
  }

  console.log('Found contact:', { id: contact.id, name: contact.name, email: contact.email });

  // Test update
  const testUpdate = {
    name: contact.name,
    email: contact.email,
    phone: contact.phone || null,
    company: contact.company || null,
    title: contact.title || null,
    notes: contact.notes || null,
    contact_type: 'Other'
  };

  db.run(
    'UPDATE contacts SET name = ?, email = ?, phone = ?, company = ?, title = ?, notes = ?, contact_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [testUpdate.name, testUpdate.email, testUpdate.phone, testUpdate.company, testUpdate.title, testUpdate.notes, testUpdate.contact_type, contact.id],
    function(updateErr) {
      if (updateErr) {
        console.error('Error updating contact:', updateErr);
        console.error('Error details:', {
          code: updateErr.code,
          message: updateErr.message,
          errno: updateErr.errno
        });
        process.exit(1);
      }

      console.log('✓ Update successful, changes:', this.changes);

      // Fetch updated contact
      db.get('SELECT * FROM contacts WHERE id = ?', [contact.id], (fetchErr, updated) => {
        if (fetchErr) {
          console.error('Error fetching updated contact:', fetchErr);
          process.exit(1);
        }
        console.log('✓ Updated contact:', updated);
        process.exit(0);
      });
    }
  );
});





