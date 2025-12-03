const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all follow-ups
router.get('/', (req, res) => {
  const db = getDB();
  const { type, completed, leadId, contactId } = req.query;

  let query = `
    SELECT 
      f.*,
      c.name as contact_name,
      c.email as contact_email,
      l.status as lead_status
    FROM follow_ups f
    JOIN contacts c ON f.contact_id = c.id
    JOIN leads l ON f.lead_id = l.id
    WHERE 1=1
  `;
  const params = [];

  if (type && type !== 'all') {
    query += ' AND f.type = ?';
    params.push(type);
  }

  if (completed !== undefined) {
    query += ' AND f.completed = ?';
    params.push(completed === 'true' ? 1 : 0);
  }

  if (leadId) {
    query += ' AND f.lead_id = ?';
    params.push(leadId);
  }

  if (contactId) {
    query += ' AND f.contact_id = ?';
    params.push(contactId);
  }

  query += ' ORDER BY f.scheduled_date ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Convert completed from integer to boolean
    const formattedRows = rows.map(row => ({
      ...row,
      completed: row.completed === 1
    }));
    res.json(formattedRows);
  });
});

// Create follow-up
router.post('/', (req, res) => {
  const db = getDB();
  const { lead_id, contact_id, scheduled_date, type, notes } = req.body;

  db.run(
    `INSERT INTO follow_ups (lead_id, contact_id, scheduled_date, type, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [lead_id, contact_id, scheduled_date, type, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, ...req.body, completed: false });
    }
  );
});

// Update follow-up
router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { scheduled_date, type, notes, completed } = req.body;

  const updates = [];
  const params = [];

  if (scheduled_date !== undefined) {
    updates.push('scheduled_date = ?');
    params.push(scheduled_date);
  }
  if (type !== undefined) {
    updates.push('type = ?');
    params.push(type);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  if (completed !== undefined) {
    updates.push('completed = ?');
    params.push(completed === true ? 1 : 0);
  }

  params.push(id);

  db.run(
    `UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Delete follow-up
router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.run('DELETE FROM follow_ups WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

module.exports = router;


