import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Contacts API
export const contactsAPI = {
  getAll: (search?: string) => api.get('/contacts', { params: { search } }),
  getOne: (id: string) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  deleteAll: () => api.delete('/contacts/all'),
};

// Leads API
export const leadsAPI = {
  getAll: (params?: any) => api.get('/leads', { params }),
  getOne: (id: string) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
};

// Follow-ups API
export const followupsAPI = {
  getAll: (params?: any) => api.get('/followups', { params }),
  create: (data: any) => api.post('/followups', data),
  update: (id: string, data: any) => api.put(`/followups/${id}`, data),
  delete: (id: string) => api.delete(`/followups/${id}`),
};

// Templates API
export const templatesAPI = {
  getAll: (params?: any) => api.get('/templates', { params }),
  getOne: (id: string) => api.get(`/templates/${id}`),
  create: (data: any) => api.post('/templates', data),
  update: (id: string, data: any) => api.put(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

// Activities API
export const activitiesAPI = {
  getAll: (params?: any) => api.get('/activities', { params }),
  create: (data: any) => api.post('/activities', data),
};

// Emails API
export const emailsAPI = {
  getAuthUrl: () => api.get('/emails/auth-url'),
  sync: () => api.post('/emails/sync'),
  getAll: (params?: any) => api.get('/emails', { params }),
  getStatus: () => api.get('/emails/status'),
  disconnect: () => api.post('/emails/disconnect'),
  reprocess: () => api.post('/emails/reprocess'),
};

// Opportunities API
export const opportunitiesAPI = {
  getAll: (params?: any) => api.get('/pipeline/opportunities', { params }),
  getOne: (id: string) => api.get(`/pipeline/opportunities/${id}`),
  create: (data: any) => api.post('/pipeline/opportunities', data),
  update: (id: string, data: any) => api.put(`/pipeline/opportunities/${id}`, data),
  delete: (id: string) => api.delete(`/pipeline/opportunities/${id}`),
};

// Communications API
export const communicationsAPI = {
  getAll: (params?: any) => api.get('/communications', { params }),
  getOne: (id: string) => api.get(`/communications/${id}`),
  linkToOpportunity: (id: string, opportunityId: string) => api.put(`/communications/${id}/link-opportunity`, { opportunity_id: opportunityId }),
  linkToContact: (id: string, contactId: string) => api.put(`/communications/${id}/link-contact`, { contact_id: contactId }),
};

// Email Rules API
export const emailRulesAPI = {
  getAll: () => api.get('/email-rules'),
  getOne: (id: string) => api.get(`/email-rules/${id}`),
  create: (data: any) => api.post('/email-rules', data),
  update: (id: string, data: any) => api.put(`/email-rules/${id}`, data),
  delete: (id: string) => api.delete(`/email-rules/${id}`),
  test: (id: string, sampleEmail: any) => api.post(`/email-rules/${id}/test`, { sampleEmail }),
  processEmail: (emailId: string) => api.post(`/email-rules/process-email/${emailId}`),
  getCategories: () => api.get('/email-rules/categories'),
  getCategory: (id: string) => api.get(`/email-rules/categories/${id}`),
  createCategory: (data: any) => api.post('/email-rules/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/email-rules/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/email-rules/categories/${id}`),
};

export default api;


