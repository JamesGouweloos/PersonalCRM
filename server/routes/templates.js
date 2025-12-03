const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all templates
router.get('/', (req, res) => {
  const db = getDB();
  const { type } = req.query;

  let query = 'SELECT * FROM email_templates';
  const params = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single template
router.get('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.get('SELECT * FROM email_templates WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(row);
  });
});

// Create template
router.post('/', (req, res) => {
  const db = getDB();
  const { name, subject, body, type } = req.body;

  db.run(
    `INSERT INTO email_templates (name, subject, body, type)
     VALUES (?, ?, ?, ?)`,
    [name, subject, body, type],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Update template
router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { name, subject, body, type } = req.body;

  db.run(
    `UPDATE email_templates 
     SET name = ?, subject = ?, body = ?, type = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, subject, body, type, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Delete template
router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.run('DELETE FROM email_templates WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

module.exports = router;


