module.exports = [
"[project]/client/lib/email-status.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
    if ("TURBOPACK compile-time truthy", 1) return {};
    //TURBOPACK unreachable
    ;
    const stored = undefined;
}
function setEmailReadStatus(emailId, read) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
    const status = undefined;
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
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
    const status = undefined;
}
function initializeEmailStatus(emailIds) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
    const status = undefined;
    let updated;
}
function getUnreadCount(emailIds) {
    const status = getEmailReadStatus();
    return emailIds.filter((id)=>!status[id.toString()]?.read).length;
}
function cleanupEmailStatus(existingEmailIds) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
    const status = undefined;
    const existingIds = undefined;
    let updated;
}
function getAutosyncInterval() {
    if ("TURBOPACK compile-time truthy", 1) return 5 * 60 * 1000 // Default 5 minutes
    ;
    //TURBOPACK unreachable
    ;
    const stored = undefined;
}
function setAutosyncInterval(intervalMs) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
function isAutosyncEnabled() {
    if ("TURBOPACK compile-time truthy", 1) return true;
    //TURBOPACK unreachable
    ;
    const stored = undefined;
}
function setAutosyncEnabled(enabled) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
}),
];

//# sourceMappingURL=client_lib_email-status_ts_de52c374._.js.map