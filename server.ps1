# Tiny local web server for the CSE heatmap. Serves this folder at http://localhost:8765/
$root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$port = 8765
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Heatmap running at http://localhost:$port/  (close this window to stop)"
Start-Process "http://localhost:$port/"
$types = @{ ".html" = "text/html; charset=utf-8"; ".js" = "application/javascript"; ".csv" = "text/csv";
            ".xlsx" = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
    if ($rel -eq "") { $rel = "index.html" }
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($full.StartsWith($root) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
      # Open shared so the file can be read while Excel has it open
      $fs = [IO.File]::Open($full, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
      $ms = New-Object IO.MemoryStream
      $fs.CopyTo($ms); $fs.Close()
      $bytes = $ms.ToArray()
      $ext = [IO.Path]::GetExtension($full).ToLower()
      if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
      $ctx.Response.Headers.Add("Cache-Control", "no-store")
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $ctx.Response.StatusCode = 404 }
  } catch { try { $ctx.Response.StatusCode = 500 } catch {} }
  finally { try { $ctx.Response.Close() } catch {} }
}
