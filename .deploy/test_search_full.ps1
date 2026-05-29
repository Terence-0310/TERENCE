# Test: hint banner + review text + search ranking
$base = 'http://localhost:3000'

function Test-Query($q, $label) {
    Write-Output ""
    Write-Output "=== $label : '$q' ==="
    $encoded = [uri]::EscapeDataString($q)
    try {
        $r = Invoke-RestMethod -Uri "$base/api/v1/search?q=$encoded&limit=5" -UseBasicParsing
        $items = $r.data.items
        $hint = $r.data.hint
        Write-Output "  hint: isLikelyName=$($hint.isLikelyName) actorMatchCount=$($hint.actorMatchCount)  total=$($r.data.pagination.total)"
        for ($i=0; $i -lt [Math]::Min($items.Count, 3); $i++) {
            $m = $items[$i]
            $score = if ($m.score) { [math]::Round($m.score, 1) } else { 0 }
            $ot = if ($m.originalTitle -and $m.originalTitle -ne $m.title) { " / $($m.originalTitle)" } else { '' }
            Write-Output ("    {0}. [{1}]  {2}{3}" -f ($i+1), $score, $m.title, $ot)
        }
    } catch { Write-Output "  ERROR: $_" }
}

Test-Query 'Jack Reynor' 'looks like name, not in DB (banner should show)'
Test-Query 'kinh dị' 'genre word, not a name (no banner)'
Test-Query 'spider' 'one word, not a name (no banner)'
Test-Query 'one piece' 'two lowercase tokens (not capitalised = not name)'
Test-Query 'Tom Holland' 'looks like name, may or may not be in DB'

Write-Output ""
Write-Output "=== ES mapping fields (verify reviewText + subtitleText exist) ==="
$mapping = Invoke-RestMethod -Uri 'http://localhost:9200/terence_movies/_mapping' -UseBasicParsing
$props = $mapping.terence_movies.mappings.properties.PSObject.Properties.Name | Sort-Object
$expected = @('reviewText','reviewTextAscii','subtitleText','subtitleTextAscii')
foreach ($f in $expected) {
    $hit = if ($props -contains $f) { '✓' } else { '✗' }
    Write-Output "  $hit  $f"
}
