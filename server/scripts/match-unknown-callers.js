const { getDB } = require('../database');
const db = getDB();

console.log('Matching Unknown callers to existing contacts by phone number...');

db.serialize(() => {
  // Find all call logs with "Unknown" contact names or no contact_id
  db.all(
    `SELECT cl.id, cl.phone_number, cl.contact_id, c.name as contact_name
     FROM call_logs cl
     LEFT JOIN contacts c ON cl.contact_id = c.id
     WHERE c.name LIKE '%Unknown%' OR c.name IS NULL OR cl.contact_id IS NULL`,
    [],
    (err, callLogs) => {
      if (err) {
        console.error('Error fetching call logs:', err);
        process.exit(1);
      }

      console.log(`Found ${callLogs.length} call logs with Unknown or missing contacts`);

      let matchedCount = 0;
      let updatedCount = 0;

      const processCallLog = (callLog, index) => {
        if (index >= callLogs.length) {
          console.log(`\n✓ Matching complete!`);
          console.log(`  - Checked ${callLogs.length} call logs`);
          console.log(`  - Matched ${matchedCount} phone numbers`);
          console.log(`  - Updated ${updatedCount} call logs`);
          process.exit(0);
          return;
        }

        const phoneNumber = callLog.phone_number;

        // Find existing contact with this phone number
        db.get(
          'SELECT id, name FROM contacts WHERE phone = ? AND (name NOT LIKE ? AND name IS NOT NULL) LIMIT 1',
          [phoneNumber, '%Unknown%'],
          (findErr, existingContact) => {
            if (findErr) {
              console.error(`Error finding contact for ${phoneNumber}:`, findErr);
              processCallLog(callLogs[index + 1], index + 1);
              return;
            }

            if (existingContact) {
              // Update call log to link to the existing contact
              db.run(
                'UPDATE call_logs SET contact_id = ? WHERE id = ?',
                [existingContact.id, callLog.id],
                (updateErr) => {
                  if (updateErr) {
                    console.error(`Error updating call log ${callLog.id}:`, updateErr);
                  } else {
                    matchedCount++;
                    updatedCount++;
                    console.log(`  ✓ Matched ${phoneNumber} to contact "${existingContact.name}" (ID: ${existingContact.id})`);
                  }
                  processCallLog(callLogs[index + 1], index + 1);
                }
              );
            } else {
              // No match found, continue to next
              processCallLog(callLogs[index + 1], index + 1);
            }
          }
        );
      };

      if (callLogs.length === 0) {
        console.log('No call logs to process');
        process.exit(0);
      }

      processCallLog(callLogs[0], 0);
    }
  );
});






