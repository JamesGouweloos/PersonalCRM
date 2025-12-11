const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all agency interactions (filtered by contact_type = 'Agent')
router.get('/', (req, res) => {
  const db = getDB();
  const { contactId, type, startDate, endDate, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT 
      ai.id,
      ai.type,
      ai.description,
      ai.direction,
      ai.user,
      ai.platform,
      ai.platform_thread_url,
      ai.call_duration,
      ai.call_outcome,
      ai.created_at,
      ai.opportunity_id,
      ai.contact_id,
      c.name as contact_name,
      c.email as contact_email,
      c.company as contact_company,
      o.title as opportunity_title
    FROM activities ai
    INNER JOIN contacts c ON ai.contact_id = c.id
    LEFT JOIN opportunities o ON ai.opportunity_id = o.id
    WHERE c.contact_type = 'Agent'
  `;
  
  const params = [];

  if (contactId) {
    query += ' AND ai.contact_id = ?';
    params.push(contactId);
  }

  if (type) {
    query += ' AND ai.type = ?';
    params.push(type);
  }

  if (startDate) {
    query += ' AND DATE(ai.created_at) >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND DATE(ai.created_at) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY ai.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching agency interactions:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get interaction statistics
router.get('/stats', (req, res) => {
  const db = getDB();
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [];
  
  if (startDate && endDate) {
    dateFilter = ' AND DATE(ai.created_at) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  const query = `
    SELECT 
      ai.type,
      ai.direction,
      COUNT(*) as count,
      SUM(CASE WHEN ai.call_duration IS NOT NULL THEN ai.call_duration ELSE 0 END) as total_call_duration
    FROM activities ai
    INNER JOIN contacts c ON ai.contact_id = c.id
    WHERE c.contact_type = 'Agent' ${dateFilter}
    GROUP BY ai.type, ai.direction
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching agency interaction stats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create agency interaction
router.post('/', (req, res) => {
  const db = getDB();
  const {
    contact_id,
    type,
    description,
    direction,
    user = 'James',
    platform,
    platform_thread_url,
    call_duration,
    call_outcome,
    opportunity_id,
    notes
  } = req.body;

  // Validate required fields
  if (!contact_id || !type) {
    return res.status(400).json({ error: 'contact_id and type are required' });
  }

  // Validate contact is an Agent
  db.get('SELECT contact_type FROM contacts WHERE id = ?', [contact_id], (err, contact) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    if (contact.contact_type !== 'Agent') {
      return res.status(400).json({ error: 'Contact must be of type "Agent"' });
    }

    // Insert activity
    db.run(
      `INSERT INTO activities 
       (contact_id, type, description, direction, user, platform, platform_thread_url, 
        call_duration, call_outcome, opportunity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contact_id,
        type,
        description || notes || '',
        direction || 'outbound',
        user,
        platform || null,
        platform_thread_url || null,
        call_duration || null,
        call_outcome || null,
        opportunity_id || null
      ],
      function(insertErr) {
        if (insertErr) {
          console.error('Error creating agency interaction:', insertErr);
          return res.status(500).json({ error: insertErr.message });
        }

        // Fetch the created interaction
        db.get(
          `SELECT 
            ai.*,
            c.name as contact_name,
            c.email as contact_email,
            c.company as contact_company,
            o.title as opportunity_title
           FROM activities ai
           INNER JOIN contacts c ON ai.contact_id = c.id
           LEFT JOIN opportunities o ON ai.opportunity_id = o.id
           WHERE ai.id = ?`,
          [this.lastID],
          (fetchErr, interaction) => {
            if (fetchErr) {
              console.error('Error fetching created interaction:', fetchErr);
              return res.status(500).json({ error: fetchErr.message });
            }
            res.status(201).json(interaction);
          }
        );
      }
    );
  });
});

// Update agency interaction
router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const {
    description,
    call_duration,
    call_outcome,
    notes
  } = req.body;

  db.run(
    `UPDATE activities 
     SET description = COALESCE(?, description),
         call_duration = COALESCE(?, call_duration),
         call_outcome = COALESCE(?, call_outcome)
     WHERE id = ?`,
    [
      description || notes || null,
      call_duration || null,
      call_outcome || null,
      id
    ],
    function(updateErr) {
      if (updateErr) {
        console.error('Error updating agency interaction:', updateErr);
        return res.status(500).json({ error: updateErr.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Interaction not found' });
      }

      // Fetch updated interaction
      db.get(
        `SELECT 
          ai.*,
          c.name as contact_name,
          c.email as contact_email,
          c.company as contact_company,
          o.title as opportunity_title
         FROM activities ai
         INNER JOIN contacts c ON ai.contact_id = c.id
         LEFT JOIN opportunities o ON ai.opportunity_id = o.id
         WHERE ai.id = ?`,
        [id],
        (fetchErr, interaction) => {
          if (fetchErr) {
            return res.status(500).json({ error: fetchErr.message });
          }
          res.json(interaction);
        }
      );
    }
  );
});

// Delete agency interaction
router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.run('DELETE FROM activities WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting agency interaction:', err);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Interaction not found' });
    }
    res.json({ success: true, deletedId: id });
  });
});

module.exports = router;

