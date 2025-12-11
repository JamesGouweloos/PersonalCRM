const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all pipeline stages
router.get('/stages', (req, res) => {
  const db = getDB();
  db.all(
    'SELECT * FROM pipeline_stages ORDER BY order_index',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Create or update pipeline stage
router.post('/stages', (req, res) => {
  const db = getDB();
  const { name, order_index, color } = req.body;

  db.run(
    'INSERT INTO pipeline_stages (name, order_index, color) VALUES (?, ?, ?)',
    [name, order_index, color || '#6B7280'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, name, order_index, color });
    }
  );
});

// Get all opportunities
router.get('/opportunities', (req, res) => {
  const db = getDB();
  const query = `
    SELECT 
      o.*,
      c.name as contact_name,
      c.email as contact_email,
      c.company as contact_company,
      ps.name as stage_name,
      ps.color as stage_color,
      ps.order_index as stage_order,
      COUNT(DISTINCT comm.id) as communication_count
    FROM opportunities o
    LEFT JOIN contacts c ON o.contact_id = c.id
    LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
    LEFT JOIN communications comm ON comm.opportunity_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single opportunity
router.get('/opportunities/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.get(
    `SELECT 
      o.*,
      c.name as contact_name,
      c.email as contact_email,
      c.company as contact_company,
      ps.name as stage_name,
      ps.color as stage_color
    FROM opportunities o
    LEFT JOIN contacts c ON o.contact_id = c.id
    LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
    WHERE o.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      res.json(row);
    }
  );
});

// Create opportunity - Enhanced with source, sub_source, and audit trail
router.post('/opportunities', (req, res) => {
  const db = getDB();
  const {
    title,
    contact_id,
    stage_id,
    source,
    sub_source,
    linked_opportunity_id,
    assigned_to,
    value,
    currency,
    probability,
    expected_close_date,
    description,
    notes, // Accept notes as alias for description
    form_id,
    form_submission_time,
    campaign_id,
    lead_id,
    origin_list,
    user = 'James'
  } = req.body;
  
  // Use notes if description is not provided
  const finalDescription = description || notes || null;

  // Validate required fields
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!contact_id) {
    return res.status(400).json({ error: 'Contact ID is required' });
  }
  if (!source || !sub_source) {
    return res.status(400).json({ error: 'Source and sub_source are required' });
  }
  
  // Validate source is in allowed list
  const allowedSources = ['webform', 'cold_outreach', 'social', 'previous_enquiry', 'previous_client', 'forwarded', 'email'];
  if (!allowedSources.includes(source)) {
    return res.status(400).json({ error: `Invalid source. Must be one of: ${allowedSources.join(', ')}` });
  }

  db.run(
    `INSERT INTO opportunities 
    (title, contact_id, stage_id, source, sub_source, linked_opportunity_id, assigned_to, 
     value, currency, probability, expected_close_date, description, 
     form_id, form_submission_time, campaign_id, lead_id, origin_list)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title, contact_id, stage_id, source, sub_source, linked_opportunity_id || null,
      assigned_to || 'James', value, currency || 'USD', probability || 0, expected_close_date,
      finalDescription, form_id, form_submission_time, campaign_id, lead_id, origin_list
    ],
    function(err) {
      if (err) {
        console.error('Error creating opportunity:', err);
        // Provide more specific error messages
        if (err.code === 'SQLITE_CONSTRAINT') {
          if (err.message.includes('FOREIGN KEY constraint failed')) {
            return res.status(400).json({ error: 'Invalid contact_id or stage_id. The referenced record does not exist.' });
          }
          if (err.message.includes('CHECK constraint failed')) {
            return res.status(400).json({ error: `Invalid source value. Must be one of: ${allowedSources.join(', ')}` });
          }
          return res.status(400).json({ error: 'Database constraint violation: ' + err.message });
        }
        return res.status(500).json({ error: err.message });
      }
      const opportunityId = this.lastID;
      
      // Log initial creation in audit trail
      db.run(
        `INSERT INTO audit_trail (opportunity_id, field_name, new_value, changed_by)
         VALUES (?, 'created', ?, ?)`,
        [opportunityId, JSON.stringify({ source, sub_source, assigned_to }), user],
        () => {}
      );

      // Create activity for opportunity creation
      db.run(
        `INSERT INTO activities (opportunity_id, contact_id, type, description, user)
         VALUES (?, ?, 'note_added', ?, ?)`,
        [opportunityId, contact_id, `Opportunity created from ${source} - ${sub_source}`, user],
        () => {}
      );

      res.json({ id: opportunityId, ...req.body });
    }
  );
});

// Update opportunity - Enhanced with audit trail and prevent deletion of closed won
router.put('/opportunities/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const {
    title,
    contact_id,
    stage_id,
    source,
    sub_source,
    assigned_to,
    value,
    currency,
    probability,
    expected_close_date,
    description,
    status,
    reversed_reason,
    user = 'James'
  } = req.body;

  // First, get current values for audit trail
  db.get('SELECT * FROM opportunities WHERE id = ?', [id], (err, current) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!current) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Prevent updates to closed won opportunities unless reversing
    if (current.status === 'won' && status !== 'reversed' && status !== 'won') {
      return res.status(400).json({ error: 'Cannot modify closed won opportunity. Use reversal instead.' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    const auditTrail = [];

    const fields = {
      title, contact_id, stage_id, source, sub_source, assigned_to,
      value, currency, probability, expected_close_date, description, status, reversed_reason
    };

    Object.keys(fields).forEach(field => {
      if (fields[field] !== undefined && fields[field] !== current[field]) {
        updates.push(`${field} = ?`);
        values.push(fields[field]);
        
        // Track changes for audit trail
        auditTrail.push({
          field: field,
          oldValue: current[field],
          newValue: fields[field]
        });
      }
    });

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes detected' });
    }

    // Add status-specific handling
    if (status === 'won' || status === 'lost') {
      updates.push('closed_at = CURRENT_TIMESTAMP');
    } else if (status === 'open' && current.status !== 'open') {
      updates.push('closed_at = NULL');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.run(
      `UPDATE opportunities SET ${updates.join(', ')} WHERE id = ?`,
      values,
      function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }

        // Log all changes to audit trail
        auditTrail.forEach(change => {
          db.run(
            `INSERT INTO audit_trail (opportunity_id, field_name, old_value, new_value, changed_by)
             VALUES (?, ?, ?, ?, ?)`,
            [
              id,
              change.field,
              change.oldValue !== null ? String(change.oldValue) : null,
              change.newValue !== null ? String(change.newValue) : null,
              user
            ],
            () => {}
          );
        });

        // If marked as won, create commission snapshot
        if (status === 'won') {
          db.run(
            `INSERT INTO commission_snapshots 
             (opportunity_id, final_value, currency, commissionable_amount, owner, source, sub_source, closed_at, locked_by)
             SELECT id, value, currency, value, assigned_to, source, sub_source, closed_at, ?
             FROM opportunities WHERE id = ?`,
            [user, id],
            () => {}
          );
        }

        res.json({ success: true, changes: this.changes });
      }
    );
  });
});

// Delete opportunity - Prevent deletion of closed won opportunities
router.delete('/opportunities/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  // Check if opportunity is closed won
  db.get('SELECT status FROM opportunities WHERE id = ?', [id], (err, opp) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!opp) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    if (opp.status === 'won') {
      return res.status(400).json({ 
        error: 'Cannot delete closed won opportunity. Use reversal status instead.' 
      });
    }

    db.run('DELETE FROM opportunities WHERE id = ?', [id], function(deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: deleteErr.message });
      }
      res.json({ success: true, changes: this.changes });
    });
  });
});

// Get pipeline summary/stats
router.get('/summary', (req, res) => {
  const db = getDB();
  
  const queries = {
    totalValue: 'SELECT SUM(value) as total FROM opportunities WHERE stage_id NOT IN (SELECT id FROM pipeline_stages WHERE name IN ("Closed Lost"))',
    totalOpportunities: 'SELECT COUNT(*) as count FROM opportunities',
    byStage: `
      SELECT ps.name, ps.color, COUNT(o.id) as count, SUM(o.value) as value
      FROM pipeline_stages ps
      LEFT JOIN opportunities o ON ps.id = o.stage_id
      GROUP BY ps.id
      ORDER BY ps.order_index
    `
  };

  db.get(queries.totalValue, [], (err, totalValue) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get(queries.totalOpportunities, [], (err, totalOpps) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all(queries.byStage, [], (err, byStage) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          totalValue: totalValue.total || 0,
          totalOpportunities: totalOpps.count || 0,
          byStage: byStage || []
        });
      });
    });
  });
});

module.exports = router;


