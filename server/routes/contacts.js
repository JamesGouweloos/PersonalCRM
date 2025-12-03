const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all contacts
router.get('/', (req, res) => {
  const db = getDB();
  const { search } = req.query;
  
  let query = 'SELECT * FROM contacts';
  const params = [];

  if (search) {
    query += ' WHERE name LIKE ? OR email LIKE ? OR company LIKE ?';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single contact
router.get('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(row);
  });
});

// Create contact
router.post('/', (req, res) => {
  const db = getDB();
  const { name, email, phone, company, title, notes, contact_type } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Normalize email for duplicate checking (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate by email (case-insensitive)
  db.get(
    'SELECT * FROM contacts WHERE LOWER(TRIM(email)) = ?',
    [normalizedEmail],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existing) {
        // Return existing contact instead of creating duplicate
        return res.status(200).json({
          id: existing.id,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          company: existing.company,
          title: existing.title,
          notes: existing.notes,
          contact_type: existing.contact_type,
          created_at: existing.created_at,
          updated_at: existing.updated_at,
          duplicate: true,
          message: 'Contact with this email already exists'
        });
      }

      // Create new contact if no duplicate found
      db.run(
        'INSERT INTO contacts (name, email, phone, company, title, notes, contact_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, phone, company, title, notes, contact_type || 'Other'],
        function(insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: insertErr.message });
          }
          res.json({ id: this.lastID, ...req.body });
        }
      );
    }
  );
});

// Update contact
router.put('/:id', (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { name, email, phone, company, title, notes, contact_type } = req.body;

    // Validate id
    const contactId = parseInt(id, 10);
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

  // Normalize email for duplicate checking (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();

  // Helper function to perform the update
  const performUpdate = () => {
    // Ensure contact_type is valid
    const validContactTypes = ['Agent', 'Direct', 'Other', 'Spam', 'Internal'];
    const finalContactType = (contact_type && validContactTypes.includes(contact_type)) 
      ? contact_type 
      : 'Other';

    // Prepare values, handling null/undefined
    const updateValues = [
      name || null,
      email,
      phone || null,
      company || null,
      title || null,
      notes || null,
      finalContactType,
      contactId
    ];

    console.log('Updating contact:', { id: contactId, name, email, contact_type: finalContactType });

    db.run(
      'UPDATE contacts SET name = ?, email = ?, phone = ?, company = ?, title = ?, notes = ?, contact_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      updateValues,
      function(updateErr) {
        if (updateErr) {
          console.error('Error updating contact:', updateErr);
          console.error('SQL Error details:', {
            code: updateErr.code,
            message: updateErr.message,
            errno: updateErr.errno
          });
          return res.status(500).json({ 
            error: updateErr.message,
            details: updateErr.code || 'Unknown database error'
          });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Contact not found' });
        }

        // Fetch and return the updated contact
        db.get('SELECT * FROM contacts WHERE id = ?', [contactId], (fetchErr, updatedContact) => {
          if (fetchErr) {
            console.error('Error fetching updated contact:', fetchErr);
            return res.status(500).json({ error: fetchErr.message });
          }
          if (!updatedContact) {
            return res.status(404).json({ error: 'Contact not found after update' });
          }
          res.json(updatedContact);
        });
      }
    );
  };

  // Check if email is being changed and if it would create a duplicate
  db.get('SELECT id, email FROM contacts WHERE id = ?', [contactId], (getErr, currentContact) => {
    if (getErr) {
      console.error('Error fetching current contact:', getErr);
      return res.status(500).json({ error: getErr.message });
    }
    if (!currentContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const currentNormalizedEmail = currentContact.email ? currentContact.email.toLowerCase().trim() : null;
    const emailChanged = currentNormalizedEmail !== normalizedEmail;

    // If email is being changed, check for duplicates
    if (emailChanged) {
      db.get(
        'SELECT * FROM contacts WHERE LOWER(TRIM(email)) = ? AND id != ?',
        [normalizedEmail, contactId],
        (dupErr, duplicate) => {
          if (dupErr) {
            console.error('Error checking for duplicate:', dupErr);
            return res.status(500).json({ error: dupErr.message });
          }

          if (duplicate) {
            // Email already exists for another contact
            return res.status(409).json({
              error: 'A contact with this email already exists',
              duplicate: true,
              existingContact: {
                id: duplicate.id,
                name: duplicate.name,
                email: duplicate.email
              }
            });
          }

          // No duplicate, proceed with update
          performUpdate();
        }
      );
    } else {
      // Email not changed, proceed with update
      performUpdate();
    }
  });
  } catch (error) {
    console.error('Unexpected error in update contact:', error);
    return res.status(500).json({ 
      error: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete contact
router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

// Get contact's opportunities
router.get('/:id/opportunities', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  db.all(
    `SELECT o.*, ps.name as stage_name, ps.color as stage_color
     FROM opportunities o
     LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
     WHERE o.contact_id = ?
     ORDER BY o.created_at DESC`,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Delete all contacts (for testing)
router.delete('/all', (req, res) => {
  const db = getDB();
  
  db.run('DELETE FROM contacts', function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, deleted: this.changes, message: `Deleted ${this.changes} contacts` });
  });
});

module.exports = router;


