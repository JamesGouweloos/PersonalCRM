const { getDB } = require('../database');

/**
 * Email Rules Engine
 * Evaluates rules against emails and executes actions
 */

/**
 * Evaluate a single condition against an email
 */
function evaluateCondition(condition, email) {
  const { type, value, operator = 'contains' } = condition;
  const emailValue = getEmailValue(email, type);
  
  // Special handling for boolean/string comparisons (like has_contact)
  // Don't return false early if emailValue is 'false' (string) - that's a valid value
  if (emailValue === '' || emailValue === null || emailValue === undefined) {
    // Only return false if it's truly empty, not if it's the string 'false'
    if (type !== 'has_contact' && type !== 'is_flagged') {
      return false;
    }
  }

  const normalizedEmailValue = String(emailValue).toLowerCase();
  const normalizedConditionValue = String(value).toLowerCase();

  switch (operator) {
    case 'contains':
      return normalizedEmailValue.includes(normalizedConditionValue);
    case 'equals':
      return normalizedEmailValue === normalizedConditionValue;
    case 'starts_with':
      return normalizedEmailValue.startsWith(normalizedConditionValue);
    case 'ends_with':
      return normalizedEmailValue.endsWith(normalizedConditionValue);
    case 'matches':
      try {
        const regex = new RegExp(value, 'i');
        return regex.test(emailValue);
      } catch (e) {
        console.error('Invalid regex pattern:', value);
        return false;
      }
    default:
      return false;
  }
}

/**
 * Get email value based on condition type
 */
function getEmailValue(email, type) {
  switch (type) {
    case 'subject_contains':
    case 'subject_matches':
      return email.subject || '';
    case 'from_contains':
      return email.from_email || email.from?.emailAddress?.address || '';
    case 'to_contains':
      return email.to_email || email.toRecipients?.map(r => r.emailAddress.address).join(', ') || '';
    case 'body_contains':
      return email.body || email.bodyPreview || '';
    case 'has_category':
      // Categories are stored as JSON array in email.categories
      const categories = typeof email.categories === 'string' 
        ? JSON.parse(email.categories || '[]') 
        : (email.categories || []);
      return categories.join(', ');
    case 'is_flagged':
      return email.is_flagged || email.flag || false;
    case 'in_folder':
      return email.folder_id || email.parentFolderId || '';
    case 'direction':
      // Determine direction: if email has direction field, use it; otherwise infer from from/to
      if (email.direction) {
        return email.direction;
      }
      // Infer direction: if from_email matches user's email, it's outbound
      // For now, we'll check if direction is set in the email object
      // This will be set during email sync based on user's email
      return email.direction || 'inbound';
    case 'has_contact':
      // Check if email has a contact_id (returns true/false as string for comparison)
      return (email.contact_id && email.contact_id !== null && email.contact_id !== undefined) ? 'true' : 'false';
    default:
      return '';
  }
}

/**
 * Evaluate all conditions for a rule (AND logic)
 */
function evaluateRule(rule, email) {
  if (!rule.enabled) {
    return false;
  }

  const conditions = typeof rule.conditions === 'string' 
    ? JSON.parse(rule.conditions) 
    : rule.conditions;

  if (!Array.isArray(conditions) || conditions.length === 0) {
    return false;
  }

  // All conditions must match (AND logic)
  const results = conditions.map(condition => {
    const result = evaluateCondition(condition, email);
    const emailValue = getEmailValue(email, condition.type);
    if (rule.name === 'Auto-Create Contact for New Senders') {
      console.log(`[Email Rules] Condition check: type=${condition.type}, value=${condition.value}, operator=${condition.operator}, emailValue=${emailValue}, result=${result}`);
    }
    return result;
  });
  
  const allMatch = results.every(r => r === true);
  
  if (rule.name === 'Auto-Create Contact for New Senders') {
    console.log(`[Email Rules] Rule "${rule.name}" evaluation: ${results.join(' AND ')} = ${allMatch}`);
    console.log(`[Email Rules] Email data: id=${email.id}, from_email=${email.from_email}, contact_id=${email.contact_id}, direction=${email.direction}`);
  }
  
  return allMatch;
}

/**
 * Execute a single action
 */
async function executeAction(action, email, db) {
  const { type, params = {} } = action;

  try {
    switch (type) {
      case 'assign_category':
        // Note: This would require Mail.ReadWrite permission to actually assign
        // For now, we'll just log it and store in our database
        console.log(`[Email Rules] Would assign category: ${params.category}`);
        return { success: true, action: 'assign_category', category: params.category };

      case 'create_contact':
        return await createContact(email, params, db);

      case 'create_opportunity':
        return await createOpportunity(email, params, db);

      case 'create_activity':
        return await createActivity(email, params, db);

      case 'create_followup':
        return await createFollowUp(email, params, db);

      case 'update_opportunity_stage':
        return await updateOpportunityStage(email, params, db);

      case 'link_to_opportunity':
        return await linkToOpportunity(email, params, db);

      case 'mark_opportunity_won':
        return await markOpportunityWon(email, params, db);

      case 'create_commission_snapshot':
        return await createCommissionSnapshot(email, params, db);

      case 'create_lead':
        return await createLead(email, params, db);

      default:
        console.warn(`[Email Rules] Unknown action type: ${type}`);
        return { success: false, error: `Unknown action type: ${type}` };
    }
  } catch (error) {
    console.error(`[Email Rules] Error executing action ${type}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Create contact from email
 */
async function createContact(email, params, db) {
  return new Promise((resolve, reject) => {
    const fromEmail = email.from_email || email.from?.emailAddress?.address;
    const fromName = email.from?.emailAddress?.name || fromEmail?.split('@')[0] || 'Unknown';

    if (!fromEmail) {
      console.log('[Email Rules] createContact: No email address found');
      return resolve({ success: false, error: 'No email address found' });
    }

    // Normalize email for duplicate checking (lowercase, trim)
    const normalizedEmail = fromEmail.toLowerCase().trim();
    console.log(`[Email Rules] createContact: Checking for contact with email: ${normalizedEmail}`);

    // Check if contact already exists (case-insensitive check)
    db.get('SELECT id FROM contacts WHERE LOWER(TRIM(email)) = ?', [normalizedEmail], (err, existing) => {
      if (err) {
        console.error('[Email Rules] createContact: Error checking for existing contact:', err);
        return reject(err);
      }

      if (existing) {
        console.log(`[Email Rules] createContact: Contact already exists with id=${existing.id} for ${fromEmail}`);
        // Link email to existing contact if it doesn't have a contact_id
        const communicationId = email.id;
        if (communicationId && !email.contact_id) {
          console.log(`[Email Rules] createContact: Linking email ${communicationId} to existing contact ${existing.id}`);
          db.run(
            'UPDATE communications SET contact_id = ? WHERE id = ?',
            [existing.id, communicationId],
            (linkErr) => {
              if (linkErr) {
                console.error('[Email Rules] Error linking email to existing contact:', linkErr);
              } else {
                console.log(`[Email Rules] createContact: Successfully linked email ${communicationId} to contact ${existing.id}`);
              }
              resolve({ success: true, action: 'create_contact', contactId: existing.id, created: false, linked: true });
            }
          );
        } else {
          resolve({ success: true, action: 'create_contact', contactId: existing.id, created: false });
        }
        return;
      }

      // Create new contact
      const contactType = params.contact_type || 'Other';
      console.log(`[Email Rules] createContact: Creating new contact for ${fromEmail} (type: ${contactType})`);
      db.run(
        'INSERT INTO contacts (name, email, contact_type) VALUES (?, ?, ?)',
        [fromName, fromEmail, contactType],
        function(insertErr) {
          if (insertErr) {
            // If it's a unique constraint error, contact was created by another concurrent process
            if (insertErr.code === 'SQLITE_CONSTRAINT' || insertErr.message.includes('UNIQUE')) {
              console.log(`[Email Rules] createContact: Contact already exists (unique constraint), fetching existing contact`);
              // Fetch the existing contact
              db.get(
                'SELECT id FROM contacts WHERE LOWER(TRIM(email)) = ?',
                [normalizedEmail],
                (getErr, existingContact) => {
                  if (getErr || !existingContact) {
                    console.error('[Email Rules] createContact: Error fetching existing contact after constraint error:', getErr);
                    return reject(insertErr);
                  }
                  const existingContactId = existingContact.id;
                  console.log(`[Email Rules] createContact: Found existing contact with id=${existingContactId} for ${fromEmail}`);
                  
                  // Link email to the existing contact
                  const communicationId = email.id;
                  if (communicationId && !email.contact_id) {
                    db.run(
                      'UPDATE communications SET contact_id = ? WHERE id = ?',
                      [existingContactId, communicationId],
                      (linkErr) => {
                        if (linkErr) {
                          console.error('[Email Rules] Error linking email to existing contact:', linkErr);
                        } else {
                          console.log(`[Email Rules] createContact: Successfully linked email ${communicationId} to existing contact ${existingContactId}`);
                        }
                        resolve({ success: true, action: 'create_contact', contactId: existingContactId, created: false, linked: true });
                      }
                    );
                  } else {
                    resolve({ success: true, action: 'create_contact', contactId: existingContactId, created: false });
                  }
                }
              );
            } else {
              console.error('[Email Rules] createContact: Error creating contact:', insertErr);
              return reject(insertErr);
            }
            return;
          }
          const newContactId = this.lastID;
          console.log(`[Email Rules] createContact: Created new contact with id=${newContactId} for ${fromEmail}`);
          
          // Link email to the newly created contact
          const communicationId = email.id;
          if (communicationId) {
            console.log(`[Email Rules] createContact: Linking email ${communicationId} to new contact ${newContactId}`);
            db.run(
              'UPDATE communications SET contact_id = ? WHERE id = ?',
              [newContactId, communicationId],
              (linkErr) => {
                if (linkErr) {
                  console.error('[Email Rules] Error linking email to contact:', linkErr);
                } else {
                  console.log(`[Email Rules] createContact: Successfully linked email ${communicationId} to contact ${newContactId}`);
                }
                resolve({ success: true, action: 'create_contact', contactId: newContactId, created: true, linked: true });
              }
            );
          } else {
            resolve({ success: true, action: 'create_contact', contactId: newContactId, created: true });
          }
        }
      );
    });
  });
}

/**
 * Create opportunity from email
 */
async function createOpportunity(email, params, db) {
  return new Promise((resolve, reject) => {
    const fromEmail = email.from_email || email.from?.emailAddress?.address;
    
    if (!fromEmail) {
      return resolve({ success: false, error: 'No email address found' });
    }

    // Find or create contact
    db.get('SELECT id FROM contacts WHERE email = ?', [fromEmail], (err, contact) => {
      if (err) {
        return reject(err);
      }

      if (!contact) {
        // Create contact first
        return createContact(email, {}, db).then(result => {
          if (!result.success || !result.contactId) {
            return resolve({ success: false, error: 'Failed to create contact' });
          }
          createOpportunityWithContact(email, params, result.contactId, db).then(resolve).catch(reject);
        });
      }

      createOpportunityWithContact(email, params, contact.id, db).then(resolve).catch(reject);
    });
  });
}

function createOpportunityWithContact(email, params, contactId, db) {
  return new Promise((resolve, reject) => {
    const source = params.source || 'forwarded';
    const subSource = params.sub_source || 'Email';
    const title = params.title || email.subject || 'New Opportunity';
    const assignedTo = params.assigned_to || 'James';

    db.run(
      `INSERT INTO opportunities (title, contact_id, source, sub_source, assigned_to, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, contactId, source, subSource, assignedTo, email.bodyPreview || email.body || '', 'open'],
      function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ 
          success: true, 
          action: 'create_opportunity', 
          opportunityId: this.lastID,
          source,
          subSource
        });
      }
    );
  });
}

/**
 * Create activity from email
 */
async function createActivity(email, params, db) {
  return new Promise((resolve, reject) => {
    const fromEmail = email.from_email || email.from?.emailAddress?.address;
    
    if (!fromEmail) {
      return resolve({ success: false, error: 'No email address found' });
    }

    db.get('SELECT id FROM contacts WHERE email = ?', [fromEmail], (err, contact) => {
      if (err) {
        return reject(err);
      }

      if (!contact) {
        return resolve({ success: false, error: 'Contact not found' });
      }

      const activityType = params.type || 'email_received';
      const description = params.description || `Email: ${email.subject || '(No Subject)'}`;
      const direction = email.direction || 'inbound';
      const user = params.user || 'system';

      db.run(
        `INSERT INTO activities (contact_id, type, description, direction, user, conversation_id, message_id, deep_link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contact.id,
          activityType,
          description,
          direction,
          user,
          email.conversation_id || email.conversationId,
          email.message_id || email.id,
          email.deep_link
        ],
        function(err) {
          if (err) {
            return reject(err);
          }
          resolve({ success: true, action: 'create_activity', activityId: this.lastID });
        }
      );
    });
  });
}

/**
 * Create follow-up from flagged email
 */
async function createFollowUp(email, params, db) {
  return new Promise((resolve, reject) => {
    const fromEmail = email.from_email || email.from?.emailAddress?.address;
    const flagDueDate = email.flag_due_date || email.flag?.dueDateTime || params.due_date;
    
    if (!fromEmail) {
      return resolve({ success: false, error: 'No email address found' });
    }

    if (!flagDueDate) {
      return resolve({ success: false, error: 'No follow-up date specified' });
    }

    db.get('SELECT id FROM contacts WHERE email = ?', [fromEmail], (err, contact) => {
      if (err) {
        return reject(err);
      }

      if (!contact) {
        return resolve({ success: false, error: 'Contact not found' });
      }

      // Find or create a lead for this contact
      db.get('SELECT id FROM leads WHERE contact_id = ? ORDER BY created_at DESC LIMIT 1', [contact.id], (leadErr, lead) => {
        if (leadErr) {
          return reject(leadErr);
        }

        const leadId = lead ? lead.id : null;
        const followUpType = params.type || 'email';

        db.run(
          `INSERT INTO follow_ups (lead_id, contact_id, scheduled_date, type, notes, completed)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            contact.id,
            flagDueDate,
            followUpType,
            params.notes || `Follow-up: ${email.subject || ''}`,
            0
          ],
          function(insertErr) {
            if (insertErr) {
              return reject(insertErr);
            }
            resolve({ success: true, action: 'create_followup', followUpId: this.lastID });
          }
        );
      });
    });
  });
}

/**
 * Update opportunity stage
 */
async function updateOpportunityStage(email, params, db) {
  return new Promise((resolve, reject) => {
    const opportunityId = params.opportunity_id || email.opportunity_id;
    
    if (!opportunityId) {
      return resolve({ success: false, error: 'No opportunity ID specified' });
    }

    db.get('SELECT id FROM pipeline_stages WHERE name = ?', [params.stage_name], (err, stage) => {
      if (err) {
        return reject(err);
      }

      if (!stage) {
        return resolve({ success: false, error: `Stage "${params.stage_name}" not found` });
      }

      db.run(
        'UPDATE opportunities SET stage_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [stage.id, opportunityId],
        function(updateErr) {
          if (updateErr) {
            return reject(updateErr);
          }
          resolve({ success: true, action: 'update_opportunity_stage', opportunityId, stageId: stage.id });
        }
      );
    });
  });
}

/**
 * Link email to opportunity
 */
async function linkToOpportunity(email, params, db) {
  return new Promise((resolve, reject) => {
    const opportunityId = params.opportunity_id || email.opportunity_id;
    const communicationId = email.id || params.communication_id;
    
    if (!opportunityId || !communicationId) {
      return resolve({ success: false, error: 'Missing opportunity ID or communication ID' });
    }

    db.run(
      'UPDATE communications SET opportunity_id = ? WHERE id = ?',
      [opportunityId, communicationId],
      function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ success: true, action: 'link_to_opportunity', opportunityId, communicationId });
      }
    );
  });
}

/**
 * Mark opportunity as won
 */
async function markOpportunityWon(email, params, db) {
  return new Promise((resolve, reject) => {
    const opportunityId = params.opportunity_id || email.opportunity_id;
    
    if (!opportunityId) {
      return resolve({ success: false, error: 'No opportunity ID specified' });
    }

    db.run(
      `UPDATE opportunities SET status = 'won', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [opportunityId],
      function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ success: true, action: 'mark_opportunity_won', opportunityId });
      }
    );
  });
}

/**
 * Create lead from email
 */
async function createLead(email, params, db) {
  return new Promise((resolve, reject) => {
    const fromEmail = email.from_email || email.from?.emailAddress?.address;
    
    if (!fromEmail) {
      return resolve({ success: false, error: 'No email address found' });
    }

    // Find contact by email
    db.get('SELECT id FROM contacts WHERE email = ?', [fromEmail], (err, contact) => {
      if (err) {
        return reject(err);
      }

      if (!contact) {
        // Create contact first if it doesn't exist
        return createContact(email, { contact_type: params.contact_type || 'Other' }, db).then(result => {
          if (!result.success || !result.contactId) {
            return resolve({ success: false, error: 'Failed to create contact' });
          }
          createLeadWithContact(email, params, result.contactId, db).then(resolve).catch(reject);
        });
      }

      createLeadWithContact(email, params, contact.id, db).then(resolve).catch(reject);
    });
  });
}

function createLeadWithContact(email, params, contactId, db) {
  return new Promise((resolve, reject) => {
    const source = params.source || 'webform';
    const status = params.status || 'new';
    const assignedTo = params.assigned_to || 'James';
    const notes = params.notes || `Lead created from email: ${email.subject || '(No Subject)'}`;
    const value = params.value || null;
    const conversationId = email.conversation_id || email.conversationId || null;

    // Check if a lead already exists for this conversation
    if (conversationId) {
      db.get(
        `SELECT id FROM leads WHERE conversation_id = ? AND contact_id = ? LIMIT 1`,
        [conversationId, contactId],
        (err, existingLead) => {
          if (err) {
            console.error('[Email Rules] Error checking for existing lead:', err);
            return reject(err);
          }

          if (existingLead) {
            console.log(`[Email Rules] Lead ${existingLead.id} already exists for conversation ${conversationId}. Skipping duplicate creation.`);
            return resolve({ 
              success: true, 
              action: 'create_lead', 
              leadId: existingLead.id,
              contactId,
              source,
              status,
              skipped: true,
              reason: 'Lead already exists for this conversation'
            });
          }

          // No existing lead for this conversation, create a new one
          insertLead();
        }
      );
    } else {
      // No conversation_id, check for recent lead from same contact with same source
      // This handles cases where conversation_id might not be available
      db.get(
        `SELECT id FROM leads 
         WHERE contact_id = ? 
         AND source = ?
         AND created_at > datetime('now', '-7 days')
         ORDER BY created_at DESC LIMIT 1`,
        [contactId, source],
        (err, recentLead) => {
          if (err) {
            console.error('[Email Rules] Error checking for recent lead:', err);
            return reject(err);
          }

          if (recentLead) {
            console.log(`[Email Rules] Recent lead ${recentLead.id} exists for contact ${contactId} with source ${source}. Skipping duplicate creation.`);
            return resolve({ 
              success: true, 
              action: 'create_lead', 
              leadId: recentLead.id,
              contactId,
              source,
              status,
              skipped: true,
              reason: 'Recent lead already exists for this contact and source'
            });
          }

          // No recent lead, create a new one
          insertLead();
        }
      );
    }

    function insertLead() {
      db.run(
        `INSERT INTO leads (contact_id, source, status, assigned_to, notes, value, conversation_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contactId, source, status, assignedTo, notes, value, conversationId],
        function(err) {
          if (err) {
            console.error('[Email Rules] Error creating lead:', err);
            return reject(err);
          }
          console.log(`[Email Rules] Created lead ${this.lastID} for contact ${contactId} from email: ${email.subject || email.id}${conversationId ? ` (conversation: ${conversationId})` : ''}`);
          resolve({ 
            success: true, 
            action: 'create_lead', 
            leadId: this.lastID,
            contactId,
            source,
            status,
            conversationId
          });
        }
      );
    }
  });
}

/**
 * Create commission snapshot
 */
async function createCommissionSnapshot(email, params, db) {
  return new Promise((resolve, reject) => {
    const opportunityId = params.opportunity_id || email.opportunity_id;
    
    if (!opportunityId) {
      return resolve({ success: false, error: 'No opportunity ID specified' });
    }

    // Get opportunity details
    db.get(
      `SELECT o.*, c.name as contact_name FROM opportunities o
       LEFT JOIN contacts c ON o.contact_id = c.id
       WHERE o.id = ?`,
      [opportunityId],
      (err, opp) => {
        if (err) {
          return reject(err);
        }

        if (!opp) {
          return resolve({ success: false, error: 'Opportunity not found' });
        }

        const finalValue = params.final_value || opp.value || 0;
        const commissionableAmount = params.commissionable_amount || finalValue;
        const owner = params.owner || opp.assigned_to || 'James';

        db.run(
          `INSERT INTO commission_snapshots 
           (opportunity_id, final_value, currency, products, commissionable_amount, owner, source, sub_source, closed_at, locked_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          [
            opportunityId,
            finalValue,
            opp.currency || 'USD',
            params.products || null,
            commissionableAmount,
            owner,
            opp.source,
            opp.sub_source,
            owner
          ],
          function(insertErr) {
            if (insertErr) {
              return reject(insertErr);
            }
            resolve({ success: true, action: 'create_commission_snapshot', snapshotId: this.lastID });
          }
        );
      }
    );
  });
}

/**
 * Process email through all enabled rules
 */
async function processEmail(email, db) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM email_rules WHERE enabled = 1 ORDER BY priority DESC, id ASC',
      [],
      async (err, rules) => {
        if (err) {
          return reject(err);
        }

        // Log rule names for debugging
        const ruleNames = rules.map(r => r.name).join(', ');
        console.log(`[Email Rules] Processing email ${email.id || email.external_id} through ${rules.length} enabled rules: ${ruleNames}`);
        const results = [];
        
        for (const rule of rules) {
          try {
            const matches = evaluateRule(rule, email);
            
            if (matches) {
              console.log(`[Email Rules] Rule "${rule.name}" matched for email: ${email.subject || email.id}`);
              
              const actions = typeof rule.actions === 'string' 
                ? JSON.parse(rule.actions) 
                : rule.actions;

              if (Array.isArray(actions)) {
                for (const action of actions) {
                  console.log(`[Email Rules] Executing action: ${action.type} for rule "${rule.name}"`);
                  const result = await executeAction(action, email, db);
                  console.log(`[Email Rules] Action result:`, result);
                  results.push({ rule: rule.name, action, result });
                }
              }
            }
          } catch (error) {
            console.error(`[Email Rules] Error processing rule "${rule.name}":`, error);
            results.push({ rule: rule.name, error: error.message });
          }
        }

        if (results.length === 0) {
          console.log(`[Email Rules] No rules matched for email ${email.id || email.external_id}`);
        }

        resolve(results);
      }
    );
  });
}

/**
 * Test a rule against a sample email
 */
function testRule(rule, sampleEmail) {
  const matches = evaluateRule(rule, sampleEmail);
  return {
    matches,
    evaluatedConditions: (typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions).map(cond => ({
      condition: cond,
      result: evaluateCondition(cond, sampleEmail)
    }))
  };
}

module.exports = {
  evaluateCondition,
  evaluateRule,
  executeAction,
  processEmail,
  testRule,
};


