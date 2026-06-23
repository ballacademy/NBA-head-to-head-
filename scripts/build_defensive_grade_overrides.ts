import { writeFileSync } from "node:fs";
import { players } from "../src/lib/playerPool";
import type { DefenseGrade } from "../src/lib/defenseRating";

const USER_GRADES = `
Achiuwa, Precious	B
Adams, Steven	B-
Adebayo, Bam	A+
Agbaji, Ochai	B-
Aldama, Santi	C+
Alexander, Trey	C
Alexander-Walker, Nickeil	A-
Allen, Grayson	C
Allen, Jarrett	B+
Alvarado, Jose	B+
Anderson, Kyle	B
Antetokounmpo, Giannis	A
Antetokounmpo, Thanasis	C+
Anunoby, OG	A+
Avdija, Deni	C+
Ayton, Deandre	C+
Bagley, Marvin III	D-
Bailey, Ace	B-
Baldwin, Patrick Jr.	C-
Ball, LaMelo	D
Ball, Lonzo	B+
Banchero, Paolo	B-
Bane, Desmond	B
Banton, Dalano	C+
Barlow, Dominick	C+
Barnes, Harrison	C
Barnes, Scottie	A+
Barnhizer, Brooks	B-
Barrett, RJ	C
Bassey, Charles	B
Battle, Jamison	C-
Batum, Nicolas	B
Beal, Bradley	C
Beauchamp, MarJon	C
Beringer, Joan	B-
Bey, Saddiq	C
Bitadze, Goga	B
Biyombo, Bismack	B-
Black, Anthony	B
Black, Leaky	B-
Bogdanovic, Bogdan	D+
Bogdanovic, Bojan	F
Bona, Adem	B-
Bol, Bol	C-
Booker, Devin	C
Boston, Brandon Jr.	C-
Boucher, Chris	B-
Bouknight, James	D-
Bradley, Tony	C-
Branham, Malaki	D-
Braun, Christian	B+
Bridges, Mikal	A-
Bridges, Miles	C-
Brisset, Oshae	B-
Brogdon, Malcolm	C+
Brooks, Dillon	A-
Broome, Johni	B-
Brown, Bruce	B
Brown, Jaylen	B+
Brown, Kendall	C-
Brown, Kobe	C
Brown, Moses	C-
Bryant, Thomas	D
Bryant, Carter	B+
Brunson, Jalen	C-
Bufkin, Kobe	C
Bullock, Reggie	C-
Burks, Alec	D
Butler, Jimmy	A-
Buzelis, Matas	B-
Caboclo, Bruno	C
Cain, Jamal	C
Caldwell-Pope, Kentavious	B
Capela, Clint	B
Carter, Jevon	B-
Carter, Wendell Jr.	B
Caruso, Alex	A+
Castle, Stephon	A-
Castleton, Colin	C-
Champagnie, Julian	B-
Champagnie, Justin	B-
Chandler, Kennedy	C
Christopher, Josh	C
Clark, Jaylen	B
Clarke, Brandon	B
Clarkson, Jordan	F
Claxton, Nic	B+
Clingan, Donovan	B+
Clowney, Noah	B-
Coffey, Amir	B-
Collins, John	C
Collins, Zach	C+
Comanche, Javan	C-
Conley, Mike	C+
Connaughton, Pat	C-
Cook, Xavier	C
Coulibaly, Bilal	B+
Coward, Cedric	C+
Covington, Robert	B
Craig, Torrey	B
Cripsin, Jeev	C
Cunningham, Cade	C+
Curry, Seth	F
Curry, Stephen	C-
Daniels, Dyson	B+
Davis, Anthony	A
Davis, Johnny	C
Davison, JD	C-
Dёmin, Egor	C+
DeRozan, DeMar	D-
Diabaté, Moussa	B
Diakite, Mamadi	C
Dick, Gradey	D+
Dieng, Ousmane	B-
Dillingham, Rob	D-
Dinwiddie, Spencer	D
DiVincenzo, Donte	B-
Dončić, Luka	D
Dort, Luguentz	A
Dosunmu, Ayo	B
Dowtin, Jeff	C
Drummond, Andre	C+
Duarte, Chris	C
Duke, David Jr.	C+
Dunlap, Hunter	C
Dunn, Kris	B+
Durant, Kevin	C+
Duren, Jalen	C+
Eason, Tari	A-
East, Sean II	C-
Edgecombe, VJ	B-
Edwards, Anthony	B
Edwards, Kessler	B-
Enaruna, Tristan	C-
Ellis, Keon	B+
Embiid, Joel	B
Engstrom, Luke	C
Essengue, Noa	B-
Eubanks, Drew	C-
Exum, Dante	B-
Fears, Jeremiah	C
Fernando, Bruno	C-
Fields, Justin	C
Finney-Smith, Dorian	B+
Flagg, Cooper	B+
Flynn, Malachi	D
Fontecchio, Simone	C-
Forbes, Bryn	D
Ford, Jordan	C-
Foster, Michael Jr.	C-
Fox, De'Aaron	B-
Freeman, Enrique	C+
Funk, Andrew	C-
Gafford, Daniel	B
Gallow, Jeff	C
Garuba, Usman	B
Garland, Darius	D-
Garza, Luka	D+
George, Kyshawn	C+
George, Keyonte	D-
George, Paul	B+
Gillespie, Collin	C-
Gilgeous-Alexander, Shai	B
Gill, Anthony	C
Giddey, Josh	D+
Gilyard, Jacob	C
Goble, James	C
Gobert, Rudy	A+
Gonzalez, Hugo	B-
Goodwin, Jordan	B-
Gordon, Aaron	B+
Gordon, Eric	D
Gortman, Jazian	C
Graham, Devonte'	D
Grant, Jerami	C+
Gray, RaiQuan	C-
Green, AJ	C-
Green, Danny	C+
Green, Draymond	A-
Green, Jalen	C
Green, Jeff	C-
Green, Josh	B
Grimes, Quentin	B
Gueye, Mouhamed	C
Gueye, Mouhamadou	C+
Haliburton, Tyrese	D+
Hampton, RJ	D
Hardaway, Tim Jr.	D-
Harden, James	C
Hardy, Jaden	D
Harper, Dylan	B
Harper, Ron Jr.	C-
Harris, Gary	B-
Harris, Joe	F
Harris, Kevon	C
Harris, Tobias	C
Harrison, Shaquille	C
Hart, Josh	B
Hartenstein, Isaiah	B
Hauser, Sam	C+
Hawes, Spencer	F
Hayes, Jaxson	C
Hayes, Killian	B-
Hayward, Gordon	C-
Heuser, Eric	C
Henderson, Scoot	C-
Herro, Tyler	D-
Highsmith, Haywood	A-
Hill, George	C
Hinson, Blake	C-
Holiday, Aaron	B-
Holiday, Jrue	A
Holiday, Justin	C-
Holmgren, Chet	A+
Horford, Al	B
Horton-Tucker, Talen	D+
House, Danuel Jr.	C+
Houston, Caleb	C
Howard, Jett	C-
Huff, Jay	B-
Hukporti, Ariel	B-
Hunter, De'Andre	C+
Hyland, Bones	F
Ingram, Brandon	C
Ivey, Jaden	C-
Irving, Kyrie	C-
Jackson, GG	C
Jackson, Isaiah	B-
Jackson, Jaren Jr.	A+
Jackson, Reggie	D-
Jackson-Davis, Trayce	B
James, LeBron	B
James, Bronny	C+
Jaquez Jr., Jaime	B
Jenkins, Dan	C
Jiri, Jan	C
Joe, Isaiah	C
Johnson, Cameron	C+
Johnson, Jalen	B
Johnson, Keldon	C-
Johnson, Keon	C
Johnson, Keshad	B-
Jones, Carlik	C
Jones, Colby	C+
Jones, Herb	A
Jones, Kai	C+
Jones, Tre	C
Jones, Tyus	D+
Jones Garcia, David	C-
Jokić, Nikola	C-
Jovic, Nikola	C
Joseph, Cory	C-
Kawamura, Yuki	C-
Knecht, Dalton	C-
Knueppel, Kon	C-
Kornet, Luke	B-
Kuzma, Kyle	C
Landale, Jock	C+
LaRavia, Jake	C+
Lardy, Kevin	C
Leonard, Kawhi	A-
Liddell, E.J.	C
Lillard, Damian	D
Little, Nassir	C+
Lively, Dereck II	B+
Looney, Kevon	B-
Lopez, Brook	B-
Love, Kevin	C-
Lowry, Kyle	C
Lundy, Seth	C-
Manek, Brady	D
Mañon, Cesar	C-
Markkanen, Lauri	C-
Marshall, Naji	B
Martin, Caleb	B
Martin, Cody	B
Martin, Kenyon Jr.	C
Martin, Tyrese	C
Alijah, Martin	C-
Mathews, Garrison	C-
Mathurin, Bennedict	D
Matthews, Wesley	C+
Maxey, Tyrese	C
McBride, Miles	B+
McClung, Mac	D
McDaniels, Jaden	A
McDaniels, Jalen	B
McDermott, Doug	F
McGee, JaVale	C-
McGowens, Bryce	C-
McLauglin, Jordan	D+
Meadows, Eli	C
Melton, De'Anthony	B+
Merrill, Sam	D
Middleton, Khris	C+
Miller, Brandon	C+
Miller, Jordan	C
Miller, Leonard	C+
Mills, Patty	D
Minix, Riley	C-
Minott, Josh	B-
Mintz, Davion	C
Mitchell, Ajay	C+
Mitchell, Davion	B+
Mitchell, Donovan	C-
Missi, Yves	B
Mobley, Evan	A
Mobley, Isaiah	C-
Monk, Malik	D
Moore, Wendell	C
Morant, Ja	C
Morris, Monte	C
Morris, Markieff	D
Morris, Marcus Sr.	C-
Murphy, Trey III	B
Murray, Dejounte	B
Murray, Jamal	C-
Murray, Keegan	B
Murray, Kris	B-
Murray-Boyles, Collin	B+
Muscala, Mike	C-
Mykhailiuk, Svi	D
Nance, Larry Jr.	B-
Nance, Pete	C-
Nembhard, Andrew	B
Nesmith, Aaron	B+
Neto, Raul	C
Newton, Tristen	C-
Niang, Georges	D-
Nixon, Ray	C
Nnaji, Zeke	C-
Noel, Nerlens	B
Nurkić, Jusuf	B-
Nwaba, David	B
Nwora, Jordan	D
O'Neale, Royce	B
Okogie, Josh	B+
Okolovich, Rocco	C
Okongwu, Onyeka	B+
Okoro, Isaac	A-
Olbrich, Lachlan	C
Olivari, Quincy	C-
Olynyk, Kelly	D+
Oris, Jason	C
Oubre, Kelly Jr.	C+
Paul, Chris	C
Payne, Cameron	D+
Payton, Gary II	B+
Perrin, Daniel	C
Petty, John Jr.	C
Pippen, Scotty Jr.	B
Pinson, Theo	C-
Plunkett, Ross	C
Plumlee, Mason	C-
Podziemski, Brandin	B-
Poole, Jordan	F
Porter, Kevin Jr.	C-
Porter, Craig Jr.	B-
Porter, Michael Jr.	C-
Porter, Jontay	B-
Portis, Bobby Jr.	C
Porzingis, Kristaps	B-
Powell, Dwight	C-
Powell, Norman	C-
Prkacin, Roko	C
Prince, Taurean	C+
Pritchard, Payton	C-
Proctor, Tyrese	B-
Queen, Derik	B-
Queta, Neemias	B
Quickley, Immanuel	C-
Radanov, Aleksa	C
Randle, Julius	C-
Raynaud, Maxime	C+
Reaves, Austin	B
Reed, Paul	B
Reid, Naz	C+
Reath, Duop	C
Reynolds, Jared	C
Rice, Sir'Jabari	C-
Richards, Nick	B-
Richardson, Jase	C+
Richardson, Josh	B-
Rivers, Austin	C+
Robinson, Duncan	D
Robinson, Mitchell	A-
Robinson-Earl, Jeremiah	B-
Roddy, David	C
Rollins, Ryan	B-
Ross, Terrence	F
Rozier, Terry	D
Russell, D'Angelo	D-
Ryan, Matt	F
Ryan, Cormac	C-
Sabonis, Domantas	D+
Sanon, Issuf	C
Sarr, Alex	B+
Sarr, Olivier	C+
Saric, Dario	D
Scariolo, Alessandro	C
Scheierman, Baylor	C-
Schofield, Admiral	C
Schröder, Dennis	C
Sengun, Alperen	B-
Sexton, Collin	D+
Sheppard, Ben	B-
Sheppard, Reed	B-
Shittu, Simisola	C
Shulga, Max	C-
Simic, Roman	C
Simons, Anfernee	F
Simmons, Ben	B+
Siakam, Pascal	B
Sims, Jericho	B-
Slawson, Jalen	C
Spar, Tyler	C
Spencer, Cam	C-
Spring, Marcus	C
Strawther, Julian	C-
Stewart, Isaiah	B+
Strus, Max	C+
Suggs, Jalen	B+
Swider, Cole	F
Tate, Jae'Sean	B+
Taylor, Terry	C-
Teague, MaCio	C
Temple, Garrett	C+
Terry, Dalen	B-
Theis, Daniel	B-
Thomas, Cam	F
Thompson, Amen	A
Thompson, Ausar	A
Thompson, Klay	C
Timme, Drew	C-
Tomlin, Nae'Qwan	C
Tonje, John	C-
Toppin, Obi	D
Toppin, Jacob	C-
Towns, Karl-Anthony	C+
Trent, Gary Jr.	C-
Turner, Myles	B+
Tyson, Jaylon	C-
Umude, Stanley	C
Valančiūnas, Jonas	D+
Vanderbilt, Jarred	B+
VanVleet, Fred	B
Vassell, Devin	C+
Vincent, Gabe	B-
Vučević, Nikola	D+
Wade, Dean	B+
Wagner, Franz	B
Wagner, Moritz	D+
Wainright, Ish	B-
Walker, Jarace	B-
Walker, Jabari	C+
Walker, Lonnie IV	D
Wallace, Cason	A-
Walsh, Jordan	B-
Ware, Kel'el	B-
Warren, T.J.	C-
Washington, PJ	B
Washington, TyTy Jr.	C-
Watanabe, Yuta	C
Watson, Peyton	B+
Watford, Trendon	C
Weaver, Jared	C
Weems, Romeo	C
Wells, Jaylen	B
Wembanyama, Victor	A+
Wesley, Blake	B-
Westbrook, Russell	B-
Whitehead, Dariq	C-
White, Coby	D+
White, Derrick	A
Wiggins, Andrew	B
Wiggins, Aaron	B
Williams, Amari	C
Williams, Alondes	C-
Williams, Brandon	C-
Williams, Cody	C
Williams, Grant	B
Williams, Jalen	B+
Williams, Jaylin	B
Williams, Kenrich	B
Williams, Malik	C-
Williams, Mark	B
Williams, Nate	C-
Williams, Patrick	B
Williams, Robert III	B+
Williams, Vince Jr.	B+
Williamson, Zion	C-
Windler, Dylan	C-
Wiseman, James	D+
Wood, Christian	D
Wright, Delon	B+
Yabusele, Guerschon	C+
Young, Thaddeus	B-
Young, Trae	D+
Yurseven, Omer	C-
Zeller, Cody	C-
Zubac, Ivica	B+
`.trim();

const VALID_GRADES = new Set<DefenseGrade>([
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
]);

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const userKey = (last: string, first: string) =>
  normalizeKey(`${first}${last}`);

const playerKey = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) {
    return normalizeKey(name);
  }

  const last = parts.at(-1) ?? "";
  const first = parts.slice(0, -1).join(" ");
  return userKey(last, first);
};

const FIRST_NAME_ALIASES: Record<string, string> = {
  herb: "herbert",
};

const stripNameSuffix = (value: string) =>
  value.replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, "").trim();

const firstNameMatches = (userFirst: string, poolFirst: string) => {
  const user = normalizeKey(userFirst);
  const pool = normalizeKey(poolFirst);

  if (user === pool) {
    return true;
  }

  if (user.length >= 3 && pool.startsWith(user)) {
    return true;
  }

  if (pool.length >= 3 && user.startsWith(pool)) {
    return true;
  }

  const alias = FIRST_NAME_ALIASES[user];
  return Boolean(alias && normalizeKey(alias) === pool);
};

const lastNameMatches = (userLast: string, poolLast: string) =>
  normalizeKey(stripNameSuffix(userLast)) === normalizeKey(stripNameSuffix(poolLast));

const findCandidates = (last: string, first: string) => {
  const key = userKey(last, first);
  const direct = poolByKey.get(key) ?? [];

  if (direct.length > 0) {
    return direct;
  }

  return players
    .filter((player) => player.bbrPlayerId)
    .filter((player) => {
      const parts = player.name.trim().split(/\s+/);
      const poolLast = parts.at(-1) ?? "";
      const poolFirst = parts.slice(0, -1).join(" ");
      return lastNameMatches(last, poolLast) && firstNameMatches(first, poolFirst);
    })
    .map((player) => ({
      bbrPlayerId: player.bbrPlayerId!,
      name: player.name,
    }));
};

const poolByKey = new Map<string, { bbrPlayerId: string; name: string }[]>();

for (const player of players) {
  if (!player.bbrPlayerId) {
    continue;
  }

  const key = playerKey(player.name);
  const entries = poolByKey.get(key) ?? [];
  entries.push({ bbrPlayerId: player.bbrPlayerId, name: player.name });
  poolByKey.set(key, entries);
}

const overrides: Record<string, DefenseGrade> = {};
const matched: Array<{ user: string; player: string; grade: DefenseGrade }> = [];
const unmatched: string[] = [];
const ambiguous: string[] = [];

for (const line of USER_GRADES.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed) {
    continue;
  }

  const tabParts = trimmed.split("\t");
  if (tabParts.length < 2) {
    unmatched.push(trimmed);
    continue;
  }

  const [namePart, gradePart] = tabParts;
  const grade = gradePart.trim() as DefenseGrade;

  if (!VALID_GRADES.has(grade)) {
    unmatched.push(`${namePart} (invalid grade: ${gradePart})`);
    continue;
  }

  const commaIndex = namePart.indexOf(",");
  if (commaIndex === -1) {
    unmatched.push(namePart);
    continue;
  }

  const last = namePart.slice(0, commaIndex).trim();
  const first = namePart.slice(commaIndex + 1).trim();
  const key = userKey(last, first);
  const candidates = findCandidates(last, first);

  if (candidates.length === 0) {
    unmatched.push(namePart);
    continue;
  }

  if (candidates.length > 1) {
    ambiguous.push(`${namePart} -> ${candidates.map((c) => c.name).join(" | ")}`);
  }

  const pick = candidates[0];
  overrides[pick.bbrPlayerId] = grade;
  matched.push({ user: namePart, player: pick.name, grade });
}

const outputPath = new URL("../data/defensive-grade-overrides.json", import.meta.url);
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      source: "user-provided defensive rankings",
      generatedAt: new Date().toISOString(),
      matchedCount: matched.length,
      overrides,
    },
    null,
    2,
  )}\n`,
);

console.log(`Matched ${matched.length} players`);
console.log(`Unmatched (not in pool): ${unmatched.length}`);
if (unmatched.length) {
  console.log(unmatched.slice(0, 20).join("\n"));
}
if (ambiguous.length) {
  console.log(`Ambiguous: ${ambiguous.length}`);
  console.log(ambiguous.slice(0, 10).join("\n"));
}
