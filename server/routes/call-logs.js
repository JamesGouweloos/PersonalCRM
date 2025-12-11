const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all call logs
router.get('/', (req, res) => {
  const db = getDB();
  const { opportunityId, contactId, startDate, endDate } = req.query;

  let query = `
    SELECT cl.*, c.name as contact_name, c.phone as contact_phone, o.title as opportunity_title
    FROM call_logs cl
    JOIN contacts c ON cl.contact_id = c.id
    LEFT JOIN opportunities o ON cl.opportunity_id = o.id
    WHERE 1=1
  `;
  const params = [];

  if (opportunityId) {
    query += ' AND cl.opportunity_id = ?';
    params.push(opportunityId);
  }

  if (contactId) {
    query += ' AND cl.contact_id = ?';
    params.push(contactId);
  }

  if (startDate) {
    query += ' AND cl.occurred_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND cl.occurred_at <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY cl.occurred_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single call log
router.get('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.get(
    `SELECT cl.*, c.name as contact_name, c.phone as contact_phone, o.title as opportunity_title
     FROM call_logs cl
     JOIN contacts c ON cl.contact_id = c.id
     LEFT JOIN opportunities o ON cl.opportunity_id = o.id
     WHERE cl.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Call log not found' });
      }
      res.json(row);
    }
  );
});

// Create call log
router.post('/', (req, res) => {
  const db = getDB();
  const {
    opportunity_id,
    contact_id,
    phone_number,
    direction,
    duration,
    outcome,
    notes,
    origin_list,
    user,
    occurred_at
  } = req.body;

  if (!contact_id || !phone_number || !direction || !user) {
    return res.status(400).json({ error: 'contact_id, phone_number, direction, and user are required' });
  }

  db.run(
    `INSERT INTO call_logs 
     (opportunity_id, contact_id, phone_number, direction, duration, outcome, notes, origin_list, user, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      opportunity_id || null,
      contact_id,
      phone_number,
      direction,
      duration || null,
      outcome || null,
      notes || null,
      origin_list || null,
      user,
      occurred_at || new Date().toISOString()
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Create activity record
      db.run(
        `INSERT INTO activities (opportunity_id, contact_id, type, description, user, call_duration, call_outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          opportunity_id || null,
          contact_id,
          direction === 'inbound' ? 'call_received' : 'call_made',
          `Call ${direction === 'inbound' ? 'received from' : 'made to'} ${phone_number}${outcome ? ` - ${outcome}` : ''}`,
          user,
          duration,
          outcome
        ],
        () => {}
      );

      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Update call log
router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const {
    duration,
    outcome,
    notes
  } = req.body;

  db.run(
    `UPDATE call_logs 
     SET duration = ?, outcome = ?, notes = ?
     WHERE id = ?`,
    [duration, outcome, notes, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Match unknown callers to existing contacts by phone number
router.post('/match-unknown', (req, res) => {
  const db = getDB();
  
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
          return res.status(500).json({ error: err.message });
        }

        let matchedCount = 0;
        let updatedCount = 0;
        const errors = [];

        const processCallLog = (callLog, index) => {
          if (index >= callLogs.length) {
            res.json({
              success: true,
              checked: callLogs.length,
              matched: matchedCount,
              updated: updatedCount,
              errors: errors.length > 0 ? errors.slice(0, 10) : []
            });
            return;
          }

          const phoneNumber = callLog.phone_number;

          // Find existing contact with this phone number
          db.get(
            'SELECT id, name FROM contacts WHERE phone = ? AND (name NOT LIKE ? AND name IS NOT NULL) LIMIT 1',
            [phoneNumber, '%Unknown%'],
            (findErr, existingContact) => {
              if (findErr) {
                errors.push(`Error finding contact for ${phoneNumber}: ${findErr.message}`);
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
                      errors.push(`Error updating call log ${callLog.id}: ${updateErr.message}`);
                    } else {
                      matchedCount++;
                      updatedCount++;
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
          return res.json({
            success: true,
            checked: 0,
            matched: 0,
            updated: 0,
            message: 'No call logs to process'
          });
        }

        processCallLog(callLogs[0], 0);
      }
    );
  });
});

module.exports = router;


