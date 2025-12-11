const { getDB } = require('../database');

const db = getDB();

console.log('Adding conversation_id column to leads table...\n');

db.serialize(() => {
  // Check if column already exists
  db.all("PRAGMA table_info(leads)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table info:', err);
      process.exit(1);
    }

    const hasConversationId = columns.some(col => col.name === 'conversation_id');
    
    if (hasConversationId) {
      console.log('conversation_id column already exists. Skipping migration.');
      process.exit(0);
    }

    // Add conversation_id column
    db.run(
      'ALTER TABLE leads ADD COLUMN conversation_id TEXT',
      (err) => {
        if (err) {
          console.error('Error adding conversation_id column:', err);
          process.exit(1);
        }

        console.log('✓ Added conversation_id column to leads table');

        // Try to populate conversation_id from communications for existing leads
        console.log('\nPopulating conversation_id for existing leads...');
        
        db.run(
          `UPDATE leads 
           SET conversation_id = (
             SELECT c.conversation_id 
             FROM communications c 
             WHERE c.contact_id = leads.contact_id 
             AND c.type = 'email'
             AND c.subject LIKE '%' || leads.notes || '%'
             ORDER BY c.occurred_at ASC
             LIMIT 1
           )
           WHERE conversation_id IS NULL`,
          (updateErr) => {
            if (updateErr) {
              console.warn('Warning: Could not populate conversation_id for existing leads:', updateErr.message);
            } else {
              console.log('✓ Populated conversation_id for existing leads where possible');
            }
            
            // Create index for better performance
            db.run(
              'CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id)',
              (indexErr) => {
                if (indexErr) {
                  console.warn('Warning: Could not create index:', indexErr.message);
                } else {
                  console.log('✓ Created index on conversation_id');
                }
                
                console.log('\n✓ Migration complete!');
                process.exit(0);
              }
            );
          }
        );
      }
    );
  });
});





