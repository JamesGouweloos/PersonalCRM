# Script to identify pages that need Suspense boundaries
# Pages that use Sidebar component need Suspense wrapper

$pages = @(
    "client/app/page.tsx",
    "client/app/leads/page.tsx",
    "client/app/contacts/page.tsx",
    "client/app/opportunities/page.tsx",
    "client/app/follow-ups/page.tsx",
    "client/app/templates/page.tsx",
    "client/app/settings/page.tsx",
    "client/app/analytics/page.tsx",
    "client/app/call-logs/page.tsx",
    "client/app/agency-interactions/page.tsx"
)

Write-Host "Pages to check: $($pages.Count)"

