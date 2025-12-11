const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all follow-ups
router.get('/', (req, res) => {
  const db = getDB();
  const { type, completed, leadId, contactId } = req.query;

  let query = `
    SELECT 
      f.*,
      c.name as contact_name,
      c.email as contact_email,
      l.status as lead_status
    FROM follow_ups f
    JOIN contacts c ON f.contact_id = c.id
    JOIN leads l ON f.lead_id = l.id
    WHERE 1=1
  `;
  const params = [];

  if (type && type !== 'all') {
    query += ' AND f.type = ?';
    params.push(type);
  }

  if (completed !== undefined) {
    query += ' AND f.completed = ?';
    params.push(completed === 'true' ? 1 : 0);
  }

  if (leadId) {
    query += ' AND f.lead_id = ?';
    params.push(leadId);
  }

  if (contactId) {
    query += ' AND f.contact_id = ?';
    params.push(contactId);
  }

  query += ' ORDER BY f.scheduled_date ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Convert completed from integer to boolean
    const formattedRows = rows.map(row => ({
      ...row,
      completed: row.completed === 1
    }));
    res.json(formattedRows);
  });
});

// Create follow-up
router.post('/', async (req, res) => {
  const db = getDB();
  const { lead_id, contact_id, scheduled_date, type, notes, opportunity_id } = req.body;

  // Calculate end time (default to 30 minutes for calls, 15 minutes for emails)
  const startDate = new Date(scheduled_date);
  const durationMinutes = type === 'call' ? 30 : 15;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  // Get contact info for calendar event
  db.get(
    'SELECT name, email FROM contacts WHERE id = ?',
    [contact_id],
    async (contactErr, contact) => {
      if (contactErr) {
        return res.status(500).json({ error: contactErr.message });
      }

      // Create follow-up in database first
      db.run(
        `INSERT INTO follow_ups (lead_id, contact_id, scheduled_date, type, notes, opportunity_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [lead_id, contact_id, scheduled_date, type, notes || null, opportunity_id || null],
        async function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const followUpId = this.lastID;
          let calendarEventId = null;

          // Try to create calendar event in Outlook
          try {
            const accessToken = await getValidAccessToken(db);
            if (accessToken && contact) {
              const eventSubject = `${type === 'call' ? 'Call' : type === 'email' ? 'Email' : 'Follow-up'} with ${contact.name || contact.email}`;
              const eventBody = notes ? `<p>${notes}</p>` : '';
              const attendees = contact.email ? [contact.email] : [];

              const outlookEvent = await outlookService.createCalendarEvent(accessToken, {
                subject: eventSubject,
                body: eventBody,
                startDateTime: startDate.toISOString(),
                endDateTime: endDate.toISOString(),
                location: null,
                isAllDay: false,
                attendees: attendees,
                followUpId: followUpId
              });

              calendarEventId = outlookEvent.id;

              // Update follow-up with calendar event ID
              db.run(
                'UPDATE follow_ups SET calendar_event_id = ? WHERE id = ?',
                [calendarEventId, followUpId],
                () => {}
              );

              // Save calendar event to database
              db.run(
                `INSERT INTO calendar_events 
                 (external_id, subject, body, start_datetime, end_datetime, is_all_day, 
                  attendees, follow_up_id, contact_id, opportunity_id, lead_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  outlookEvent.id,
                  eventSubject,
                  eventBody,
                  startDate.toISOString(),
                  endDate.toISOString(),
                  0,
                  JSON.stringify(attendees),
                  followUpId,
                  contact_id,
                  opportunity_id || null,
                  lead_id,
                  'confirmed'
                ],
                () => {}
              );
            }
          } catch (calendarError) {
            console.error('Error creating calendar event for follow-up:', calendarError);
            // Continue even if calendar creation fails
          }

          res.json({ 
            id: followUpId, 
            ...req.body, 
            completed: false,
            calendar_event_id: calendarEventId
          });
        }
      );
    }
  );
});

// Update follow-up
router.put('/:id', async (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { scheduled_date, type, notes, completed } = req.body;

  // Get follow-up to check for calendar event
  db.get(
    'SELECT calendar_event_id, contact_id FROM follow_ups WHERE id = ?',
    [id],
    async (getErr, followUp) => {
      if (getErr) {
        return res.status(500).json({ error: getErr.message });
      }

      // Update calendar event if scheduled_date changed and calendar_event_id exists
      if (scheduled_date !== undefined && followUp?.calendar_event_id) {
        try {
          const accessToken = await getValidAccessToken(db);
          if (accessToken) {
            const startDate = new Date(scheduled_date);
            const durationMinutes = (type || 'call') === 'call' ? 30 : 15;
            const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

            await outlookService.updateCalendarEvent(accessToken, followUp.calendar_event_id, {
              startDateTime: startDate.toISOString(),
              endDateTime: endDate.toISOString()
            });

            // Update calendar event in database
            db.run(
              'UPDATE calendar_events SET start_datetime = ?, end_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE external_id = ?',
              [startDate.toISOString(), endDate.toISOString(), followUp.calendar_event_id],
              () => {}
            );
          }
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
          // Continue with follow-up update even if calendar update fails
        }
      }

      // Update calendar event status if completed changed
      if (completed !== undefined && followUp?.calendar_event_id) {
        try {
          const accessToken = await getValidAccessToken(db);
          if (accessToken) {
            // Mark calendar event as completed or confirmed based on follow-up status
            // Note: Outlook doesn't have a "completed" status, but we can update our database
            db.run(
              'UPDATE calendar_events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE external_id = ?',
              [completed ? 'completed' : 'confirmed', followUp.calendar_event_id],
              () => {}
            );
          }
        } catch (calendarError) {
          console.error('Error updating calendar event status:', calendarError);
        }
      }

      const updates = [];
      const params = [];

      if (scheduled_date !== undefined) {
        updates.push('scheduled_date = ?');
        params.push(scheduled_date);
      }
      if (type !== undefined) {
        updates.push('type = ?');
        params.push(type);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes);
      }
      if (completed !== undefined) {
        updates.push('completed = ?');
        params.push(completed === true ? 1 : 0);
      }

      params.push(id);

      db.run(
        `UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true, changes: this.changes });
        }
      );
    }
  );
});

// Delete follow-up
router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.run('DELETE FROM follow_ups WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

module.exports = router;


