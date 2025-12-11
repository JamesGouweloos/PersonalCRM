const { getDB } = require('../database');
const emailProcessor = require('../services/email-processor');
const outlookService = require('../services/outlook');

const db = getDB();

console.log('Reprocessing emails to create leads...\n');

// Get access token
db.get(
  'SELECT access_token, refresh_token, expires_at FROM oauth_tokens WHERE provider = ? ORDER BY updated_at DESC LIMIT 1',
  ['outlook'],
  async (err, tokenRow) => {
    if (err) {
      console.error('Error fetching token:', err);
      process.exit(1);
    }

    if (!tokenRow) {
      console.error('No Outlook token found. Please connect your Outlook account first.');
      process.exit(1);
    }

    let accessToken = tokenRow.access_token;

    // Check if token needs refresh
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
    const bufferTime = 30 * 60 * 1000; // 30 minutes
    const isExpired = expiresAt && (expiresAt.getTime() - bufferTime) < Date.now();

    if (tokenRow.refresh_token && (isExpired || !expiresAt)) {
      console.log('Refreshing access token...');
      try {
        const tokenData = await outlookService.refreshAccessToken(tokenRow.refresh_token);
        accessToken = tokenData.accessToken;
        
        // Update token in database
        const newExpiresAt = tokenData.expiresIn 
          ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
          : null;
        
        db.run(
          `UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = ?`,
          [tokenData.accessToken, tokenData.refreshToken || tokenRow.refresh_token, newExpiresAt, 'outlook'],
          () => {}
        );
      } catch (refreshErr) {
        console.error('Error refreshing token:', refreshErr);
        process.exit(1);
      }
    }

    // Get all emails with "Web General Enquiry" or "Web Tiger Enquiry" in subject
    db.all(
      `SELECT * FROM communications 
       WHERE type = 'email' 
       AND (subject LIKE '%Web General Enquiry%' OR subject LIKE '%Web Tiger Enquiry%')
       ORDER BY occurred_at DESC`,
      [],
      async (err, emails) => {
        if (err) {
          console.error('Error fetching emails:', err);
          process.exit(1);
        }

        console.log(`Found ${emails.length} email(s) to reprocess\n`);

        if (emails.length === 0) {
          console.log('No emails found to reprocess.');
          process.exit(0);
        }

        // Process each email
        let leadsCreated = 0;
        let errors = 0;

        for (const email of emails) {
          try {
            console.log(`Processing email ID ${email.id}: "${email.subject}"`);
            console.log(`  From: ${email.from_email}`);
            console.log(`  Contact ID: ${email.contact_id || '(None)'}`);
            
            const result = await emailProcessor.processEmail(email, accessToken, true);
            
            if (result.success) {
              console.log(`  ✓ Processed successfully`);
              if (result.ruleResults && Array.isArray(result.ruleResults)) {
                const leadResults = result.ruleResults.filter(rr => 
                  rr.result && rr.result.action === 'create_lead' && rr.result.success
                );
                if (leadResults.length > 0) {
                  leadsCreated += leadResults.length;
                  console.log(`  ✓ Lead(s) created: ${leadResults.length}`);
                }
              }
            } else {
              console.log(`  ✗ Error: ${result.error || 'Unknown error'}`);
              errors++;
            }
            console.log('');
          } catch (error) {
            console.error(`  ✗ Exception: ${error.message}`);
            errors++;
            console.log('');
          }
        }

        console.log('\n=== Summary ===');
        console.log(`Emails processed: ${emails.length}`);
        console.log(`Leads created: ${leadsCreated}`);
        console.log(`Errors: ${errors}`);

        // Check leads again
        db.all(
          `SELECT COUNT(*) as count FROM leads`,
          [],
          (err, rows) => {
            if (!err && rows.length > 0) {
              console.log(`\nTotal leads in database: ${rows[0].count}`);
            }
            process.exit(0);
          }
        );
      }
    );
  }
);

