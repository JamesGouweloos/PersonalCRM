const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all communications
router.get('/', (req, res) => {
  const db = getDB();
  const { contactId, opportunityId, type, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT 
      c.*,
      ct.name as contact_name,
      ct.email as contact_email,
      opp.title as opportunity_title
    FROM communications c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    LEFT JOIN opportunities opp ON c.opportunity_id = opp.id
    WHERE 1=1
  `;
  const params = [];

  if (contactId) {
    query += ' AND c.contact_id = ?';
    params.push(contactId);
  }

  if (opportunityId) {
    query += ' AND c.opportunity_id = ?';
    params.push(opportunityId);
  }

  if (type) {
    query += ' AND c.type = ?';
    params.push(type);
  }

  query += ' ORDER BY c.occurred_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create communication
router.post('/', (req, res) => {
  const db = getDB();
  const {
    type,
    subject,
    body,
    from_email,
    to_email,
    contact_id,
    opportunity_id,
    external_id,
    source,
    occurred_at
  } = req.body;

  db.run(
    `INSERT INTO communications 
    (type, subject, body, from_email, to_email, contact_id, opportunity_id, external_id, source, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [type, subject, body, from_email, to_email, contact_id, opportunity_id, external_id, source, occurred_at || new Date().toISOString()],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Link communication to opportunity
router.put('/:id/link-opportunity', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { opportunity_id } = req.body;

  db.run(
    'UPDATE communications SET opportunity_id = ? WHERE id = ?',
    [opportunity_id, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Link communication to contact
router.put('/:id/link-contact', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { contact_id } = req.body;

  db.run(
    'UPDATE communications SET contact_id = ? WHERE id = ?',
    [contact_id, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

module.exports = router;


