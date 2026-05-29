$queries = @('Jack Reynor','one piece','spider','nguoi nhen','harry poter','tom holland','samurai jack','jack')
foreach ($q in $queries) {
    $encoded = [uri]::EscapeDataString($q)
    Write-Output ""
    Write-Output "=== Query: '$q' ==="
    Write-Output "--- /api/v1/search ---"
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/search?q=$encoded&limit=5" -UseBasicParsing
        $items = $r.data.items
        if ($items.Count -eq 0) { Write-Output "  (no results)" }
        else {
            for ($i=0; $i -lt $items.Count; $i++) {
                $m = $items[$i]
                $ot = ''
                if ($m.originalTitle -and $m.originalTitle -ne $m.title) { $ot = " / $($m.originalTitle)" }
                $score = if ($m.score) { [math]::Round($m.score, 1) } else { 0 }
                Write-Output ("  {0,2}. [{1,8}]  {2}{3}  ({4})" -f ($i+1), $score, $m.title, $ot, $m.year)
            }
        }
    } catch { Write-Output "  ERROR: $_" }
    Write-Output "--- /api/v1/search/suggest ---"
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/search/suggest?q=$encoded&limit=5" -UseBasicParsing
        $items = $r.data
        if ($items.Count -eq 0) { Write-Output "  (no suggestions)" }
        else {
            for ($i=0; $i -lt $items.Count; $i++) {
                $m = $items[$i]
                $ot = ''
                if ($m.originalTitle -and $m.originalTitle -ne $m.title) { $ot = " / $($m.originalTitle)" }
                Write-Output ("  {0,2}. {1}{2}  ({3})" -f ($i+1), $m.title, $ot, $m.year)
            }
        }
    } catch { Write-Output "  ERROR: $_" }
}
