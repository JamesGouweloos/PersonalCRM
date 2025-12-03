const { getDB } = require('../database');

/**
 * Default Email Rules
 * Pre-configured rules matching user requirements
 */

const defaultRules = [
  {
    name: 'Webform Detection',
    description: 'Detect emails from webform submissions',
    priority: 10,
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: 'New Web Enquiry', operator: 'contains' },
      { type: 'subject_contains', value: 'Web Enquiry', operator: 'contains' },
      { type: 'subject_contains', value: 'Contact Form', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'assign_category', params: { category: 'Source – Webform' } },
      { type: 'create_opportunity', params: { source: 'webform', sub_source: 'Website Form', title: '{{subject}}' } },
      { type: 'create_activity', params: { type: 'email_received', description: 'Webform enquiry received' } }
    ])
  },
  {
    name: 'Enquiry Template Detection',
    description: 'Detect enquiry and quote templates',
    priority: 9,
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: '[Enquiry]', operator: 'contains' },
      { type: 'subject_contains', value: '[Quote]', operator: 'contains' },
      { type: 'subject_contains', value: '[Proposal]', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'assign_category', params: { category: 'Stage – Proposal/Quote' } },
      { type: 'update_opportunity_stage', params: { stage_name: 'Proposal' } }
    ])
  },
  {
    name: 'Booking Confirmation',
    description: 'Detect booking confirmations and mark opportunities as won',
    priority: 8,
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: 'booking confirmed', operator: 'contains' },
      { type: 'subject_contains', value: 'reservation confirmed', operator: 'contains' },
      { type: 'body_contains', value: 'booking confirmed', operator: 'contains' },
      { type: 'body_contains', value: 'reservation confirmed', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'assign_category', params: { category: 'Stage – Booking/Confirmation' } },
      { type: 'mark_opportunity_won', params: {} },
      { type: 'create_commission_snapshot', params: {} }
    ])
  },
  {
    name: 'Social Media Follow-up',
    description: 'Detect social media follow-up emails',
    priority: 7,
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: 'Instagram', operator: 'contains' },
      { type: 'subject_contains', value: 'Facebook', operator: 'contains' },
      { type: 'subject_contains', value: 'LinkedIn', operator: 'contains' },
      { type: 'subject_contains', value: '[Social Enquiry]', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'assign_category', params: { category: 'Source – Social' } },
      { type: 'create_opportunity', params: { source: 'social', sub_source: 'Social Media Follow-up' } }
    ])
  },
  {
    name: 'Previous Client/Enquiry',
    description: 'Detect emails from previous clients or enquiries',
    priority: 6,
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: 'Returning', operator: 'contains' },
      { type: 'subject_contains', value: 'Previous', operator: 'contains' },
      { type: 'body_contains', value: 'previous booking', operator: 'contains' },
      { type: 'body_contains', value: 'stayed before', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'assign_category', params: { category: 'Source – Previous Client' } },
      { type: 'create_opportunity', params: { source: 'previous_client', sub_source: 'Returning Client' } }
    ])
  },
  {
    name: 'Commission Evidence',
    description: 'Detect payment and invoice emails for commission tracking',
    priority: 5,
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: 'invoice', operator: 'contains' },
      { type: 'subject_contains', value: 'deposit received', operator: 'contains' },
      { type: 'subject_contains', value: 'final payment', operator: 'contains' },
      { type: 'subject_contains', value: 'payment received', operator: 'contains' },
      { type: 'body_contains', value: 'invoice', operator: 'contains' },
      { type: 'body_contains', value: 'payment received', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'assign_category', params: { category: 'Finance – Payment' } },
      { type: 'link_to_opportunity', params: {} }
    ])
  },
  {
    name: 'Flagged Follow-up',
    description: 'Create follow-up activities from flagged emails',
    priority: 4,
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'is_flagged', value: true, operator: 'equals' }
    ]),
    actions: JSON.stringify([
      { type: 'create_followup', params: { type: 'email' } },
      { type: 'assign_category', params: { category: 'Stage – Follow-up' } }
    ])
  },
  {
    name: 'Auto-Create Contact for New Senders',
    description: 'Automatically create a contact for every incoming email from a new sender',
    priority: 15, // High priority to run first
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'direction', value: 'inbound', operator: 'equals' },
      { type: 'from_contains', value: '@', operator: 'contains' },
      { type: 'has_contact', value: 'false', operator: 'equals' }
    ]),
    actions: JSON.stringify([
      { type: 'create_contact', params: { contact_type: 'Other' } }
    ])
  },
  {
    name: 'Web General Enquiry - Create Lead',
    description: 'Create a lead for Web General Enquiry emails',
    priority: 11, // High priority, runs after contact creation
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: 'Web General Enquiry', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'create_lead', params: { source: 'webform', status: 'new', notes: 'Webform submission: Web General Enquiry' } }
    ])
  },
  {
    name: 'Web Tiger Enquiry - Create Lead',
    description: 'Create a lead for Web Tiger Enquiry emails',
    priority: 11, // High priority, runs after contact creation
    enabled: 1,
    conditions: JSON.stringify([
      { type: 'subject_contains', value: 'Web Tiger Enquiry', operator: 'contains' }
    ]),
    actions: JSON.stringify([
      { type: 'create_lead', params: { source: 'webform', status: 'new', notes: 'Webform submission: Web Tiger Enquiry' } }
    ])
  }
];

/**
 * Initialize default rules in database
 */
function initializeDefaultRules() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    
    // Check if rules already exist
    db.get('SELECT COUNT(*) as count FROM email_rules', [], (err, row) => {
      if (err) {
        return reject(err);
      }

      if (row.count > 0) {
        console.log('[Default Rules] Rules already exist, ensuring important rules exist');
        
        // Ensure specific rules exist (upsert logic)
        const rulesToEnsure = [
          'Auto-Create Contact for New Senders',
          'Web General Enquiry - Create Lead',
          'Web Tiger Enquiry - Create Lead'
        ];
        
        let processed = 0;
        const totalToProcess = rulesToEnsure.length;
        
        rulesToEnsure.forEach(ruleName => {
          const rule = defaultRules.find(r => r.name === ruleName);
          if (!rule) {
            processed++;
            if (processed === totalToProcess) resolve();
            return;
          }
          
          db.get('SELECT id FROM email_rules WHERE name = ?', [rule.name], (checkErr, existing) => {
            if (checkErr) {
              console.error(`[Default Rules] Error checking for rule "${rule.name}":`, checkErr);
              processed++;
              if (processed === totalToProcess) resolve();
              return;
            }

            if (existing) {
              // Update existing rule
              db.run(
                `UPDATE email_rules 
                 SET conditions = ?, actions = ?, description = ?, priority = ?, enabled = ?
                 WHERE name = ?`,
                [
                  rule.conditions,
                  rule.actions,
                  rule.description,
                  rule.priority,
                  rule.enabled,
                  rule.name
                ],
                (updateErr) => {
                  if (updateErr) {
                    console.error(`[Default Rules] Error updating rule "${rule.name}":`, updateErr);
                  } else {
                    console.log(`[Default Rules] Updated "${rule.name}" rule`);
                  }
                  processed++;
                  if (processed === totalToProcess) resolve();
                }
              );
            } else {
              // Insert the rule if it doesn't exist
              db.run(
                `INSERT INTO email_rules (name, description, priority, enabled, conditions, actions)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  rule.name,
                  rule.description,
                  rule.priority,
                  rule.enabled,
                  rule.conditions,
                  rule.actions
                ],
                (insertErr) => {
                  if (insertErr) {
                    console.error(`[Default Rules] Error inserting rule "${rule.name}":`, insertErr);
                  } else {
                    console.log(`[Default Rules] Created "${rule.name}" rule`);
                  }
                  processed++;
                  if (processed === totalToProcess) resolve();
                }
              );
            }
          });
        });
        
        return;
      }

      // Insert all default rules if none exist
      const stmt = db.prepare(`
        INSERT INTO email_rules (name, description, priority, enabled, conditions, actions)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      defaultRules.forEach(rule => {
        stmt.run([
          rule.name,
          rule.description,
          rule.priority,
          rule.enabled,
          rule.conditions,
          rule.actions
        ], (insertErr) => {
          if (insertErr) {
            console.error(`[Default Rules] Error inserting rule "${rule.name}":`, insertErr);
          }
        });
      });

      stmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          return reject(finalizeErr);
        }
        console.log(`[Default Rules] Initialized ${defaultRules.length} default rules`);
        resolve();
      });
    });
  });
}

module.exports = {
  defaultRules,
  initializeDefaultRules,
};


