const { getDB } = require('../database');

/**
 * Category Mapper Service
 * Maps Outlook categories to CRM fields (source, stage, sub_source)
 */

/**
 * Get all category mappings
 */
function getCategoryMappings() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all('SELECT * FROM email_categories ORDER BY category_name', [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

/**
 * Get category mapping by category name
 */
function getCategoryMapping(categoryName) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.get(
      'SELECT * FROM email_categories WHERE category_name = ?',
      [categoryName],
      (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      }
    );
  });
}

/**
 * Create or update category mapping
 */
function saveCategoryMapping(mapping) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run(
      `INSERT INTO email_categories (category_name, crm_field_type, crm_field_value)
       VALUES (?, ?, ?)
       ON CONFLICT(category_name) DO UPDATE SET
         crm_field_type = excluded.crm_field_type,
         crm_field_value = excluded.crm_field_value`,
      [mapping.category_name, mapping.crm_field_type, mapping.crm_field_value],
      function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ id: this.lastID, ...mapping });
      }
    );
  });
}

/**
 * Delete category mapping
 */
function deleteCategoryMapping(id) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run('DELETE FROM email_categories WHERE id = ?', [id], function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ success: true, changes: this.changes });
    });
  });
}

/**
 * Parse categories from email (can be array or JSON string)
 */
function parseEmailCategories(email) {
  if (!email.categories) {
    return [];
  }

  if (Array.isArray(email.categories)) {
    return email.categories;
  }

  if (typeof email.categories === 'string') {
    try {
      return JSON.parse(email.categories);
    } catch (e) {
      // If not JSON, treat as comma-separated string
      return email.categories.split(',').map(c => c.trim()).filter(c => c);
    }
  }

  return [];
}

/**
 * Map email categories to CRM fields
 * Returns object with source, sub_source, stage, and other mapped fields
 */
async function mapCategoriesToCRMFields(email) {
  const categories = parseEmailCategories(email);
  const mappings = await getCategoryMappings();
  
  const result = {
    source: null,
    sub_source: null,
    stage: null,
    categories: categories,
    mappedFields: {}
  };

  for (const category of categories) {
    const mapping = mappings.find(m => m.category_name === category);
    
    if (mapping) {
      switch (mapping.crm_field_type) {
        case 'source':
          result.source = mapping.crm_field_value;
          break;
        case 'sub_source':
          result.sub_source = mapping.crm_field_value;
          break;
        case 'stage':
          result.stage = mapping.crm_field_value;
          break;
        default:
          result.mappedFields[mapping.crm_field_type] = mapping.crm_field_value;
      }
    }
  }

  return result;
}

/**
 * Initialize default category mappings
 */
function initializeDefaultMappings() {
  const defaultMappings = [
    // Source categories
    { category_name: 'Source – Webform', crm_field_type: 'source', crm_field_value: 'webform' },
    { category_name: 'Source – Social', crm_field_type: 'source', crm_field_value: 'social' },
    { category_name: 'Source – Cold Call', crm_field_type: 'source', crm_field_value: 'cold_outreach' },
    { category_name: 'Source – Previous Enquiry', crm_field_type: 'source', crm_field_value: 'previous_enquiry' },
    { category_name: 'Source – Previous Client', crm_field_type: 'source', crm_field_value: 'previous_client' },
    { category_name: 'Source – Forwarded', crm_field_type: 'source', crm_field_value: 'forwarded' },
    
    // Stage categories
    { category_name: 'Stage – Follow-up', crm_field_type: 'stage', crm_field_value: 'follow_up' },
    { category_name: 'Stage – Proposal/Quote', crm_field_type: 'stage', crm_field_value: 'proposal' },
    { category_name: 'Stage – Booking/Confirmation', crm_field_type: 'stage', crm_field_value: 'booking' },
    
    // Sub-source categories (platform-specific)
    { category_name: 'Sub-source – Instagram', crm_field_type: 'sub_source', crm_field_value: 'Instagram DM' },
    { category_name: 'Sub-source – Facebook', crm_field_type: 'sub_source', crm_field_value: 'Facebook Message' },
    { category_name: 'Sub-source – LinkedIn', crm_field_type: 'sub_source', crm_field_value: 'LinkedIn InMail' },
    
    // Finance categories
    { category_name: 'Finance – Payment', crm_field_type: 'sub_source', crm_field_value: 'Payment Received' },
  ];

  return Promise.all(
    defaultMappings.map(mapping => 
      saveCategoryMapping(mapping).catch(err => {
        console.error(`Error initializing category mapping "${mapping.category_name}":`, err);
        return null;
      })
    )
  );
}

module.exports = {
  getCategoryMappings,
  getCategoryMapping,
  saveCategoryMapping,
  deleteCategoryMapping,
  parseEmailCategories,
  mapCategoriesToCRMFields,
  initializeDefaultMappings,
};


