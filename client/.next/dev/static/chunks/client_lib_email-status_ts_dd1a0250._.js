(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/client/lib/email-status.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Local storage management for email read/unread status
// This is app-only state and doesn't sync to the server
__turbopack_context__.s([
    "cleanupEmailStatus",
    ()=>cleanupEmailStatus,
    "getAutosyncInterval",
    ()=>getAutosyncInterval,
    "getEmailReadStatus",
    ()=>getEmailReadStatus,
    "getUnreadCount",
    ()=>getUnreadCount,
    "initializeEmailStatus",
    ()=>initializeEmailStatus,
    "isAutosyncEnabled",
    ()=>isAutosyncEnabled,
    "isEmailRead",
    ()=>isEmailRead,
    "markAllAsRead",
    ()=>markAllAsRead,
    "markEmailAsRead",
    ()=>markEmailAsRead,
    "markEmailAsUnread",
    ()=>markEmailAsUnread,
    "setAutosyncEnabled",
    ()=>setAutosyncEnabled,
    "setAutosyncInterval",
    ()=>setAutosyncInterval,
    "setEmailReadStatus",
    ()=>setEmailReadStatus
]);
const STORAGE_KEY = "crm_email_read_status";
const AUTOSYNC_INTERVAL_KEY = "crm_autosync_interval";
const AUTOSYNC_ENABLED_KEY = "crm_autosync_enabled";
function getEmailReadStatus() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
}
function setEmailReadStatus(emailId, read) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const status = getEmailReadStatus();
    status[emailId.toString()] = {
        read,
        readAt: read ? new Date().toISOString() : undefined
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}
function isEmailRead(emailId) {
    const status = getEmailReadStatus();
    return status[emailId.toString()]?.read ?? false;
}
function markEmailAsRead(emailId) {
    setEmailReadStatus(emailId, true);
}
function markEmailAsUnread(emailId) {
    setEmailReadStatus(emailId, false);
}
function markAllAsRead(emailIds) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const status = getEmailReadStatus();
    emailIds.forEach((id)=>{
        status[id.toString()] = {
            read: true,
            readAt: new Date().toISOString()
        };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}
function initializeEmailStatus(emailIds) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const status = getEmailReadStatus();
    let updated = false;
    emailIds.forEach((id)=>{
        const idStr = id.toString();
        if (!(idStr in status)) {
            // New email - mark as unread
            status[idStr] = {
                read: false
            };
            updated = true;
        }
    });
    if (updated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
    }
}
function getUnreadCount(emailIds) {
    const status = getEmailReadStatus();
    return emailIds.filter((id)=>!status[id.toString()]?.read).length;
}
function cleanupEmailStatus(existingEmailIds) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const status = getEmailReadStatus();
    const existingIds = new Set(existingEmailIds.map((id)=>id.toString()));
    let updated = false;
    // Remove entries for emails that no longer exist
    Object.keys(status).forEach((id)=>{
        if (!existingIds.has(id)) {
            delete status[id];
            updated = true;
        }
    });
    if (updated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
    }
}
function getAutosyncInterval() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
     // Default 5 minutes
    const stored = localStorage.getItem(AUTOSYNC_INTERVAL_KEY);
    return stored ? parseInt(stored, 10) : 5 * 60 * 1000;
}
function setAutosyncInterval(intervalMs) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.setItem(AUTOSYNC_INTERVAL_KEY, intervalMs.toString());
}
function isAutosyncEnabled() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const stored = localStorage.getItem(AUTOSYNC_ENABLED_KEY);
    return stored ? stored === "true" : true;
}
function setAutosyncEnabled(enabled) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.setItem(AUTOSYNC_ENABLED_KEY, enabled.toString());
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=client_lib_email-status_ts_dd1a0250._.js.map