const { getDB } = require('../database');

const db = getDB();

console.log('Checking leads in database...\n');

// Check all leads
db.all(
  `SELECT 
    l.id,
    l.contact_id,
    l.source,
    l.status,
    l.assigned_to,
    l.notes,
    l.value,
    l.created_at,
    c.name as contact_name,
    c.email as contact_email
  FROM leads l
  LEFT JOIN contacts c ON l.contact_id = c.id
  ORDER BY l.created_at DESC`,
  [],
  (err, leads) => {
    if (err) {
      console.error('Error fetching leads:', err);
      process.exit(1);
    }

    console.log(`Found ${leads.length} lead(s) in database:\n`);

    if (leads.length === 0) {
      console.log('No leads found. This could mean:');
      console.log('1. Email rules are not processing emails correctly');
      console.log('2. The "Web General Enquiry" rule is not matching');
      console.log('3. Leads are being created but with different criteria\n');
    } else {
      leads.forEach((lead, index) => {
        console.log(`Lead ${index + 1}:`);
        console.log(`  ID: ${lead.id}`);
        console.log(`  Contact: ${lead.contact_name || '(Unknown)'} (${lead.contact_email || 'No email'})`);
        console.log(`  Source: ${lead.source}`);
        console.log(`  Status: ${lead.status}`);
        console.log(`  Assigned To: ${lead.assigned_to}`);
        console.log(`  Notes: ${lead.notes || '(None)'}`);
        console.log(`  Created: ${lead.created_at}`);
        console.log('');
      });
    }

    // Check email rules
    console.log('\nChecking email rules...\n');
    db.all(
      `SELECT id, name, enabled, priority, conditions, actions 
       FROM email_rules 
       WHERE name LIKE '%Web General Enquiry%' OR name LIKE '%Create Lead%'
       ORDER BY priority DESC`,
      [],
      (err, rules) => {
        if (err) {
          console.error('Error fetching rules:', err);
          process.exit(1);
        }

        console.log(`Found ${rules.length} relevant rule(s):\n`);
        rules.forEach((rule, index) => {
          console.log(`Rule ${index + 1}:`);
          console.log(`  Name: ${rule.name}`);
          console.log(`  Enabled: ${rule.enabled === 1 ? 'Yes' : 'No'}`);
          console.log(`  Priority: ${rule.priority}`);
          console.log(`  Conditions: ${rule.conditions}`);
          console.log(`  Actions: ${rule.actions}`);
          console.log('');
        });

        // Check recent emails with "Web General Enquiry" in subject
        console.log('\nChecking recent emails with "Web General Enquiry" in subject...\n');
        db.all(
          `SELECT id, subject, from_email, contact_id, direction, created_at
           FROM communications
           WHERE type = 'email' AND subject LIKE '%Web General Enquiry%'
           ORDER BY created_at DESC
           LIMIT 10`,
          [],
          (err, emails) => {
            if (err) {
              console.error('Error fetching emails:', err);
              process.exit(1);
            }

            console.log(`Found ${emails.length} email(s) with "Web General Enquiry" in subject:\n`);
            emails.forEach((email, index) => {
              console.log(`Email ${index + 1}:`);
              console.log(`  ID: ${email.id}`);
              console.log(`  Subject: ${email.subject}`);
              console.log(`  From: ${email.from_email || '(Unknown)'}`);
              console.log(`  Contact ID: ${email.contact_id || '(Not linked)'}`);
              console.log(`  Direction: ${email.direction || '(Unknown)'}`);
              console.log(`  Created: ${email.created_at}`);
              console.log('');
            });

            process.exit(0);
          }
        );
      }
    );
  }
);






