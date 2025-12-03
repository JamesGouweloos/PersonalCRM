const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all social media integrations
router.get('/', (req, res) => {
  const db = getDB();
  db.all('SELECT * FROM social_media_integrations ORDER BY platform', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const formatted = rows.map(row => ({
      ...row,
      enabled: row.enabled === 1
    }));
    res.json(formatted);
  });
});

// Get single integration
router.get('/:platform', (req, res) => {
  const db = getDB();
  const { platform } = req.params;

  db.get(
    'SELECT * FROM social_media_integrations WHERE platform = ?',
    [platform],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      res.json({ ...row, enabled: row.enabled === 1 });
    }
  );
});

// Create or update integration
router.post('/', (req, res) => {
  const db = getDB();
  const { platform, access_token, refresh_token, expires_at, account_id, account_name, enabled } = req.body;

  db.run(
    `INSERT INTO social_media_integrations 
     (platform, access_token, refresh_token, expires_at, account_id, account_name, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(platform) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       account_id = excluded.account_id,
       account_name = excluded.account_name,
       enabled = excluded.enabled,
       updated_at = CURRENT_TIMESTAMP`,
    [platform, access_token, refresh_token, expires_at, account_id, account_name, enabled ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Delete integration
router.delete('/:platform', (req, res) => {
  const db = getDB();
  const { platform } = req.params;

  db.run('DELETE FROM social_media_integrations WHERE platform = ?', [platform], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

// Sync social media data (placeholder for future implementation)
router.post('/:platform/sync', async (req, res) => {
  const { platform } = req.params;
  const db = getDB();

  // Get integration
  db.get(
    'SELECT * FROM social_media_integrations WHERE platform = ? AND enabled = 1',
    [platform],
    async (err, integration) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found or disabled' });
      }

      // TODO: Implement platform-specific sync logic
      // This is a placeholder structure
      try {
        let syncedCount = 0;
        
        // Platform-specific sync logic would go here
        // For now, return success
        res.json({
          success: true,
          platform,
          synced: syncedCount,
          message: `Sync functionality for ${platform} will be implemented`
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
});

module.exports = router;


