# PowerShell script to get your local IP address for remote access configuration

Write-Host "`n=== CRM Remote Access Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Get network interfaces
$interfaces = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" 
} | Select-Object IPAddress, InterfaceAlias

if ($interfaces) {
    Write-Host "Available IP addresses for remote access:" -ForegroundColor Green
    Write-Host ""
    
    foreach ($iface in $interfaces) {
        Write-Host "  IP: $($iface.IPAddress)" -ForegroundColor Yellow
        Write-Host "    Interface: $($iface.InterfaceAlias)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "Configuration steps:" -ForegroundColor Cyan
    Write-Host "1. Create client/.env.local file" -ForegroundColor White
    Write-Host "2. Add: NEXT_PUBLIC_API_URL=http://<IP>:3001/api" -ForegroundColor White
    Write-Host "3. Replace <IP> with one of the IPs above" -ForegroundColor White
    Write-Host "4. Ensure Windows Firewall allows port 3001" -ForegroundColor White
    Write-Host ""
    
    # Check firewall rule
    $firewallRule = Get-NetFirewallRule -DisplayName "CRM Server" -ErrorAction SilentlyContinue
    if ($firewallRule) {
        Write-Host "Firewall rule 'CRM Server' found" -ForegroundColor Green
    } else {
        Write-Host "Firewall rule not found. Run this command as Administrator:" -ForegroundColor Yellow
        Write-Host "  New-NetFirewallRule -DisplayName 'CRM Server' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow" -ForegroundColor Gray
    }
} else {
    Write-Host "No network interfaces found." -ForegroundColor Red
}

Write-Host ""

