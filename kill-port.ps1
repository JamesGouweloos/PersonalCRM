# PowerShell script to kill a process using a specific port

param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "`n=== Finding process using port $Port ===" -ForegroundColor Cyan
Write-Host ""

# Find process using the port
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess

if ($process) {
    $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "Found process:" -ForegroundColor Yellow
        Write-Host "  PID: $($processInfo.Id)" -ForegroundColor White
        Write-Host "  Name: $($processInfo.Name)" -ForegroundColor White
        Write-Host "  Path: $($processInfo.Path)" -ForegroundColor Gray
        Write-Host ""
        
        $confirm = Read-Host "Kill this process? (Y/N)"
        if ($confirm -eq 'Y' -or $confirm -eq 'y') {
            try {
                Stop-Process -Id $process -Force
                Write-Host "Process killed successfully!" -ForegroundColor Green
            } catch {
                Write-Host "Error killing process: $_" -ForegroundColor Red
                Write-Host "You may need to run this script as Administrator" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Cancelled." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Process not found (may have already terminated)" -ForegroundColor Yellow
    }
} else {
    Write-Host "No process found using port $Port" -ForegroundColor Green
    Write-Host "The port is available!" -ForegroundColor Green
}

Write-Host ""

