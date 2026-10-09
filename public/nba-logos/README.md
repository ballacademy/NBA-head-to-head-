# NBA team logos

30 club marks used by the Instagram standings composer (`/?hub=rankings`).

**Source:** ESPN’s public NBA team logo CDN, 500px PNGs:

`https://a.espncdn.com/i/teamlogos/nba/500/{slug}.png`

Examples: `cle.png`, `ny.png`, `gs.png`, `wsh.png`, `utah.png`. Files here are named by the app’s team id (`CLE.png`, `NYK.png`, `GSW.png`, …).

ESPN serves `Access-Control-Allow-Origin: *`. These are the same marks shown on ESPN NBA pages — a well-known public CDN, not an official NBA license. Swap the files in this folder if you later vendor a licensed set; keep the `{ID}.png` filenames.
