$nodeProcess = Start-Process -FilePath "node" -ArgumentList "scripts/server.cjs" -PassThru
Start-Sleep -Seconds 2

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$tempBase = "C:\Users\surya\AppData\Local\Temp\edge_shots"
$outDir = "C:\Users\surya\.gemini\antigravity\scratch\3D-view-project\screenshots"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$shots = @(
    @{ Name = "desktop_1920x1080.png"; W = 1920; H = 1080 },
    @{ Name = "desktop_1440x900.png";  W = 1440; H = 900 },
    @{ Name = "desktop_1366x768.png";  W = 1366; H = 768 },
    @{ Name = "mobile_390x844.png";    W = 390;  H = 844 },
    @{ Name = "mobile_412x915.png";    W = 412;  H = 915 },
    @{ Name = "mobile_landscape_844x390.png"; W = 844; H = 390 }
)

foreach ($s in $shots) {
    $tDir = "$tempBase\$($s.W)x$($s.H)"
    if (Test-Path $tDir) { Remove-Item -Recurse -Force $tDir }
    New-Item -ItemType Directory -Path $tDir | Out-Null
    $dest = "$outDir\$($s.Name)"
    Write-Host "Capturing $($s.Name) ($($s.W)x$($s.H))..."
    Start-Process -FilePath $edge -ArgumentList "--headless=new", "--user-data-dir=$tDir", "--screenshot=$dest", "--window-size=$($s.W),$($s.H)", "--hide-scrollbars", "http://localhost:5199/" -Wait
    if (Test-Path $dest) {
        $len = (Get-Item $dest).Length
        Write-Host "Captured $($s.Name): $len bytes"
    } else {
        Write-Warning "Failed to capture $($s.Name)"
    }
}

Stop-Process -Id $nodeProcess.Id -Force
Write-Host "All screenshots captured successfully!"
Get-ChildItem $outDir
