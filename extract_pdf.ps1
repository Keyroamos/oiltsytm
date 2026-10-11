Add-Type -AssemblyName System.Text.Encoding
$bytes = [System.IO.File]::ReadAllBytes('TARITA ERP.pdf')
$enc = [System.Text.Encoding]::GetEncoding('ISO-8859-1')
$text = $enc.GetString($bytes)
$btMatches = [regex]::Matches($text, 'BT.{0,3000}?ET', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$out = [System.Collections.Generic.List[string]]::new()
foreach ($m in $btMatches) {
    $words = [regex]::Matches($m.Value, '\(([^\)]{2,80})\)')
    foreach ($w in $words) {
        $val = $w.Groups[1].Value.Trim()
        if ($val.Length -gt 2 -and $val -match '[A-Za-z]') {
            $out.Add($val)
        }
    }
}
$out -join "`n" | Out-File tarita_content.txt -Encoding utf8
Write-Host "Done, tokens: $($out.Count)"
