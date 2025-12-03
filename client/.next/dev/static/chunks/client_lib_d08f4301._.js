(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/client/lib/api.ts [app-client] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/client/lib/api.ts [app-client] (ecmascript)");
    });
});
}),
"[project]/client/lib/email-status.ts [app-client] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "static/chunks/client_lib_email-status_ts_dd1a0250._.js",
  "static/chunks/client_lib_email-status_ts_8fb74449._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/client/lib/email-status.ts [app-client] (ecmascript)");
    });
});
}),
]);