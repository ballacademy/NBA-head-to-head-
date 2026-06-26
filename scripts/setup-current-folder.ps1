$ErrorActionPreference = "Stop"

$FolderName = "current-nba-head-to-head-folder"
$TargetPath = Join-Path $env:USERPROFILE "Downloads" $FolderName
$RepoUrl = "https://github.com/ballacademy/NBA-head-to-head-.git"
$Branch = "cursor/nba-player-stats-4ebb"
$NpmCmd = "C:\Program Files\nodejs\npm.cmd"

Write-Host "Draft Day GM setup"
Write-Host "Target folder: $TargetPath"
Write-Host ""

if (Test-Path (Join-Path $TargetPath ".git")) {
    Write-Host "Updating existing folder..."
    Set-Location $TargetPath
    git pull origin $Branch
}
elseif (Test-Path $TargetPath) {
    Write-Host "Folder exists but is not a git repo."
    Write-Host "Rename or delete this folder, then run this script again:"
    Write-Host $TargetPath
    exit 1
}
else {
    Write-Host "Cloning latest version..."
    $ParentPath = Split-Path $TargetPath -Parent
    if (-not (Test-Path $ParentPath)) {
        New-Item -ItemType Directory -Path $ParentPath | Out-Null
    }

    Set-Location $ParentPath
    git clone -b $Branch $RepoUrl $FolderName
    Set-Location $TargetPath
}

Write-Host ""
Write-Host "Installing packages..."

if (Test-Path $NpmCmd) {
    & $NpmCmd install
}
else {
    npm install
}

Write-Host ""
Write-Host "Done."
Write-Host ""
Write-Host "Next commands:"
Write-Host "  Set-Location `"$TargetPath`""
if (Test-Path $NpmCmd) {
    Write-Host "  & `"$NpmCmd`" run dev"
}
else {
    Write-Host "  npm run dev"
}
Write-Host ""
Write-Host "Then open http://localhost:5173 in your browser."
