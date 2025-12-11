const express = require('express');
const multer = require('multer');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const { getDB } = require('../database');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || path.extname(file.originalname).toLowerCase() === '.xml') {
      cb(null, true);
    } else {
      cb(new Error('Only XML files are allowed'));
    }
  }
});

// Upload and parse call log XML
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const db = getDB();
  const filePath = req.file.path;
  let importedCount = 0;
  let skippedCount = 0;
  let errors = [];

  try {
    // Read and parse XML file
    const xmlData = fs.readFileSync(filePath, 'utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);

    if (!result.calls || !result.calls.call) {
      return res.status(400).json({ error: 'Invalid XML format: no calls found' });
    }

    const calls = Array.isArray(result.calls.call) ? result.calls.call : [result.calls.call];
    
    // Helper function to insert call log
    const insertCallLog = (contactId, phoneNumber, direction, duration, outcome, occurredAt, resolve) => {
      // Check if call log already exists (prevent duplicates)
      db.get(
        'SELECT id FROM call_logs WHERE phone_number = ? AND occurred_at = ? AND duration = ?',
        [phoneNumber, occurredAt, duration],
        (checkErr, existing) => {
          if (checkErr) {
            console.error('Error checking for duplicate:', checkErr);
            errors.push(`Error checking duplicate for ${phoneNumber}: ${checkErr.message}`);
            skippedCount++;
            resolve();
            return;
          }

          if (existing) {
            skippedCount++;
            resolve();
            return;
          }

          // Insert call log
          db.run(
            `INSERT INTO call_logs 
             (contact_id, phone_number, direction, duration, outcome, user, occurred_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [contactId, phoneNumber, direction, duration, outcome, 'James', occurredAt],
            function(insertErr) {
              if (insertErr) {
                console.error('Error inserting call log:', insertErr);
                errors.push(`Error inserting call log for ${phoneNumber}: ${insertErr.message}`);
                skippedCount++;
              } else {
                importedCount++;
              }
              resolve();
            }
          );
        }
      );
    };

    // Filter for subscription_id="2" and process each call
    const processCall = (call) => {
      return new Promise((resolve) => {
        const subscriptionId = call.$.subscription_id;
        
        if (subscriptionId !== '2') {
          skippedCount++;
          resolve();
          return;
        }

        try {
          const phoneNumber = call.$.number || '';
          const duration = parseInt(call.$.duration || '0', 10);
          const dateMs = parseInt(call.$.date || '0', 10);
          const type = call.$.type || '2'; // 1=incoming, 2=outgoing
          const contactName = call.$.contact_name || phoneNumber;

          // Determine direction based on type
          // type 1 = incoming (inbound), type 2 = outgoing (outbound)
          const direction = type === '1' ? 'inbound' : 'outbound';

          // Convert timestamp from milliseconds to ISO string
          const occurredAt = new Date(dateMs).toISOString();

          // Determine outcome based on duration and type
          let outcome = null;
          if (duration === 0) {
            outcome = type === '1' ? 'missed' : 'no_answer';
          } else if (duration > 0) {
            outcome = 'answered';
          }

          // Find or create contact by phone number
          db.get(
            'SELECT id FROM contacts WHERE phone = ? LIMIT 1',
            [phoneNumber],
            (err, existingContact) => {
              if (err) {
                console.error('Error finding contact:', err);
                errors.push(`Error finding contact for ${phoneNumber}: ${err.message}`);
                skippedCount++;
                resolve();
                return;
              }

              let contactId = null;

              if (existingContact) {
                contactId = existingContact.id;
                insertCallLog(contactId, phoneNumber, direction, duration, outcome, occurredAt, resolve);
              } else {
                // Create new contact if not found
                const normalizedName = contactName.replace(/[()]/g, '').trim();
                
                db.run(
                  'INSERT INTO contacts (name, phone, contact_type) VALUES (?, ?, ?)',
                  [normalizedName || phoneNumber, phoneNumber, 'Direct'],
                  function(insertErr) {
                    if (insertErr) {
                      console.error('Error creating contact:', insertErr);
                      errors.push(`Error creating contact for ${phoneNumber}: ${insertErr.message}`);
                      skippedCount++;
                      resolve();
                      return;
                    }
                    contactId = this.lastID;
                    insertCallLog(contactId, phoneNumber, direction, duration, outcome, occurredAt, resolve);
                  }
                );
              }
            }
          );
        } catch (callError) {
          console.error('Error processing call:', callError);
          errors.push(`Error processing call: ${callError.message}`);
          skippedCount++;
          resolve();
        }
      });
    };

    // Process all calls sequentially to avoid database lock issues
    for (const call of calls) {
      await processCall(call);
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Limit errors to first 10
      totalProcessed: calls.length
    });
  } catch (error) {
    console.error('Error processing XML file:', error);
    
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({ 
      error: 'Failed to process XML file',
      message: error.message 
    });
  }
});

module.exports = router;

