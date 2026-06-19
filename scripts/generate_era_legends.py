#!/usr/bin/env python3
"""Generate era legend JSON files for All-Time draft mode."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

# Prime-season snapshots for iconic All-Stars by decade.
ERA_PLAYERS: dict[str, list[dict]] = {
    "1970s": [
        {"bbr": "abdulka01", "name": "Kareem Abdul-Jabbar", "team": "LAL", "position": "C", "age": 24, "gamesPlayed": 82, "minutes": 42.8, "points": 34.8, "rebounds": 16.6, "assists": 4.6, "steals": 0.9, "blocks": 3.5, "turnovers": 3.8, "threePointPct": 0.0, "trueShooting": 0.604, "salary": 250000},
        {"bbr": "ervinju01", "name": "Julius Erving", "team": "PHI", "position": "SF", "age": 30, "gamesPlayed": 82, "minutes": 37.2, "points": 24.6, "rebounds": 8.0, "assists": 4.4, "steals": 2.2, "blocks": 1.8, "turnovers": 3.4, "threePointPct": 0.0, "trueShooting": 0.564, "salary": 350000},
        {"bbr": "fraziwa01", "name": "Walt Frazier", "team": "NYK", "position": "PG", "age": 29, "gamesPlayed": 82, "minutes": 37.8, "points": 21.7, "rebounds": 5.9, "assists": 6.3, "steals": 1.9, "blocks": 0.2, "turnovers": 3.1, "threePointPct": 0.0, "trueShooting": 0.548, "salary": 400000},
        {"bbr": "maravpe01", "name": "Pete Maravich", "team": "NOJ", "position": "SG", "age": 28, "gamesPlayed": 79, "minutes": 37.7, "points": 31.1, "rebounds": 5.4, "assists": 6.1, "steals": 1.5, "blocks": 0.2, "turnovers": 4.2, "threePointPct": 0.0, "trueShooting": 0.528, "salary": 350000},
        {"bbr": "gervige01", "name": "George Gervin", "team": "SAS", "position": "SF", "age": 26, "gamesPlayed": 82, "minutes": 37.6, "points": 33.1, "rebounds": 5.2, "assists": 2.5, "steals": 1.2, "blocks": 0.6, "turnovers": 2.9, "threePointPct": 0.0, "trueShooting": 0.588, "salary": 300000},
        {"bbr": "malonmo01", "name": "Moses Malone", "team": "HOU", "position": "C", "age": 23, "gamesPlayed": 82, "minutes": 42.3, "points": 31.1, "rebounds": 17.7, "assists": 1.9, "steals": 0.8, "blocks": 1.5, "turnovers": 3.6, "threePointPct": 0.0, "trueShooting": 0.562, "salary": 450000},
        {"bbr": "waltonbi01", "name": "Bill Walton", "team": "POR", "position": "C", "age": 24, "gamesPlayed": 65, "minutes": 33.7, "points": 18.6, "rebounds": 14.4, "assists": 4.8, "steals": 1.2, "blocks": 3.2, "turnovers": 3.5, "threePointPct": 0.0, "trueShooting": 0.556, "salary": 350000},
        {"bbr": "hayesel01", "name": "Elvin Hayes", "team": "WSB", "position": "PF", "age": 32, "gamesPlayed": 82, "minutes": 40.2, "points": 23.0, "rebounds": 12.5, "assists": 2.4, "steals": 1.4, "blocks": 2.4, "turnovers": 2.8, "threePointPct": 0.0, "trueShooting": 0.518, "salary": 400000},
        {"bbr": "mcadobo01", "name": "Bob McAdoo", "team": "BUF", "position": "C", "age": 23, "gamesPlayed": 82, "minutes": 43.2, "points": 34.5, "rebounds": 14.1, "assists": 2.2, "steals": 1.1, "blocks": 2.1, "turnovers": 3.4, "threePointPct": 0.0, "trueShooting": 0.563, "salary": 300000},
        {"bbr": "architi01", "name": "Nate Archibald", "team": "KCK", "position": "PG", "age": 24, "gamesPlayed": 82, "minutes": 43.0, "points": 34.0, "rebounds": 2.8, "assists": 11.4, "steals": 1.7, "blocks": 0.2, "turnovers": 4.1, "threePointPct": 0.0, "trueShooting": 0.551, "salary": 250000},
        {"bbr": "westje01", "name": "Jerry West", "team": "LAL", "position": "SG", "age": 34, "gamesPlayed": 81, "minutes": 37.2, "points": 25.8, "rebounds": 4.7, "assists": 9.7, "steals": 1.5, "blocks": 0.7, "turnovers": 3.2, "threePointPct": 0.0, "trueShooting": 0.564, "salary": 500000},
        {"bbr": "havlicejo01", "name": "John Havlicek", "team": "BOS", "position": "SF", "age": 32, "gamesPlayed": 82, "minutes": 42.6, "points": 27.5, "rebounds": 8.2, "assists": 6.4, "steals": 1.9, "blocks": 0.6, "turnovers": 3.0, "threePointPct": 0.0, "trueShooting": 0.512, "salary": 400000},
        {"bbr": "lanierbo01", "name": "Bob Lanier", "team": "DET", "position": "C", "age": 27, "gamesPlayed": 81, "minutes": 38.9, "points": 25.5, "rebounds": 11.3, "assists": 2.6, "steals": 0.9, "blocks": 1.5, "turnovers": 3.1, "threePointPct": 0.0, "trueShooting": 0.558, "salary": 350000},
        {"bbr": "cowendave01", "name": "Dave Cowens", "team": "BOS", "position": "C", "age": 27, "gamesPlayed": 82, "minutes": 41.6, "points": 20.5, "rebounds": 16.2, "assists": 4.1, "steals": 1.2, "blocks": 0.7, "turnovers": 3.4, "threePointPct": 0.0, "trueShooting": 0.498, "salary": 350000},
        {"bbr": "unselwes01", "name": "Wes Unseld", "team": "WSB", "position": "C", "age": 30, "gamesPlayed": 82, "minutes": 38.4, "points": 11.9, "rebounds": 14.0, "assists": 3.9, "steals": 1.1, "blocks": 0.6, "turnovers": 2.8, "threePointPct": 0.0, "trueShooting": 0.512, "salary": 300000},
    ],
    "1980s": [
        {"bbr": "johnsma01", "name": "Magic Johnson", "team": "LAL", "position": "PG", "age": 27, "gamesPlayed": 79, "minutes": 37.5, "points": 23.9, "rebounds": 6.3, "assists": 12.2, "steals": 1.7, "blocks": 0.5, "turnovers": 3.9, "threePointPct": 0.205, "trueShooting": 0.604, "salary": 2500000},
        {"bbr": "birdla01", "name": "Larry Bird", "team": "BOS", "position": "SF", "age": 28, "gamesPlayed": 79, "minutes": 38.4, "points": 28.7, "rebounds": 10.5, "assists": 6.6, "steals": 1.6, "blocks": 0.9, "turnovers": 3.2, "threePointPct": 0.427, "trueShooting": 0.612, "salary": 1800000},
        {"bbr": "jordami01", "name": "Michael Jordan", "team": "CHI", "position": "SG", "age": 25, "gamesPlayed": 82, "minutes": 40.4, "points": 35.0, "rebounds": 5.5, "assists": 5.9, "steals": 3.2, "blocks": 1.6, "turnovers": 3.1, "threePointPct": 0.132, "trueShooting": 0.603, "salary": 760000},
        {"bbr": "thomais01", "name": "Isiah Thomas", "team": "DET", "position": "PG", "age": 27, "gamesPlayed": 81, "minutes": 37.2, "points": 21.3, "rebounds": 3.3, "assists": 11.0, "steals": 1.9, "blocks": 0.3, "turnovers": 3.7, "threePointPct": 0.317, "trueShooting": 0.564, "salary": 1600000},
        {"bbr": "ewingpa01", "name": "Patrick Ewing", "team": "NYK", "position": "C", "age": 27, "gamesPlayed": 82, "minutes": 36.9, "points": 28.6, "rebounds": 11.0, "assists": 3.6, "steals": 1.0, "blocks": 4.0, "turnovers": 3.4, "threePointPct": 0.0, "trueShooting": 0.578, "salary": 2200000},
        {"bbr": "wilkindo01", "name": "Dominique Wilkins", "team": "ATL", "position": "SF", "age": 26, "gamesPlayed": 81, "minutes": 37.5, "points": 30.7, "rebounds": 7.9, "assists": 2.6, "steals": 1.4, "blocks": 0.6, "turnovers": 3.0, "threePointPct": 0.292, "trueShooting": 0.574, "salary": 1200000},
        {"bbr": "drexlc01", "name": "Clyde Drexler", "team": "POR", "position": "SG", "age": 26, "gamesPlayed": 82, "minutes": 39.0, "points": 27.2, "rebounds": 6.7, "assists": 5.8, "steals": 2.5, "blocks": 0.8, "turnovers": 3.1, "threePointPct": 0.338, "trueShooting": 0.584, "salary": 900000},
        {"bbr": "malonka01", "name": "Karl Malone", "team": "UTA", "position": "PF", "age": 26, "gamesPlayed": 82, "minutes": 39.1, "points": 31.0, "rebounds": 11.1, "assists": 2.8, "steals": 1.3, "blocks": 0.9, "turnovers": 3.4, "threePointPct": 0.0, "trueShooting": 0.602, "salary": 1100000},
        {"bbr": "barklch01", "name": "Charles Barkley", "team": "PHI", "position": "PF", "age": 24, "gamesPlayed": 80, "minutes": 39.6, "points": 28.3, "rebounds": 11.9, "assists": 3.2, "steals": 1.3, "blocks": 1.0, "turnovers": 3.5, "threePointPct": 0.217, "trueShooting": 0.612, "salary": 900000},
        {"bbr": "olajwh01", "name": "Hakeem Olajuwon", "team": "HOU", "position": "C", "age": 26, "gamesPlayed": 82, "minutes": 36.8, "points": 23.4, "rebounds": 11.4, "assists": 2.9, "steals": 1.6, "blocks": 3.4, "turnovers": 3.2, "threePointPct": 0.0, "trueShooting": 0.564, "salary": 1400000},
        {"bbr": "worthyja01", "name": "James Worthy", "team": "LAL", "position": "SF", "age": 27, "gamesPlayed": 82, "minutes": 36.9, "points": 21.7, "rebounds": 5.0, "assists": 3.5, "steals": 1.1, "blocks": 0.7, "turnovers": 2.6, "threePointPct": 0.357, "trueShooting": 0.588, "salary": 1500000},
        {"bbr": "mchaledo01", "name": "Kevin McHale", "team": "BOS", "position": "PF", "age": 30, "gamesPlayed": 82, "minutes": 36.9, "points": 26.1, "rebounds": 8.8, "assists": 2.3, "steals": 0.8, "blocks": 1.2, "turnovers": 2.4, "threePointPct": 0.125, "trueShooting": 0.612, "salary": 1000000},
        {"bbr": "parisro01", "name": "Robert Parish", "team": "BOS", "position": "C", "age": 32, "gamesPlayed": 80, "minutes": 36.1, "points": 18.6, "rebounds": 11.5, "assists": 2.2, "steals": 0.8, "blocks": 1.5, "turnovers": 2.5, "threePointPct": 0.0, "trueShooting": 0.578, "salary": 1200000},
        {"bbr": "englishd01", "name": "Alex English", "team": "DEN", "position": "SF", "age": 31, "gamesPlayed": 82, "minutes": 36.5, "points": 29.8, "rebounds": 5.1, "assists": 4.0, "steals": 1.3, "blocks": 0.7, "turnovers": 2.8, "threePointPct": 0.0, "trueShooting": 0.558, "salary": 1100000},
        {"bbr": "moncri01", "name": "Sidney Moncrief", "team": "MIL", "position": "SG", "age": 28, "gamesPlayed": 71, "minutes": 36.6, "points": 20.5, "rebounds": 4.4, "assists": 3.9, "steals": 1.5, "blocks": 0.3, "turnovers": 2.4, "threePointPct": 0.0, "trueShooting": 0.584, "salary": 900000},
        {"bbr": "kingbe01", "name": "Bernard King", "team": "NYK", "position": "SF", "age": 28, "gamesPlayed": 55, "minutes": 37.5, "points": 32.9, "rebounds": 5.8, "assists": 3.9, "steals": 1.0, "blocks": 0.2, "turnovers": 3.2, "threePointPct": 0.0, "trueShooting": 0.598, "salary": 1200000},
        {"bbr": "cummivo01", "name": "Tom Chambers", "team": "PHO", "position": "PF", "age": 29, "gamesPlayed": 82, "minutes": 35.8, "points": 25.7, "rebounds": 6.6, "assists": 2.3, "steals": 0.9, "blocks": 0.5, "turnovers": 2.6, "threePointPct": 0.364, "trueShooting": 0.602, "salary": 1000000},
        {"bbr": "cheatha01", "name": "Adrian Dantley", "team": "UTA", "position": "SF", "age": 28, "gamesPlayed": 80, "minutes": 37.7, "points": 30.7, "rebounds": 6.2, "assists": 4.0, "steals": 1.1, "blocks": 0.2, "turnovers": 3.0, "threePointPct": 0.0, "trueShooting": 0.634, "salary": 900000},
    ],
    "1990s": [
        {"bbr": "jordami01", "name": "Michael Jordan", "team": "CHI", "position": "SG", "age": 29, "gamesPlayed": 82, "minutes": 38.8, "points": 30.4, "rebounds": 6.6, "assists": 4.3, "steals": 2.3, "blocks": 0.8, "turnovers": 2.9, "threePointPct": 0.374, "trueShooting": 0.605, "salary": 33000000},
        {"bbr": "olajwh01", "name": "Hakeem Olajuwon", "team": "HOU", "position": "C", "age": 31, "gamesPlayed": 72, "minutes": 39.2, "points": 27.8, "rebounds": 11.1, "assists": 3.5, "steals": 1.6, "blocks": 3.4, "turnovers": 3.2, "threePointPct": 0.0, "trueShooting": 0.566, "salary": 14000000},
        {"bbr": "onealsh01", "name": "Shaquille O'Neal", "team": "LAL", "position": "C", "age": 27, "gamesPlayed": 79, "minutes": 40.0, "points": 29.7, "rebounds": 13.6, "assists": 3.8, "steals": 0.5, "blocks": 3.0, "turnovers": 3.0, "threePointPct": 0.0, "trueShooting": 0.576, "salary": 17000000},
        {"bbr": "malonka01", "name": "Karl Malone", "team": "UTA", "position": "PF", "age": 34, "gamesPlayed": 82, "minutes": 37.4, "points": 25.5, "rebounds": 9.4, "assists": 4.1, "steals": 1.2, "blocks": 0.4, "turnovers": 2.8, "threePointPct": 0.0, "trueShooting": 0.577, "salary": 6000000},
        {"bbr": "stockjo01", "name": "John Stockton", "team": "UTA", "position": "PG", "age": 35, "gamesPlayed": 82, "minutes": 33.8, "points": 12.9, "rebounds": 2.7, "assists": 11.5, "steals": 1.7, "blocks": 0.2, "turnovers": 2.8, "threePointPct": 0.384, "trueShooting": 0.604, "salary": 5000000},
        {"bbr": "pippesc01", "name": "Scottie Pippen", "team": "CHI", "position": "SF", "age": 31, "gamesPlayed": 77, "minutes": 38.7, "points": 20.2, "rebounds": 6.5, "assists": 5.9, "steals": 2.0, "blocks": 0.9, "turnovers": 2.5, "threePointPct": 0.374, "trueShooting": 0.572, "salary": 4500000},
        {"bbr": "millere01", "name": "Reggie Miller", "team": "IND", "position": "SG", "age": 32, "gamesPlayed": 79, "minutes": 36.6, "points": 18.9, "rebounds": 3.3, "assists": 3.2, "steals": 1.3, "blocks": 0.2, "turnovers": 2.0, "threePointPct": 0.429, "trueShooting": 0.615, "salary": 6000000},
        {"bbr": "paytoga01", "name": "Gary Payton", "team": "SEA", "position": "PG", "age": 29, "gamesPlayed": 82, "minutes": 40.5, "points": 24.2, "rebounds": 4.5, "assists": 8.0, "steals": 2.5, "blocks": 0.2, "turnovers": 3.1, "threePointPct": 0.368, "trueShooting": 0.558, "salary": 8000000},
        {"bbr": "barklch01", "name": "Charles Barkley", "team": "PHX", "position": "PF", "age": 30, "gamesPlayed": 71, "minutes": 38.6, "points": 23.2, "rebounds": 11.6, "assists": 4.1, "steals": 1.6, "blocks": 0.7, "turnovers": 3.0, "threePointPct": 0.27, "trueShooting": 0.604, "salary": 9000000},
        {"bbr": "robinda01", "name": "David Robinson", "team": "SAS", "position": "C", "age": 32, "gamesPlayed": 73, "minutes": 36.6, "points": 21.6, "rebounds": 10.6, "assists": 2.7, "steals": 1.7, "blocks": 2.9, "turnovers": 2.8, "threePointPct": 0.25, "trueShooting": 0.577, "salary": 7000000},
        {"bbr": "rodmande01", "name": "Dennis Rodman", "team": "CHI", "position": "PF", "age": 34, "gamesPlayed": 80, "minutes": 35.0, "points": 5.7, "rebounds": 15.4, "assists": 2.9, "steals": 1.2, "blocks": 0.4, "turnovers": 1.4, "threePointPct": 0.0, "trueShooting": 0.548, "salary": 9000000},
        {"bbr": "webbech01", "name": "Chris Webber", "team": "SAC", "position": "PF", "age": 26, "gamesPlayed": 75, "minutes": 40.2, "points": 27.1, "rebounds": 11.1, "assists": 4.2, "steals": 1.6, "blocks": 1.7, "turnovers": 3.2, "threePointPct": 0.0, "trueShooting": 0.564, "salary": 12000000},
        {"bbr": "hillgr01", "name": "Grant Hill", "team": "DET", "position": "SF", "age": 26, "gamesPlayed": 81, "minutes": 40.8, "points": 25.8, "rebounds": 6.6, "assists": 5.2, "steals": 1.4, "blocks": 0.6, "turnovers": 3.1, "threePointPct": 0.0, "trueShooting": 0.578, "salary": 8000000},
        {"bbr": "hardati01", "name": "Anfernee Hardaway", "team": "ORL", "position": "PG", "age": 25, "gamesPlayed": 59, "minutes": 38.0, "points": 21.7, "rebounds": 4.3, "assists": 7.1, "steals": 2.0, "blocks": 0.2, "turnovers": 3.0, "threePointPct": 0.338, "trueShooting": 0.584, "salary": 7000000},
        {"bbr": "mournal01", "name": "Alonzo Mourning", "team": "MIA", "position": "C", "age": 28, "gamesPlayed": 69, "minutes": 36.7, "points": 20.1, "rebounds": 11.0, "assists": 1.6, "steals": 0.9, "blocks": 3.9, "turnovers": 2.8, "threePointPct": 0.0, "trueShooting": 0.564, "salary": 9000000},
        {"bbr": "richmmit01", "name": "Mitch Richmond", "team": "SAC", "position": "SG", "age": 32, "gamesPlayed": 82, "minutes": 38.6, "points": 23.2, "rebounds": 3.7, "assists": 4.1, "steals": 1.3, "blocks": 0.2, "turnovers": 2.4, "threePointPct": 0.387, "trueShooting": 0.598, "salary": 7000000},
        {"bbr": "mullich01", "name": "Chris Mullin", "team": "GSW", "position": "SF", "age": 30, "gamesPlayed": 78, "minutes": 39.0, "points": 25.6, "rebounds": 5.6, "assists": 3.8, "steals": 1.4, "blocks": 0.4, "turnovers": 2.6, "threePointPct": 0.429, "trueShooting": 0.624, "salary": 6000000},
        {"bbr": "dumarte01", "name": "Joe Dumars", "team": "DET", "position": "SG", "age": 30, "gamesPlayed": 73, "minutes": 37.0, "points": 18.9, "rebounds": 2.5, "assists": 5.7, "steals": 0.9, "blocks": 0.1, "turnovers": 1.8, "threePointPct": 0.403, "trueShooting": 0.598, "salary": 5000000},
    ],
    "2000s": [
        {"bbr": "bryanko01", "name": "Kobe Bryant", "team": "LAL", "position": "SG", "age": 27, "gamesPlayed": 80, "minutes": 41.0, "points": 35.4, "rebounds": 5.3, "assists": 4.5, "steals": 1.8, "blocks": 0.4, "turnovers": 3.1, "threePointPct": 0.347, "trueShooting": 0.559, "salary": 19425000},
        {"bbr": "duncati01", "name": "Tim Duncan", "team": "SAS", "position": "PF", "age": 28, "gamesPlayed": 82, "minutes": 38.3, "points": 22.2, "rebounds": 12.7, "assists": 3.7, "steals": 0.9, "blocks": 2.3, "turnovers": 2.6, "threePointPct": 0.0, "trueShooting": 0.564, "salary": 13500000},
        {"bbr": "garneti01", "name": "Kevin Garnett", "team": "MIN", "position": "PF", "age": 28, "gamesPlayed": 82, "minutes": 39.4, "points": 24.2, "rebounds": 13.9, "assists": 5.0, "steals": 1.5, "blocks": 2.2, "turnovers": 2.4, "threePointPct": 0.267, "trueShooting": 0.584, "salary": 16000000},
        {"bbr": "onealsh01", "name": "Shaquille O'Neal", "team": "MIA", "position": "C", "age": 33, "gamesPlayed": 73, "minutes": 34.1, "points": 22.9, "rebounds": 10.4, "assists": 2.7, "steals": 0.5, "blocks": 1.4, "turnovers": 2.8, "threePointPct": 0.0, "trueShooting": 0.584, "salary": 20000000},
        {"bbr": "nowitdi01", "name": "Dirk Nowitzki", "team": "DAL", "position": "PF", "age": 28, "gamesPlayed": 82, "minutes": 36.2, "points": 26.6, "rebounds": 8.9, "assists": 2.4, "steals": 0.7, "blocks": 0.8, "turnovers": 1.9, "threePointPct": 0.358, "trueShooting": 0.624, "salary": 13750000},
        {"bbr": "nashst01", "name": "Steve Nash", "team": "PHO", "position": "PG", "age": 31, "gamesPlayed": 78, "minutes": 34.3, "points": 18.8, "rebounds": 4.2, "assists": 10.5, "steals": 0.8, "blocks": 0.2, "turnovers": 3.3, "threePointPct": 0.439, "trueShooting": 0.634, "salary": 11000000},
        {"bbr": "mcgradytr01", "name": "Tracy McGrady", "team": "ORL", "position": "SG", "age": 24, "gamesPlayed": 75, "minutes": 40.8, "points": 32.1, "rebounds": 6.5, "assists": 5.7, "steals": 1.7, "blocks": 0.8, "turnovers": 2.6, "threePointPct": 0.338, "trueShooting": 0.564, "salary": 12000000},
        {"bbr": "iversal01", "name": "Allen Iverson", "team": "PHI", "position": "SG", "age": 28, "gamesPlayed": 82, "minutes": 42.5, "points": 33.0, "rebounds": 4.7, "assists": 7.4, "steals": 2.4, "blocks": 0.1, "turnovers": 3.4, "threePointPct": 0.308, "trueShooting": 0.518, "salary": 15500000},
        {"bbr": "piercpa01", "name": "Paul Pierce", "team": "BOS", "position": "SF", "age": 28, "gamesPlayed": 79, "minutes": 38.9, "points": 26.8, "rebounds": 6.7, "assists": 4.7, "steals": 1.4, "blocks": 0.5, "turnovers": 3.2, "threePointPct": 0.356, "trueShooting": 0.584, "salary": 12000000},
        {"bbr": "allenra02", "name": "Ray Allen", "team": "SEA", "position": "SG", "age": 29, "gamesPlayed": 78, "minutes": 39.5, "points": 24.5, "rebounds": 4.5, "assists": 4.1, "steals": 1.3, "blocks": 0.2, "turnovers": 2.6, "threePointPct": 0.416, "trueShooting": 0.612, "salary": 11000000},
        {"bbr": "wadedw01", "name": "Dwyane Wade", "team": "MIA", "position": "SG", "age": 26, "gamesPlayed": 79, "minutes": 38.6, "points": 30.2, "rebounds": 5.0, "assists": 7.5, "steals": 2.2, "blocks": 1.0, "turnovers": 3.4, "threePointPct": 0.317, "trueShooting": 0.584, "salary": 13000000},
        {"bbr": "jamesle01", "name": "LeBron James", "team": "CLE", "position": "SF", "age": 24, "gamesPlayed": 81, "minutes": 37.7, "points": 28.4, "rebounds": 7.6, "assists": 7.2, "steals": 1.7, "blocks": 1.1, "turnovers": 3.0, "threePointPct": 0.344, "trueShooting": 0.591, "salary": 15780000},
        {"bbr": "anthoca01", "name": "Carmelo Anthony", "team": "DEN", "position": "SF", "age": 24, "gamesPlayed": 77, "minutes": 36.4, "points": 22.8, "rebounds": 6.0, "assists": 2.8, "steals": 1.0, "blocks": 0.5, "turnovers": 2.6, "threePointPct": 0.371, "trueShooting": 0.564, "salary": 13041000},
        {"bbr": "paulch01", "name": "Chris Paul", "team": "NOH", "position": "PG", "age": 23, "gamesPlayed": 78, "minutes": 36.0, "points": 22.8, "rebounds": 4.7, "assists": 11.0, "steals": 2.7, "blocks": 0.2, "turnovers": 2.9, "threePointPct": 0.358, "trueShooting": 0.584, "salary": 4276320},
        {"bbr": "howarddw01", "name": "Dwight Howard", "team": "ORL", "position": "C", "age": 23, "gamesPlayed": 82, "minutes": 35.7, "points": 20.6, "rebounds": 13.8, "assists": 1.4, "steals": 0.9, "blocks": 2.9, "turnovers": 2.5, "threePointPct": 0.0, "trueShooting": 0.624, "salary": 13750000},
        {"bbr": "parketo01", "name": "Tony Parker", "team": "SAS", "position": "PG", "age": 26, "gamesPlayed": 80, "minutes": 34.4, "points": 22.0, "rebounds": 3.2, "assists": 6.9, "steals": 0.9, "blocks": 0.1, "turnovers": 2.4, "threePointPct": 0.357, "trueShooting": 0.564, "salary": 9000000},
        {"bbr": "ginobma01", "name": "Manu Ginobili", "team": "SAS", "position": "SG", "age": 31, "gamesPlayed": 75, "minutes": 30.5, "points": 19.8, "rebounds": 4.8, "assists": 4.5, "steals": 1.5, "blocks": 0.4, "turnovers": 2.2, "threePointPct": 0.355, "trueShooting": 0.598, "salary": 9000000},
        {"bbr": "stoudam01", "name": "Amar'e Stoudemire", "team": "PHO", "position": "PF", "age": 25, "gamesPlayed": 53, "minutes": 34.6, "points": 21.4, "rebounds": 9.1, "assists": 1.9, "steals": 0.7, "blocks": 1.4, "turnovers": 2.4, "threePointPct": 0.0, "trueShooting": 0.612, "salary": 15070000},
    ],
    "2010s": [
        {"bbr": "jamesle01", "name": "LeBron James", "team": "MIA", "position": "SF", "age": 28, "gamesPlayed": 76, "minutes": 37.7, "points": 26.8, "rebounds": 8.0, "assists": 7.3, "steals": 1.7, "blocks": 0.9, "turnovers": 3.0, "threePointPct": 0.406, "trueShooting": 0.64, "salary": 19000000},
        {"bbr": "hardeja01", "name": "James Harden", "team": "HOU", "position": "SG", "age": 29, "gamesPlayed": 81, "minutes": 36.8, "points": 36.1, "rebounds": 6.6, "assists": 7.5, "steals": 2.0, "blocks": 0.7, "turnovers": 5.0, "threePointPct": 0.368, "trueShooting": 0.619, "salary": 30500000},
        {"bbr": "curryst01", "name": "Stephen Curry", "team": "GSW", "position": "PG", "age": 27, "gamesPlayed": 79, "minutes": 34.2, "points": 30.1, "rebounds": 5.4, "assists": 6.7, "steals": 2.1, "blocks": 0.2, "turnovers": 3.3, "threePointPct": 0.454, "trueShooting": 0.669, "salary": 11370000},
        {"bbr": "duranke01", "name": "Kevin Durant", "team": "GSW", "position": "SF", "age": 29, "gamesPlayed": 68, "minutes": 34.2, "points": 26.4, "rebounds": 6.8, "assists": 5.4, "steals": 0.7, "blocks": 1.8, "turnovers": 3.3, "threePointPct": 0.416, "trueShooting": 0.651, "salary": 30000000},
        {"bbr": "leonaka01", "name": "Kawhi Leonard", "team": "TOR", "position": "SF", "age": 27, "gamesPlayed": 60, "minutes": 34.0, "points": 26.6, "rebounds": 7.3, "assists": 3.3, "steals": 1.8, "blocks": 0.4, "turnovers": 1.8, "threePointPct": 0.376, "trueShooting": 0.614, "salary": 20109000},
        {"bbr": "westbru01", "name": "Russell Westbrook", "team": "OKC", "position": "PG", "age": 28, "gamesPlayed": 80, "minutes": 34.6, "points": 25.4, "rebounds": 10.1, "assists": 10.3, "steals": 1.8, "blocks": 0.3, "turnovers": 3.7, "threePointPct": 0.343, "trueShooting": 0.55, "salary": 28500000},
        {"bbr": "davisan02", "name": "Anthony Davis", "team": "NOP", "position": "PF", "age": 24, "gamesPlayed": 75, "minutes": 36.1, "points": 28.0, "rebounds": 11.8, "assists": 2.3, "steals": 1.5, "blocks": 2.4, "turnovers": 2.4, "threePointPct": 0.34, "trueShooting": 0.596, "salary": 12700000},
        {"bbr": "antetgi01", "name": "Giannis Antetokounmpo", "team": "MIL", "position": "PF", "age": 23, "gamesPlayed": 80, "minutes": 32.8, "points": 26.9, "rebounds": 10.0, "assists": 4.8, "steals": 1.5, "blocks": 1.4, "turnovers": 3.9, "threePointPct": 0.307, "trueShooting": 0.593, "salary": 22450000},
        {"bbr": "lillada01", "name": "Damian Lillard", "team": "POR", "position": "PG", "age": 27, "gamesPlayed": 82, "minutes": 36.6, "points": 27.0, "rebounds": 4.5, "assists": 6.6, "steals": 1.1, "blocks": 0.3, "turnovers": 2.8, "threePointPct": 0.369, "trueShooting": 0.592, "salary": 27900000},
        {"bbr": "jokicni01", "name": "Nikola Jokić", "team": "DEN", "position": "C", "age": 23, "gamesPlayed": 80, "minutes": 31.3, "points": 20.1, "rebounds": 10.8, "assists": 7.3, "steals": 1.4, "blocks": 0.7, "turnovers": 3.1, "threePointPct": 0.307, "trueShooting": 0.585, "salary": 14100000},
        {"bbr": "paulch01", "name": "Chris Paul", "team": "LAC", "position": "PG", "age": 30, "gamesPlayed": 82, "minutes": 34.8, "points": 19.1, "rebounds": 4.6, "assists": 10.7, "steals": 2.2, "blocks": 0.2, "turnovers": 2.5, "threePointPct": 0.384, "trueShooting": 0.584, "salary": 20065963},
        {"bbr": "butleji01", "name": "Jimmy Butler", "team": "PHI", "position": "SF", "age": 28, "gamesPlayed": 82, "minutes": 36.9, "points": 22.2, "rebounds": 5.3, "assists": 4.0, "steals": 1.6, "blocks": 0.6, "turnovers": 1.6, "threePointPct": 0.356, "trueShooting": 0.584, "salary": 20000000},
        {"bbr": "georgpa01", "name": "Paul George", "team": "OKC", "position": "SF", "age": 28, "gamesPlayed": 77, "minutes": 36.9, "points": 28.0, "rebounds": 8.2, "assists": 4.1, "steals": 2.2, "blocks": 0.5, "turnovers": 3.3, "threePointPct": 0.386, "trueShooting": 0.584, "salary": 30560000},
        {"bbr": "irvinky01", "name": "Kyrie Irving", "team": "BOS", "position": "PG", "age": 25, "gamesPlayed": 60, "minutes": 32.4, "points": 24.4, "rebounds": 3.8, "assists": 4.1, "steals": 0.9, "blocks": 0.3, "turnovers": 2.6, "threePointPct": 0.401, "trueShooting": 0.612, "salary": 18868662},
        {"bbr": "thomakl01", "name": "Klay Thompson", "team": "GSW", "position": "SG", "age": 28, "gamesPlayed": 78, "minutes": 34.0, "points": 21.5, "rebounds": 3.8, "assists": 2.4, "steals": 0.8, "blocks": 0.5, "turnovers": 1.6, "threePointPct": 0.402, "trueShooting": 0.584, "salary": 17825000},
        {"bbr": "walljo01", "name": "John Wall", "team": "WAS", "position": "PG", "age": 27, "gamesPlayed": 77, "minutes": 36.9, "points": 23.1, "rebounds": 4.2, "assists": 10.7, "steals": 1.8, "blocks": 1.1, "turnovers": 4.1, "threePointPct": 0.34, "trueShooting": 0.548, "salary": 18063000},
    ],
}


def to_player(era: str, raw: dict) -> dict:
    team_slug = raw["team"].lower()
    return {
        "id": f"era-{era}-{raw['bbr']}-{team_slug}",
        "bbrPlayerId": raw["bbr"],
        "name": raw["name"],
        "team": raw["team"],
        "position": raw["position"],
        "age": raw["age"],
        "gamesPlayed": raw["gamesPlayed"],
        "minutes": raw["minutes"],
        "points": raw["points"],
        "rebounds": raw["rebounds"],
        "assists": raw["assists"],
        "steals": raw["steals"],
        "blocks": raw["blocks"],
        "turnovers": raw["turnovers"],
        "threePointPct": raw["threePointPct"],
        "trueShooting": raw["trueShooting"],
        "salary": raw["salary"],
    }


def main() -> None:
    for era, players in ERA_PLAYERS.items():
        payload = {
            "era": era,
            "players": [to_player(era, player) for player in players],
        }
        path = DATA_DIR / f"era-players-{era}.json"
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {path.name} ({len(players)} players)")


if __name__ == "__main__":
    main()
