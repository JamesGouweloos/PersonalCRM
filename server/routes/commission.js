const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get commission snapshot for an opportunity
router.get('/snapshots/:opportunityId', (req, res) => {
  const db = getDB();
  const { opportunityId } = req.params;

  db.get(
    `SELECT * FROM commission_snapshots WHERE opportunity_id = ? ORDER BY created_at DESC LIMIT 1`,
    [opportunityId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(row || null);
    }
  );
});

// Get all commission snapshots
router.get('/snapshots', (req, res) => {
  const db = getDB();
  const { owner, startDate, endDate } = req.query;

  let query = `
    SELECT cs.*, o.title as opportunity_title, c.name as contact_name
    FROM commission_snapshots cs
    JOIN opportunities o ON cs.opportunity_id = o.id
    JOIN contacts c ON o.contact_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (owner) {
    query += ' AND cs.owner = ?';
    params.push(owner);
  }

  if (startDate) {
    query += ' AND cs.closed_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND cs.closed_at <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY cs.closed_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Commission Evidence Report - Comprehensive report for accounting
router.get('/evidence/:opportunityId', (req, res) => {
  const db = getDB();
  const { opportunityId } = req.params;

  // Get opportunity details
  db.get(
    `SELECT o.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone,
            ps.name as stage_name
     FROM opportunities o
     JOIN contacts c ON o.contact_id = c.id
     LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
     WHERE o.id = ?`,
    [opportunityId],
    (err, opportunity) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      // Get commission snapshot
      db.get(
        `SELECT * FROM commission_snapshots WHERE opportunity_id = ? ORDER BY created_at DESC LIMIT 1`,
        [opportunityId],
        (err, snapshot) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Get activities (evidence trail)
          db.all(
            `SELECT * FROM activities WHERE opportunity_id = ? ORDER BY created_at ASC`,
            [opportunityId],
            (err, activities) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // Get call logs
              db.all(
                `SELECT * FROM call_logs WHERE opportunity_id = ? ORDER BY occurred_at ASC`,
                [opportunityId],
                (err, callLogs) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  // Get communications (emails)
                  db.all(
                    `SELECT * FROM communications WHERE opportunity_id = ? ORDER BY occurred_at ASC`,
                    [opportunityId],
                    (err, communications) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      // Get audit trail (key field changes)
                      db.all(
                        `SELECT * FROM audit_trail 
                         WHERE opportunity_id = ? 
                         AND field_name IN ('status', 'assigned_to', 'value', 'source', 'sub_source')
                         ORDER BY changed_at ASC`,
                        [opportunityId],
                        (err, auditTrail) => {
                          if (err) {
                            return res.status(500).json({ error: err.message });
                          }

                          // Get disputes if any
                          db.all(
                            `SELECT * FROM disputes WHERE opportunity_id = ? ORDER BY created_at DESC`,
                            [opportunityId],
                            (err, disputes) => {
                              if (err) {
                                return res.status(500).json({ error: err.message });
                              }

                              // Find first touch activity
                              const firstTouch = activities.length > 0 ? activities[0] : null;

                              res.json({
                                opportunity,
                                commissionSnapshot: snapshot,
                                originSummary: {
                                  source: opportunity.source,
                                  subSource: opportunity.sub_source,
                                  firstTouchDate: firstTouch?.created_at || opportunity.created_at,
                                  firstTouchActivityType: firstTouch?.type || null
                                },
                                evidenceTrail: {
                                  activities,
                                  callLogs,
                                  communications
                                },
                                changeLog: auditTrail,
                                disputes
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;


