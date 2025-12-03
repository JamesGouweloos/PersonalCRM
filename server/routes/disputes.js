const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all disputes
router.get('/', (req, res) => {
  const db = getDB();
  const { status, opportunityId } = req.query;

  let query = `
    SELECT d.*, o.title as opportunity_title, c.name as contact_name
    FROM disputes d
    JOIN opportunities o ON d.opportunity_id = o.id
    JOIN contacts c ON o.contact_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }

  if (opportunityId) {
    query += ' AND d.opportunity_id = ?';
    params.push(opportunityId);
  }

  query += ' ORDER BY d.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single dispute
router.get('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.get(
    `SELECT d.*, o.title as opportunity_title, c.name as contact_name
     FROM disputes d
     JOIN opportunities o ON d.opportunity_id = o.id
     JOIN contacts c ON o.contact_id = c.id
     WHERE d.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Dispute not found' });
      }
      res.json(row);
    }
  );
});

// Create dispute
router.post('/', (req, res) => {
  const db = getDB();
  const {
    opportunity_id,
    commission_snapshot_id,
    nature,
    description,
    supporting_evidence,
    created_by
  } = req.body;

  if (!opportunity_id || !nature || !created_by) {
    return res.status(400).json({ error: 'opportunity_id, nature, and created_by are required' });
  }

  db.run(
    `INSERT INTO disputes 
     (opportunity_id, commission_snapshot_id, nature, description, supporting_evidence, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [opportunity_id, commission_snapshot_id || null, nature, description, supporting_evidence, created_by],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Update dispute (resolve/reject)
router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { status, resolution_decision, resolved_by } = req.body;

  if (!status || !resolved_by) {
    return res.status(400).json({ error: 'status and resolved_by are required' });
  }

  db.run(
    `UPDATE disputes 
     SET status = ?, resolution_decision = ?, resolved_by = ?, 
         resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, resolution_decision, resolved_by, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

module.exports = router;


