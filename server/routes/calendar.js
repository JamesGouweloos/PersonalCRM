const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const outlookService = require('../services/outlook');

// Helper function to get and refresh token if needed
async function getValidAccessToken(db) {
  const tokenRow = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, access_token, refresh_token, expires_at FROM oauth_tokens WHERE provider = ? ORDER BY updated_at DESC LIMIT 1',
      ['outlook'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!tokenRow) {
    throw new Error('Not authenticated. Please connect your Outlook account.');
  }

  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
  const bufferTime = 30 * 60 * 1000; // 30 minutes
  const isExpired = expiresAt && (expiresAt.getTime() - bufferTime) < Date.now();

  if (tokenRow.refresh_token && (isExpired || !expiresAt)) {
    try {
      const tokenData = await outlookService.refreshAccessToken(tokenRow.refresh_token);
      const newExpiresAt = tokenData.expiresIn 
        ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
        : null;
      
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [tokenData.accessToken, tokenData.refreshToken || tokenRow.refresh_token, newExpiresAt, tokenRow.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return tokenData.accessToken;
    } catch (refreshError) {
      throw new Error('Token refresh failed. Please reconnect your Outlook account.');
    }
  }

  return tokenRow.access_token;
}

// Sync calendar events from Outlook
router.post('/sync', async (req, res) => {
  try {
    const db = getDB();
    const { startDate, endDate } = req.body;
    
    const accessToken = await getValidAccessToken(db);
    const events = await outlookService.fetchCalendarEvents(accessToken, startDate, endDate);
    
    let syncedCount = 0;
    
    for (const event of events) {
      // Check if event already exists
      db.get(
        'SELECT id FROM calendar_events WHERE external_id = ?',
        [event.id],
        (err, existing) => {
          if (err) {
            console.error('Error checking existing event:', err);
            return;
          }

          if (!existing) {
            // Try to find linked contact from attendees
            let contactId = null;
            if (event.attendees && event.attendees.length > 0) {
              const attendeeEmail = event.attendees[0].email;
              if (attendeeEmail) {
                db.get(
                  'SELECT id FROM contacts WHERE email = ?',
                  [attendeeEmail],
                  (contactErr, contact) => {
                    if (!contactErr && contact) {
                      contactId = contact.id;
                    }
                    insertEvent();
                  }
                );
              } else {
                insertEvent();
              }
            } else {
              insertEvent();
            }

            function insertEvent() {
              db.run(
                `INSERT INTO calendar_events 
                 (external_id, subject, body, start_datetime, end_datetime, location, is_all_day, 
                  attendees, organizer_email, contact_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  event.id,
                  event.subject,
                  event.body,
                  event.startDateTime,
                  event.endDateTime,
                  event.location,
                  event.isAllDay ? 1 : 0,
                  JSON.stringify(event.attendees || []),
                  event.organizer,
                  contactId,
                  'confirmed'
                ],
                function(insertErr) {
                  if (insertErr) {
                    console.error('Error inserting calendar event:', insertErr);
                  } else {
                    syncedCount++;
                  }
                }
              );
            }
          } else {
            // Update existing event
            db.run(
              `UPDATE calendar_events 
               SET subject = ?, body = ?, start_datetime = ?, end_datetime = ?, 
                   location = ?, is_all_day = ?, attendees = ?, organizer_email = ?, updated_at = CURRENT_TIMESTAMP
               WHERE external_id = ?`,
              [
                event.subject,
                event.body,
                event.startDateTime,
                event.endDateTime,
                event.location,
                event.isAllDay ? 1 : 0,
                JSON.stringify(event.attendees || []),
                event.organizer,
                event.id
              ],
              (updateErr) => {
                if (updateErr) {
                  console.error('Error updating calendar event:', updateErr);
                }
              }
            );
          }
        }
      );
    }

    // Wait for async operations
    setTimeout(() => {
      res.json({ 
        success: true, 
        synced: syncedCount,
        total: events.length 
      });
    }, 1000);
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get calendar events
router.get('/', (req, res) => {
  const db = getDB();
  const { startDate, endDate, contactId, followUpId } = req.query;

  let query = `
    SELECT 
      e.*,
      c.name as contact_name,
      c.email as contact_email,
      f.id as follow_up_id,
      f.type as follow_up_type,
      f.completed as follow_up_completed
    FROM calendar_events e
    LEFT JOIN contacts c ON e.contact_id = c.id
    LEFT JOIN follow_ups f ON e.follow_up_id = f.id
    WHERE 1=1
  `;
  const params = [];

  if (startDate) {
    query += ' AND e.start_datetime >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND e.end_datetime <= ?';
    params.push(endDate);
  }

  if (contactId) {
    query += ' AND e.contact_id = ?';
    params.push(contactId);
  }

  if (followUpId) {
    query += ' AND e.follow_up_id = ?';
    params.push(followUpId);
  }

  query += ' ORDER BY e.start_datetime ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const formattedRows = rows.map(row => ({
      ...row,
      is_all_day: row.is_all_day === 1,
      attendees: row.attendees ? JSON.parse(row.attendees) : [],
      follow_up_completed: row.follow_up_completed === 1
    }));
    
    res.json(formattedRows);
  });
});

// Create calendar event (and optionally link to follow-up)
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { 
      subject, 
      body, 
      startDateTime, 
      endDateTime, 
      location, 
      isAllDay, 
      attendees,
      followUpId,
      contactId,
      opportunityId,
      leadId
    } = req.body;

    if (!subject || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Subject, startDateTime, and endDateTime are required' });
    }

    const accessToken = await getValidAccessToken(db);
    
    // Create event in Outlook
    const outlookEvent = await outlookService.createCalendarEvent(accessToken, {
      subject,
      body,
      startDateTime,
      endDateTime,
      location,
      isAllDay,
      attendees
    });

    // Save to database
    db.run(
      `INSERT INTO calendar_events 
       (external_id, subject, body, start_datetime, end_datetime, location, is_all_day, 
        attendees, organizer_email, follow_up_id, contact_id, opportunity_id, lead_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        outlookEvent.id,
        subject,
        body || '',
        startDateTime,
        endDateTime,
        location || null,
        isAllDay ? 1 : 0,
        JSON.stringify(attendees || []),
        null, // Will be set from Outlook
        followUpId || null,
        contactId || null,
        opportunityId || null,
        leadId || null,
        'confirmed'
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // If linked to follow-up, update follow-up with calendar_event_id
        if (followUpId) {
          db.run(
            'UPDATE follow_ups SET calendar_event_id = ? WHERE id = ?',
            [outlookEvent.id, followUpId],
            () => {}
          );
        }

        res.json({
          id: this.lastID,
          external_id: outlookEvent.id,
          subject,
          webLink: outlookEvent.webLink,
          startDateTime,
          endDateTime
        });
      }
    );
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update calendar event
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updates = req.body;

    // Get event to find external_id
    db.get(
      'SELECT external_id FROM calendar_events WHERE id = ?',
      [id],
      async (err, event) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        // Update in Outlook if external_id exists
        if (event.external_id) {
          try {
            const accessToken = await getValidAccessToken(db);
            await outlookService.updateCalendarEvent(accessToken, event.external_id, updates);
          } catch (outlookError) {
            console.error('Error updating Outlook event:', outlookError);
            // Continue with database update even if Outlook update fails
          }
        }

        // Update in database
        const dbUpdates = [];
        const params = [];

        if (updates.subject !== undefined) {
          dbUpdates.push('subject = ?');
          params.push(updates.subject);
        }
        if (updates.body !== undefined) {
          dbUpdates.push('body = ?');
          params.push(updates.body);
        }
        if (updates.startDateTime !== undefined) {
          dbUpdates.push('start_datetime = ?');
          params.push(updates.startDateTime);
        }
        if (updates.endDateTime !== undefined) {
          dbUpdates.push('end_datetime = ?');
          params.push(updates.endDateTime);
        }
        if (updates.location !== undefined) {
          dbUpdates.push('location = ?');
          params.push(updates.location);
        }
        if (updates.status !== undefined) {
          dbUpdates.push('status = ?');
          params.push(updates.status);
        }

        params.push(id);

        db.run(
          `UPDATE calendar_events SET ${dbUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          params,
          function(updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: updateErr.message });
            }
            res.json({ success: true, changes: this.changes });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete calendar event
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    // Get event to find external_id
    db.get(
      'SELECT external_id FROM calendar_events WHERE id = ?',
      [id],
      async (err, event) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        // Delete from Outlook if external_id exists
        if (event.external_id) {
          try {
            const accessToken = await getValidAccessToken(db);
            await outlookService.deleteCalendarEvent(accessToken, event.external_id);
          } catch (outlookError) {
            console.error('Error deleting Outlook event:', outlookError);
            // Continue with database deletion even if Outlook deletion fails
          }
        }

        // Delete from database
        db.run('DELETE FROM calendar_events WHERE id = ?', [id], function(deleteErr) {
          if (deleteErr) {
            return res.status(500).json({ error: deleteErr.message });
          }
          res.json({ success: true, changes: this.changes });
        });
      }
    );
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



