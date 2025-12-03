const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const emailRules = require('../services/email-rules');
const categoryMapper = require('../services/category-mapper');
const emailProcessor = require('../services/email-processor');
const outlookService = require('../services/outlook');

// Get all rules
router.get('/', (req, res) => {
  const db = getDB();
  db.all(
    'SELECT * FROM email_rules ORDER BY priority DESC, id ASC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows.map(row => ({
        ...row,
        conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
        actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions
      })));
    }
  );
});

// Get single rule
router.get('/:id', (req, res) => {
  const db = getDB();
  db.get(
    'SELECT * FROM email_rules WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json({
        ...row,
        conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
        actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions
      });
    }
  );
});

// Create new rule
router.post('/', (req, res) => {
  const db = getDB();
  const { name, description, priority, enabled, conditions, actions } = req.body;

  if (!name || !conditions || !actions) {
    return res.status(400).json({ error: 'Name, conditions, and actions are required' });
  }

  db.run(
    `INSERT INTO email_rules (name, description, priority, enabled, conditions, actions)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || null,
      priority || 0,
      enabled !== undefined ? enabled : 1,
      JSON.stringify(conditions),
      JSON.stringify(actions)
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, name, description, priority, enabled, conditions, actions });
    }
  );
});

// Update rule
router.put('/:id', (req, res) => {
  const db = getDB();
  const { name, description, priority, enabled, conditions, actions } = req.body;

  db.run(
    `UPDATE email_rules 
     SET name = ?, description = ?, priority = ?, enabled = ?, conditions = ?, actions = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      name,
      description,
      priority,
      enabled,
      JSON.stringify(conditions),
      JSON.stringify(actions),
      req.params.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Delete rule
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.run(
    'DELETE FROM email_rules WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Test rule against sample email
router.post('/:id/test', async (req, res) => {
  try {
    const db = getDB();
    const { sampleEmail } = req.body;

    if (!sampleEmail) {
      return res.status(400).json({ error: 'Sample email is required' });
    }

    db.get('SELECT * FROM email_rules WHERE id = ?', [req.params.id], async (err, rule) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      const testResult = emailRules.testRule(rule, sampleEmail);
      res.json(testResult);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger rule processing for an email
router.post('/process-email/:emailId', async (req, res) => {
  try {
    const db = getDB();
    
    // Get email from database
    db.get(
      'SELECT * FROM communications WHERE id = ? OR external_id = ?',
      [req.params.emailId, req.params.emailId],
      async (err, email) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!email) {
          return res.status(404).json({ error: 'Email not found' });
        }

        // Get access token if needed
        let accessToken = null;
        try {
          const tokenRow = await new Promise((resolve, reject) => {
            db.get(
              'SELECT access_token FROM oauth_tokens WHERE provider = ? ORDER BY updated_at DESC LIMIT 1',
              ['outlook'],
              (tokenErr, row) => {
                if (tokenErr) reject(tokenErr);
                else resolve(row);
              }
            );
          });
          accessToken = tokenRow?.access_token;
        } catch (tokenErr) {
          console.warn('Could not get access token for processing:', tokenErr);
        }

        const result = await emailProcessor.processEmail(email, accessToken);
        res.json(result);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Category mappings endpoints

// Get all category mappings
router.get('/categories', async (req, res) => {
  try {
    const mappings = await categoryMapper.getCategoryMappings();
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single category mapping
router.get('/categories/:id', async (req, res) => {
  try {
    const db = getDB();
    db.get(
      'SELECT * FROM email_categories WHERE id = ?',
      [req.params.id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.status(404).json({ error: 'Category mapping not found' });
        }
        res.json(row);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category mapping
router.post('/categories', async (req, res) => {
  try {
    const { category_name, crm_field_type, crm_field_value } = req.body;

    if (!category_name || !crm_field_type || !crm_field_value) {
      return res.status(400).json({ error: 'category_name, crm_field_type, and crm_field_value are required' });
    }

    const mapping = await categoryMapper.saveCategoryMapping({
      category_name,
      crm_field_type,
      crm_field_value
    });

    res.json(mapping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category mapping
router.put('/categories/:id', async (req, res) => {
  try {
    const db = getDB();
    const { category_name, crm_field_type, crm_field_value } = req.body;

    db.run(
      `UPDATE email_categories 
       SET category_name = ?, crm_field_type = ?, crm_field_value = ?
       WHERE id = ?`,
      [category_name, crm_field_type, crm_field_value, req.params.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Category mapping not found' });
        }
        res.json({ success: true, changes: this.changes });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category mapping
router.delete('/categories/:id', async (req, res) => {
  try {
    const result = await categoryMapper.deleteCategoryMapping(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize/refresh default rules
router.post('/initialize-defaults', async (req, res) => {
  try {
    const defaultRules = require('../services/default-rules');
    await defaultRules.initializeDefaultRules();
    res.json({ success: true, message: 'Default rules initialized/updated' });
  } catch (error) {
    console.error('Error initializing default rules:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


