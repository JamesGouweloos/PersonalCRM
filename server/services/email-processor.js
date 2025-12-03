const { getDB } = require('../database');
const emailRules = require('./email-rules');
const categoryMapper = require('./category-mapper');
const outlookService = require('./outlook');

/**
 * Email Processor Service
 * Orchestrates email processing through rules engine and category mapping
 */

/**
 * Process a single email through rules and category mapping
 * @param {Object} email - Email object to process
 * @param {string} accessToken - Outlook access token
 * @param {boolean} forceReprocess - If true, process even if already processed
 */
async function processEmail(email, accessToken = null, forceReprocess = false) {
  const db = getDB();
  
  try {
    // Check if email already processed (unless forcing reprocess)
    if (!forceReprocess && email.processed_by_rules) {
      console.log(`[Email Processor] Email ${email.id || email.external_id} already processed, skipping`);
      return { success: true, skipped: true };
    }

    // Fetch categories if not already present and we have access token
    if (accessToken && email.external_id && (!email.categories || email.categories.length === 0)) {
      try {
        const categories = await outlookService.fetchEmailCategories(email.external_id, accessToken);
        email.categories = categories;
      } catch (err) {
        console.warn(`[Email Processor] Could not fetch categories for email ${email.external_id}:`, err.message);
      }
    }

    // Map categories to CRM fields
    const categoryMapping = await categoryMapper.mapCategoriesToCRMFields(email);
    
    // Determine email direction if not already set
    // Direction is typically set during sync, but we'll infer it here if missing
    let emailDirection = email.direction;
    if (!emailDirection) {
      // Check if we can infer direction from from_email vs to_email
      // For now, assume inbound if direction not set (most emails are inbound)
      emailDirection = 'inbound';
    }

    // Enhance email with category mapping results
    const enhancedEmail = {
      ...email,
      ...categoryMapping,
      categories: categoryMapping.categories,
      direction: emailDirection
    };

    // Log email data for debugging (log all emails when forceReprocess is true)
    if (forceReprocess || !email.processed_by_rules || email.id <= 5) {
      console.log(`[Email Processor] Processing email ${enhancedEmail.id}:`, {
        from_email: enhancedEmail.from_email,
        contact_id: enhancedEmail.contact_id || 'NULL',
        direction: enhancedEmail.direction,
        has_contact: !!enhancedEmail.contact_id,
        subject: enhancedEmail.subject?.substring(0, 50) || '(No Subject)'
      });
    }

    // Process through rules engine
    const ruleResults = await emailRules.processEmail(enhancedEmail, db);

    // Update email with category information and mark as processed
    const categoriesJson = JSON.stringify(enhancedEmail.categories || []);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE communications 
         SET categories = ?, processed_by_rules = 1, is_flagged = ?, flag_due_date = ?
         WHERE id = ? OR external_id = ?`,
        [
          categoriesJson,
          enhancedEmail.is_flagged ? 1 : 0,
          enhancedEmail.flag_due_date || null,
          email.id,
          email.external_id || email.id
        ],
        function(err) {
          if (err) {
            return reject(err);
          }

          resolve({
            success: true,
            emailId: email.id || email.external_id,
            categoryMapping,
            ruleResults,
            processed: true
          });
        }
      );
    });
  } catch (error) {
    console.error(`[Email Processor] Error processing email ${email.id || email.external_id}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Process multiple emails in batch
 * @param {Array} emails - Array of email objects to process
 * @param {string} accessToken - Outlook access token
 * @param {boolean} forceReprocess - If true, process even if already processed
 */
async function processEmails(emails, accessToken = null, forceReprocess = false) {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await processEmail(email, accessToken, forceReprocess);
      results.push(result);
    } catch (error) {
      console.error(`[Email Processor] Error processing email in batch:`, error);
      results.push({ success: false, error: error.message, email: email.id || email.external_id });
    }
  }

  return results;
}

/**
 * Reprocess all unprocessed emails
 */
async function reprocessAllEmails(accessToken) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    
    db.all(
      `SELECT * FROM communications 
       WHERE type = 'email' 
       AND (processed_by_rules = 0 OR processed_by_rules IS NULL)
       ORDER BY occurred_at DESC
       LIMIT 100`,
      [],
      async (err, emails) => {
        if (err) {
          return reject(err);
        }

        console.log(`[Email Processor] Reprocessing ${emails.length} emails`);
        const results = await processEmails(emails, accessToken);
        resolve(results);
      }
    );
  });
}

/**
 * Process all emails in inbox through rules (including already processed ones)
 * This is called after sync to ensure all emails are processed with current rules
 */
async function processAllInboxEmails(accessToken) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    
    db.all(
      `SELECT * FROM communications 
       WHERE type = 'email' 
       AND source = 'outlook'
       ORDER BY occurred_at DESC
       LIMIT 500`,
      [],
      async (err, emails) => {
        if (err) {
          return reject(err);
        }

        console.log(`[Email Processor] Processing all ${emails.length} inbox emails through rules`);
        
        // Count emails without contacts (these should get contacts created)
        const emailsWithoutContacts = emails.filter(e => !e.contact_id || e.contact_id === null);
        console.log(`[Email Processor] Found ${emailsWithoutContacts.length} emails without contacts`);
        
        // Force reprocess all emails, even if already processed
        const results = await processEmails(emails, accessToken, true);
        
        const successCount = results.filter(r => r.success && !r.skipped).length;
        const skippedCount = results.filter(r => r.skipped).length;
        const failedCount = results.filter(r => !r.success).length;
        const contactsCreated = results.filter(r => {
          if (!r.ruleResults || !Array.isArray(r.ruleResults)) return false;
          return r.ruleResults.some(rr => rr.result && rr.result.action === 'create_contact' && rr.result.created);
        }).length;
        
        console.log(`[Email Processor] Summary: ${successCount} successful, ${skippedCount} skipped, ${failedCount} failed`);
        console.log(`[Email Processor] Contacts created by rules: ${contactsCreated}`);

        resolve({ processed: emails.length, results, contactsCreated });
      }
    );
  });
}

/**
 * Process newly synced emails (called after email sync)
 */
async function processNewEmails(accessToken) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    
    // Get emails synced in the last sync operation (not yet processed)
    db.all(
      `SELECT * FROM communications 
       WHERE type = 'email' 
       AND source = 'outlook'
       AND (processed_by_rules = 0 OR processed_by_rules IS NULL)
       ORDER BY created_at DESC
       LIMIT 50`,
      [],
      async (err, emails) => {
        if (err) {
          return reject(err);
        }

        if (emails.length === 0) {
          return resolve({ processed: 0, results: [] });
        }

        console.log(`[Email Processor] Processing ${emails.length} new emails`);
        const results = await processEmails(emails, accessToken);
        
        const successCount = results.filter(r => r.success).length;
        console.log(`[Email Processor] Processed ${successCount}/${emails.length} emails successfully`);

        resolve({ processed: emails.length, results });
      }
    );
  });
}

module.exports = {
  processEmail,
  processEmails,
  reprocessAllEmails,
  processNewEmails,
  processAllInboxEmails,
};


