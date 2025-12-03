module.exports = [
"[project]/client/lib/api.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/client/lib/api.ts [app-ssr] (ecmascript)");
    });
});
}),
"[project]/client/lib/email-status.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/client_lib_email-status_ts_de52c374._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/client/lib/email-status.ts [app-ssr] (ecmascript)");
    });
});
}),
];