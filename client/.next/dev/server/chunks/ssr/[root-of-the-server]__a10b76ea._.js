module.exports = [
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/tty [external] (tty, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tty", () => require("tty"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[project]/client/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "activitiesAPI",
    ()=>activitiesAPI,
    "communicationsAPI",
    ()=>communicationsAPI,
    "contactsAPI",
    ()=>contactsAPI,
    "default",
    ()=>__TURBOPACK__default__export__,
    "emailRulesAPI",
    ()=>emailRulesAPI,
    "emailsAPI",
    ()=>emailsAPI,
    "followupsAPI",
    ()=>followupsAPI,
    "leadsAPI",
    ()=>leadsAPI,
    "opportunitiesAPI",
    ()=>opportunitiesAPI,
    "templatesAPI",
    ()=>templatesAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/.pnpm/axios@1.13.2/node_modules/axios/lib/axios.js [app-ssr] (ecmascript)");
;
const API_BASE_URL = ("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api';
const api = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});
const contactsAPI = {
    getAll: (search)=>api.get('/contacts', {
            params: {
                search
            }
        }),
    getOne: (id)=>api.get(`/contacts/${id}`),
    create: (data)=>api.post('/contacts', data),
    update: (id, data)=>api.put(`/contacts/${id}`, data),
    delete: (id)=>api.delete(`/contacts/${id}`),
    deleteAll: ()=>api.delete('/contacts/all')
};
const leadsAPI = {
    getAll: (params)=>api.get('/leads', {
            params
        }),
    getOne: (id)=>api.get(`/leads/${id}`),
    create: (data)=>api.post('/leads', data),
    update: (id, data)=>api.put(`/leads/${id}`, data),
    delete: (id)=>api.delete(`/leads/${id}`)
};
const followupsAPI = {
    getAll: (params)=>api.get('/followups', {
            params
        }),
    create: (data)=>api.post('/followups', data),
    update: (id, data)=>api.put(`/followups/${id}`, data),
    delete: (id)=>api.delete(`/followups/${id}`)
};
const templatesAPI = {
    getAll: (params)=>api.get('/templates', {
            params
        }),
    getOne: (id)=>api.get(`/templates/${id}`),
    create: (data)=>api.post('/templates', data),
    update: (id, data)=>api.put(`/templates/${id}`, data),
    delete: (id)=>api.delete(`/templates/${id}`)
};
const activitiesAPI = {
    getAll: (params)=>api.get('/activities', {
            params
        }),
    create: (data)=>api.post('/activities', data)
};
const emailsAPI = {
    getAuthUrl: ()=>api.get('/emails/auth-url'),
    sync: ()=>api.post('/emails/sync'),
    getAll: (params)=>api.get('/emails', {
            params
        }),
    getStatus: ()=>api.get('/emails/status'),
    disconnect: ()=>api.post('/emails/disconnect'),
    reprocess: ()=>api.post('/emails/reprocess')
};
const opportunitiesAPI = {
    getAll: (params)=>api.get('/pipeline/opportunities', {
            params
        }),
    getOne: (id)=>api.get(`/pipeline/opportunities/${id}`),
    create: (data)=>api.post('/pipeline/opportunities', data),
    update: (id, data)=>api.put(`/pipeline/opportunities/${id}`, data),
    delete: (id)=>api.delete(`/pipeline/opportunities/${id}`)
};
const communicationsAPI = {
    getAll: (params)=>api.get('/communications', {
            params
        }),
    getOne: (id)=>api.get(`/communications/${id}`),
    linkToOpportunity: (id, opportunityId)=>api.put(`/communications/${id}/link-opportunity`, {
            opportunity_id: opportunityId
        }),
    linkToContact: (id, contactId)=>api.put(`/communications/${id}/link-contact`, {
            contact_id: contactId
        })
};
const emailRulesAPI = {
    getAll: ()=>api.get('/email-rules'),
    getOne: (id)=>api.get(`/email-rules/${id}`),
    create: (data)=>api.post('/email-rules', data),
    update: (id, data)=>api.put(`/email-rules/${id}`, data),
    delete: (id)=>api.delete(`/email-rules/${id}`),
    test: (id, sampleEmail)=>api.post(`/email-rules/${id}/test`, {
            sampleEmail
        }),
    processEmail: (emailId)=>api.post(`/email-rules/process-email/${emailId}`),
    getCategories: ()=>api.get('/email-rules/categories'),
    getCategory: (id)=>api.get(`/email-rules/categories/${id}`),
    createCategory: (data)=>api.post('/email-rules/categories', data),
    updateCategory: (id, data)=>api.put(`/email-rules/categories/${id}`, data),
    deleteCategory: (id)=>api.delete(`/email-rules/categories/${id}`)
};
const __TURBOPACK__default__export__ = api;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__a10b76ea._.js.map