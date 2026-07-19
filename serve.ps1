# =====================================================================
#  Zero-dependency local static server (built-in Windows PowerShell).
#  This app uses ES6 Modules + fetch, so it must be served over http.
#  Run: right-click -> Run with PowerShell, or double-click serve.bat.
#       Then open http://localhost:8000 in your browser.
# =====================================================================
param([int]$Port = 8000)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
    $listener.Start()
} catch {
    Write-Host "Cannot start on port $Port. Try: powershell -File serve.ps1 -Port 8080" -ForegroundColor Red
    exit 1
}

Write-Host "Serving http://localhost:$Port/  (folder: $root)" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

$mime = @{
    ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8";
    ".js"="text/javascript; charset=utf-8"; ".json"="application/json; charset=utf-8";
    ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml";
    ".ico"="image/x-icon"; ".woff2"="font/woff2"; ".woff"="font/woff"
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart([char]47)
    if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
    $full = Join-Path $root $rel
    if (Test-Path $full -PathType Leaf) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $ext = [System.IO.Path]::GetExtension($full).ToLower()
            if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
            $ctx.Response.Headers.Add("Cache-Control","no-store")
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {
            $ctx.Response.StatusCode = 500
        }
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
}
