const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all activities
router.get('/', (req, res) => {
  const db = getDB();
  const { opportunityId, contactId, type, limit = 100 } = req.query;

  let query = `
    SELECT 
      a.*,
      c.name as contact_name,
      c.email as contact_email,
      o.title as opportunity_title
    FROM activities a
    LEFT JOIN contacts c ON a.contact_id = c.id
    LEFT JOIN opportunities o ON a.opportunity_id = o.id
    WHERE 1=1
  `;
  const params = [];

  if (opportunityId) {
    query += ' AND a.opportunity_id = ?';
    params.push(opportunityId);
  }

  if (contactId) {
    query += ' AND a.contact_id = ?';
    params.push(contactId);
  }

  if (type) {
    query += ' AND a.type = ?';
    params.push(type);
  }

  query += ' ORDER BY a.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create activity - Enhanced with conversation IDs, direction, user, platform
router.post('/', (req, res) => {
  const db = getDB();
  const {
    opportunity_id,
    contact_id,
    type,
    description,
    direction,
    user,
    conversation_id,
    message_id,
    deep_link,
    platform,
    platform_thread_url,
    call_duration,
    call_outcome
  } = req.body;

  if (!contact_id || !type || !user) {
    return res.status(400).json({ error: 'contact_id, type, and user are required' });
  }

  db.run(
    `INSERT INTO activities 
     (opportunity_id, contact_id, type, description, direction, user, 
      conversation_id, message_id, deep_link, platform, platform_thread_url, 
      call_duration, call_outcome)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      opportunity_id || null,
      contact_id,
      type,
      description,
      direction || null,
      user,
      conversation_id || null,
      message_id || null,
      deep_link || null,
      platform || null,
      platform_thread_url || null,
      call_duration || null,
      call_outcome || null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

module.exports = router;


