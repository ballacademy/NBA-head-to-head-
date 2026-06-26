# Windows setup (easiest path)

This puts the latest app in one folder:

`C:\Users\andre\Downloads\current-nba-head-to-head-folder`

## One-time setup

1. Open **PowerShell**
2. Run:

```powershell
cd $env:USERPROFILE\Downloads
git clone -b cursor/nba-player-stats-4ebb https://github.com/ballacademy/NBA-head-to-head-.git current-nba-head-to-head-folder
cd current-nba-head-to-head-folder
& "C:\Program Files\nodejs\npm.cmd" install
```

Or run the setup script from any cloned copy of the repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-current-folder.ps1
```

## Start the app

```powershell
cd $env:USERPROFILE\Downloads\current-nba-head-to-head-folder
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Open **http://localhost:5173**

## Update to the newest version

```powershell
cd $env:USERPROFILE\Downloads\current-nba-head-to-head-folder
git pull
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Refresh your browser after updating.

## Notes

- Always use the folder `current-nba-head-to-head-folder` (no `.zip` in the path).
- If `npm` is not recognized, use the full path:
  `& "C:\Program Files\nodejs\npm.cmd"`
