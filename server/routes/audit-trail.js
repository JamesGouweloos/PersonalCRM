const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get audit trail for an opportunity
router.get('/opportunity/:opportunityId', (req, res) => {
  const db = getDB();
  const { opportunityId } = req.params;

  db.all(
    `SELECT * FROM audit_trail WHERE opportunity_id = ? ORDER BY changed_at DESC`,
    [opportunityId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Get audit trail for a specific field
router.get('/opportunity/:opportunityId/field/:fieldName', (req, res) => {
  const db = getDB();
  const { opportunityId, fieldName } = req.params;

  db.all(
    `SELECT * FROM audit_trail 
     WHERE opportunity_id = ? AND field_name = ? 
     ORDER BY changed_at DESC`,
    [opportunityId, fieldName],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

module.exports = router;


