const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all leads
router.get('/', (req, res) => {
  const db = getDB();
  const { source, status, assignedTo, contactId } = req.query;

  let query = `
    SELECT 
      l.*,
      c.name as contact_name,
      c.email as contact_email,
      c.phone as contact_phone,
      c.company as contact_company
    FROM leads l
    JOIN contacts c ON l.contact_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (source && source !== 'all') {
    query += ' AND l.source = ?';
    params.push(source);
  }

  if (status && status !== 'all') {
    query += ' AND l.status = ?';
    params.push(status);
  }

  if (assignedTo && assignedTo !== 'all') {
    query += ' AND l.assigned_to = ?';
    params.push(assignedTo);
  }

  if (contactId) {
    query += ' AND l.contact_id = ?';
    params.push(contactId);
  }

  query += ' ORDER BY l.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single lead
router.get('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.get(
    `SELECT l.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone, c.company as contact_company
     FROM leads l
     JOIN contacts c ON l.contact_id = c.id
     WHERE l.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.json(row);
    }
  );
});

// Create lead
router.post('/', (req, res) => {
  const db = getDB();
  const { contact_id, source, status, assigned_to, notes, value } = req.body;

  db.run(
    `INSERT INTO leads (contact_id, source, status, assigned_to, notes, value)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [contact_id, source, status || 'new', assigned_to || 'me', notes, value],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Update lead
router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { source, status, assigned_to, notes, value, last_contacted_at } = req.body;

  const updates = [];
  const params = [];

  if (source !== undefined) {
    updates.push('source = ?');
    params.push(source);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  if (value !== undefined) {
    updates.push('value = ?');
    params.push(value);
  }
  if (last_contacted_at !== undefined) {
    updates.push('last_contacted_at = ?');
    params.push(last_contacted_at);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.run(
    `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Delete lead
router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.run('DELETE FROM leads WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

module.exports = router;


