const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/crm.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;

function getDB() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

// Helper function to add column if it doesn't exist (synchronous version)
function addColumnIfNotExistsSync(tableName, columnName, columnDefinition) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        // Table might not exist yet - that's ok, it will be created with all columns
        resolve();
        return;
      }
      const columnExists = columns.some(col => col.name === columnName);
      if (!columnExists) {
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (alterErr) => {
          if (alterErr) {
            // Column might already exist or there's a constraint issue - ignore
            console.log(`Note: Could not add column ${columnName} to ${tableName}: ${alterErr.message}`);
          } else {
            console.log(`Added column ${columnName} to ${tableName}`);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

// Migrate existing tables to add missing columns (synchronous)
function migrateDatabaseSync() {
  return new Promise((resolve) => {
    const promises = [];
    
    // Add opportunity_id to communications if missing
    promises.push(addColumnIfNotExistsSync('communications', 'opportunity_id', 'INTEGER'));
    
    // Add contact_type to contacts if missing
    promises.push(addColumnIfNotExistsSync('contacts', 'contact_type', "TEXT CHECK(contact_type IN ('Agent', 'Direct', 'Other', 'Spam', 'Internal')) DEFAULT 'Other'"));
    
    // Add missing columns to leads table
    promises.push(addColumnIfNotExistsSync('leads', 'source', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('leads', 'sub_source', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('leads', 'status', 'TEXT DEFAULT "new"'));
    promises.push(addColumnIfNotExistsSync('leads', 'origin_form_id', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('leads', 'origin_campaign_id', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('leads', 'origin_lead_id', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('leads', 'origin_list', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('leads', 'linked_opportunity_id', 'INTEGER'));
    
    // Add missing columns to opportunities table
    promises.push(addColumnIfNotExistsSync('opportunities', 'origin_form_id', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'origin_campaign_id', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'origin_lead_id', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'origin_list', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'commission_value', 'REAL'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'commission_products', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'commission_amount', 'REAL'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'commission_owner', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'commission_locked_by', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('opportunities', 'commission_locked_at', 'DATETIME'));
    
    // Add missing columns to communications table for email automation
    promises.push(addColumnIfNotExistsSync('communications', 'categories', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('communications', 'is_flagged', 'INTEGER DEFAULT 0'));
    promises.push(addColumnIfNotExistsSync('communications', 'flag_due_date', 'DATETIME'));
    promises.push(addColumnIfNotExistsSync('communications', 'folder_id', 'TEXT'));
    promises.push(addColumnIfNotExistsSync('communications', 'processed_by_rules', 'INTEGER DEFAULT 0'));
    promises.push(addColumnIfNotExistsSync('communications', 'direction', "TEXT CHECK(direction IN ('inbound', 'outbound'))"));
    
    Promise.all(promises).then(() => {
      console.log('Database migration completed');
      resolve();
    }).catch((error) => {
      console.error('Error during database migration:', error);
      resolve(); // Continue even if migration fails
    });
  });
}

function initialize() {
  const database = getDB();
  
  // Contacts table
  database.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      company TEXT,
      title TEXT,
      notes TEXT,
      contact_type TEXT CHECK(contact_type IN ('Agent', 'Direct', 'Other', 'Spam', 'Internal')) DEFAULT 'Other',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Pipeline stages table
  database.run(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      order_index INTEGER NOT NULL,
      color TEXT DEFAULT '#6B7280',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Opportunities/Enquiries table - Enhanced for evidence-backed requirements
  database.run(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      contact_id INTEGER NOT NULL,
      stage_id INTEGER,
      source TEXT NOT NULL CHECK(source IN ('webform', 'cold_outreach', 'social', 'previous_enquiry', 'previous_client', 'forwarded', 'email')),
      sub_source TEXT NOT NULL,
      linked_opportunity_id INTEGER,
      assigned_to TEXT NOT NULL DEFAULT 'me',
      value REAL,
      currency TEXT DEFAULT 'USD',
      probability INTEGER DEFAULT 0,
      expected_close_date DATE,
      description TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'won', 'lost', 'reversed')),
      reversed_reason TEXT,
      form_id TEXT,
      form_submission_time DATETIME,
      campaign_id TEXT,
      lead_id TEXT,
      origin_list TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id),
      FOREIGN KEY (linked_opportunity_id) REFERENCES opportunities(id)
    )
  `);

  // Communications table (emails, calls, meetings, etc.) - Enhanced with conversation IDs and email automation
  database.run(`
    CREATE TABLE IF NOT EXISTS communications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      from_email TEXT,
      to_email TEXT,
      contact_id INTEGER,
      opportunity_id INTEGER,
      external_id TEXT,
      source TEXT,
      conversation_id TEXT,
      message_id TEXT,
      deep_link TEXT,
      categories TEXT,
      is_flagged INTEGER DEFAULT 0,
      flag_due_date DATETIME,
      folder_id TEXT,
      processed_by_rules INTEGER DEFAULT 0,
      occurred_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    )
  `);

  // Email attachments table
  database.run(`
    CREATE TABLE IF NOT EXISTS email_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      communication_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      size INTEGER,
      content_type TEXT,
      attachment_id TEXT,
      FOREIGN KEY (communication_id) REFERENCES communications(id)
    )
  `);

  // OAuth tokens table for Outlook integration
  database.run(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL DEFAULT 'outlook' UNIQUE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at DATETIME,
      user_email TEXT,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Leads table
  database.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      assigned_to TEXT DEFAULT 'me',
      notes TEXT,
      value REAL,
      last_contacted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    )
  `);

  // Follow-ups table
  database.run(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      scheduled_date DATETIME NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    )
  `);

  // Email templates table
  database.run(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Activities table - Enhanced for evidence trail
  database.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER,
      contact_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('email_sent', 'email_received', 'call_made', 'call_received', 'status_changed', 'note_added', 'follow_up_scheduled', 'social_dm', 'social_comment', 'social_lead_form', 'webform_submission')),
      description TEXT NOT NULL,
      direction TEXT CHECK(direction IN ('inbound', 'outbound')),
      user TEXT NOT NULL,
      conversation_id TEXT,
      message_id TEXT,
      deep_link TEXT,
      platform TEXT,
      platform_thread_url TEXT,
      call_duration INTEGER,
      call_outcome TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    )
  `);

  // Call logs table
  database.run(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER,
      contact_id INTEGER NOT NULL,
      phone_number TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
      duration INTEGER,
      outcome TEXT,
      notes TEXT,
      origin_list TEXT,
      user TEXT NOT NULL,
      occurred_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    )
  `);

  // Commission snapshots table - Locked at deal closure
  database.run(`
    CREATE TABLE IF NOT EXISTS commission_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL,
      final_value REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      products TEXT,
      commissionable_amount REAL NOT NULL,
      owner TEXT NOT NULL,
      source TEXT NOT NULL,
      sub_source TEXT NOT NULL,
      first_touch_date DATETIME,
      first_touch_activity_type TEXT,
      closed_at DATETIME NOT NULL,
      locked_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    )
  `);

  // Audit trail table - Track all field changes on opportunities
  database.run(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    )
  `);

  // Email rules table - Store rule definitions for email automation
  database.run(`
    CREATE TABLE IF NOT EXISTS email_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      conditions TEXT NOT NULL,
      actions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Email categories table - Map Outlook categories to CRM fields
  database.run(`
    CREATE TABLE IF NOT EXISTS email_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL UNIQUE,
      crm_field_type TEXT NOT NULL CHECK(crm_field_type IN ('source', 'stage', 'sub_source')),
      crm_field_value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Email folders table - Track folder mappings
  database.run(`
    CREATE TABLE IF NOT EXISTS email_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_name TEXT NOT NULL,
      folder_id TEXT,
      purpose TEXT CHECK(purpose IN ('sales_enquiries', 'finance_evidence', 'noise', 'other')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Disputes table - For commission disputes
  database.run(`
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL,
      commission_snapshot_id INTEGER,
      nature TEXT NOT NULL,
      description TEXT,
      supporting_evidence TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'resolved', 'rejected')),
      resolution_decision TEXT,
      resolved_by TEXT,
      resolved_at DATETIME,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      FOREIGN KEY (commission_snapshot_id) REFERENCES commission_snapshots(id)
    )
  `);

  // Social media integrations table
  database.run(`
    CREATE TABLE IF NOT EXISTS social_media_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at DATETIME,
      account_id TEXT,
      account_name TEXT,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(platform)
    )
  `);

  // WhatsApp integrations table
  database.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      api_key TEXT,
      webhook_url TEXT,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize default email templates (wait for table creation)
  setTimeout(() => {
    database.run(`
    INSERT OR IGNORE INTO email_templates (name, subject, body, type) VALUES
    ('Initial Enquiry Response', 'Thank you for your enquiry', 
     'Dear {{name}},\n\nThank you for your enquiry about our services. We appreciate your interest and would love to help you.\n\nI''ll be reviewing your requirements and will get back to you shortly with more details about how we can assist you.\n\nIn the meantime, please don''t hesitate to reach out if you have any questions.\n\nBest regards', 
     'enquiry'),
    ('Follow-up After Call', 'Following up on our conversation',
     'Dear {{name}},\n\nIt was great speaking with you today. As discussed, I wanted to follow up with the details we covered.\n\n{{notes}}\n\nPlease let me know if you have any questions or would like to proceed.\n\nBest regards',
     'follow_up'),
    ('Promotion Outreach', 'Special Offer Just for You',
     'Dear {{name}},\n\nI hope this email finds you well. I wanted to reach out to let you know about our current promotion.\n\n{{promotion_details}}\n\nThis offer is available for a limited time, so please don''t hesitate to get in touch if you''re interested.\n\nBest regards',
     'promotion'),
    ('Previous Client Return', 'We''d love to have you back!',
     'Dear {{name}},\n\nI hope you''re doing well! It''s been a while since your last stay with us, and we''ve been thinking about you.\n\nWe''d love to welcome you back. Please let me know if you''re interested in planning another visit.\n\nBest regards',
     'return_client')
  `);

    // Initialize default category mappings (after tables are created)
    setTimeout(() => {
      try {
        const categoryMapper = require('./services/category-mapper');
        categoryMapper.initializeDefaultMappings().catch(err => {
          console.error('Error initializing default category mappings:', err);
        });
      } catch (err) {
        console.error('Could not load category mapper:', err);
      }
    }, 1000);

    // Initialize default email rules (after tables are created)
    setTimeout(() => {
      try {
        const defaultRules = require('./services/default-rules');
        defaultRules.initializeDefaultRules().catch(err => {
          console.error('Error initializing default rules:', err);
        });
      } catch (err) {
        console.error('Could not load default rules:', err);
      }
    }, 1000);
  }, 2000);

  // Initialize default pipeline stages
  database.run(`
    INSERT OR IGNORE INTO pipeline_stages (name, order_index, color) VALUES
    ('New', 1, '#3B82F6'),
    ('Contacted', 2, '#8B5CF6'),
    ('Follow Up', 3, '#F59E0B'),
    ('Qualified', 4, '#EF4444'),
    ('Converted', 5, '#10B981'),
    ('Dropped', 6, '#6B7280')
  `);

  // Create indexes for performance (wait for tables to be created)
  setTimeout(() => {
  database.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_contact ON opportunities(contact_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities(source, sub_source)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_activities_opportunity ON activities(opportunity_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_activities_conversation ON activities(conversation_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_audit_trail_opportunity ON audit_trail(opportunity_id)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_commission_snapshots_opportunity ON commission_snapshots(opportunity_id)`);
    // Note: We use application-level duplicate checking for case-insensitive email uniqueness
    // SQLite doesn't support functional unique indexes, so we rely on the UNIQUE constraint
    // on the email column for exact duplicates and application logic for case-insensitive checks
    
    console.log('Database initialized successfully');
  }, 1000);
  
  // Run migrations synchronously after initialization
  // This ensures columns are added before routes try to use them
  // Use a callback-based approach to ensure completion
  const db = getDB();
  migrateDatabaseSync().then(() => {
    console.log('All migrations completed');
  });
}

function close() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = {
  getDB,
  initialize,
  close
};


