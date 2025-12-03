const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get WhatsApp integration
router.get('/', (req, res) => {
  const db = getDB();
  db.get('SELECT * FROM whatsapp_integrations ORDER BY created_at DESC LIMIT 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.json({ enabled: false });
    }
    res.json({ ...row, enabled: row.enabled === 1 });
  });
});

// Create or update WhatsApp integration
router.post('/', (req, res) => {
  const db = getDB();
  const { phone_number, api_key, webhook_url, enabled } = req.body;

  // Check if exists
  db.get('SELECT id FROM whatsapp_integrations LIMIT 1', [], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update
      db.run(
        `UPDATE whatsapp_integrations 
         SET phone_number = ?, api_key = ?, webhook_url = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [phone_number, api_key, webhook_url, enabled ? 1 : 0, existing.id],
        function(updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }
          res.json({ success: true, changes: this.changes });
        }
      );
    } else {
      // Insert
      db.run(
        `INSERT INTO whatsapp_integrations (phone_number, api_key, webhook_url, enabled)
         VALUES (?, ?, ?, ?)`,
        [phone_number, api_key, webhook_url, enabled ? 1 : 0],
        function(insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: insertErr.message });
          }
          res.json({ id: this.lastID, ...req.body });
        }
      );
    }
  });
});

// Webhook endpoint for receiving WhatsApp messages
router.post('/webhook', (req, res) => {
  const db = getDB();
  const { from, body, timestamp } = req.body;

  // Store message as communication
  db.run(
    `INSERT INTO communications (type, body, from_email, source, occurred_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['whatsapp', body, from, 'whatsapp', new Date(timestamp || Date.now()).toISOString()],
    function(err) {
      if (err) {
        console.error('Error storing WhatsApp message:', err);
        return res.status(500).json({ error: err.message });
      }

      // Try to find or create contact
      db.get('SELECT id FROM contacts WHERE phone = ?', [from], (contactErr, contact) => {
        if (!contactErr && !contact) {
          // Create contact from phone number
          db.run(
            'INSERT INTO contacts (name, phone) VALUES (?, ?)',
            [from, from],
            function(createErr) {
              if (!createErr) {
                // Link communication to contact
                db.run(
                  'UPDATE communications SET contact_id = ? WHERE id = ?',
                  [this.lastID, this.lastID]
                );
              }
            }
          );
        }
      });

      res.json({ success: true });
    }
  );
});

// Send WhatsApp message (placeholder)
router.post('/send', async (req, res) => {
  const { to, message } = req.body;
  const db = getDB();

  // Get integration
  db.get('SELECT * FROM whatsapp_integrations WHERE enabled = 1 LIMIT 1', [], async (err, integration) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!integration) {
      return res.status(404).json({ error: 'WhatsApp integration not configured' });
    }

    // TODO: Implement actual WhatsApp API call
    // This is a placeholder
    try {
      // Store sent message as communication
      db.run(
        `INSERT INTO communications (type, body, to_email, source, occurred_at)
         VALUES (?, ?, ?, ?, ?)`,
        ['whatsapp', message, to, 'whatsapp', new Date().toISOString()],
        function(storeErr) {
          if (storeErr) {
            console.error('Error storing sent message:', storeErr);
          }
        }
      );

      res.json({
        success: true,
        message: 'WhatsApp message sending functionality will be implemented',
        to,
        message
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

module.exports = router;


