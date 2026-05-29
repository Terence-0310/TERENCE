#requires -version 5
# ============================================
# Docker Search Smoke Test (Windows / PowerShell)
# ============================================
# Mirror of scripts/docker-search-test.sh for Windows hosts. Probes
# /api/v1/search with a fixed query set and prints top-3 hits.
#
# Usage:
#   pwsh -File scripts/docker-search-test.ps1
#   $env:BASE='http://localhost:3000'; pwsh -File scripts/docker-search-test.ps1

$ErrorActionPreference = 'Stop'

$Base  = if ($env:BASE)  { $env:BASE }  else { 'http://localhost:3000' }
$Es    = if ($env:ES)    { $env:ES }    else { 'http://localhost:9200' }
$Index = if ($env:ELASTICSEARCH_INDEX_MOVIES) { $env:ELASTICSEARCH_INDEX_MOVIES } else { 'terence_movies' }

Write-Host '════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '  TERENCE — Docker Search Smoke Test'        -ForegroundColor Cyan
Write-Host '════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host "  App:   $Base"
Write-Host "  ES:    $Es"
Write-Host "  Index: $Index"
Write-Host ''

function Wait-Healthy([string]$url, [string]$label, [int]$maxRetry = 60) {
    Write-Host "Waiting for $label..."
    for ($i = 0; $i -lt $maxRetry; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { Write-Host "  OK $label" -ForegroundColor Green; return }
        } catch { }
        Start-Sleep -Seconds 2
    }
    throw "$label not healthy after $($maxRetry * 2)s"
}

Wait-Healthy "$Es/_cluster/health?wait_for_status=yellow&timeout=2s" 'Elasticsearch'
Wait-Healthy "$Base/api/health" 'App'

try {
    $count = (Invoke-RestMethod -Uri "$Es/$Index/_count" -UseBasicParsing).count
} catch { $count = 0 }
Write-Host "Index doc count: $count"
if ($count -eq 0) {
    Write-Host '  WARNING: index is empty. Run: docker compose exec app npm run search:reindex' -ForegroundColor Yellow
}
Write-Host ''
Write-Host '════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '  Probing /api/v1/search ...'                  -ForegroundColor Cyan
Write-Host '════════════════════════════════════════════' -ForegroundColor Cyan

$queries = @(
    'tu chien tren khong',
    'Tử Chiến Trên Không',
    'spider man',
    'avengers',
    'hanh dong',
    'hành động',
    'han quoc',
    'luật sư'
)

$fail = 0
foreach ($q in $queries) {
    $url = "$Base/api/v1/search?q=$([uri]::EscapeDataString($q))&limit=3"
    try {
        $body = Invoke-RestMethod -Uri $url -UseBasicParsing -TimeoutSec 10
    } catch {
        Write-Host "FAIL  $q  -> $($_.Exception.Message)" -ForegroundColor Red
        $fail++
        continue
    }

    # Support both legacy and new response shapes.
    $isNew = $body.data -and -not ($body.data -is [System.Array])
    if ($isNew) {
        $items = @($body.data.items)
        $total = $body.data.pagination.total
    } else {
        $items = @($body.data)
        $total = $body.pagination.total
    }
    $src = $body.meta.source

    Write-Host ""
    Write-Host "=== Q: `"$q`"  src=$src  total=$total ===" -ForegroundColor Yellow
    $i = 0
    foreach ($item in $items | Select-Object -First 3) {
        $i++
        $score = [math]::Round([double]$item.score, 1)
        Write-Host ("  {0}. {1,8}  {2} [{3}]" -f $i, $score, $item.title, $item.year)
    }
}

Write-Host ''
if ($fail -gt 0) {
    Write-Host "FAIL: $fail query(ies) errored." -ForegroundColor Red
    exit 1
}
Write-Host 'OK — all queries returned 200.' -ForegroundColor Green
