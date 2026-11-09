# Visual thread

*Aligned* runs a glyph point cloud on a blueprint under every scene. This talk keeps the glyph technique and the sheet chrome, drops the grid, and changes the subject: **a drive over a mountain pass, from sunset to night, drawn in glyphs** (`. : - = + x * # @ | ^ < >`).

## The pass

Seen from the driver's seat. We drive on the right, as in Spain: the rock wall on the left, the ravine on our right. The road winds (two sines on the map, a gentle rise and fall), the ridges turn as the road turns, and we never stop moving.

| Element | Drawing | Means |
| --- | --- | --- |
| Edge lines and dashed centre line | `-` `=` in road white, blue when lit | Soft guardrails: they tell you where to go, you can drive over them |
| Curve chevrons (*paneles direccionales*) on the outside of the sharp bends | Blue panel, white `<` `>`, retroreflective glow at night | Soft guardrails too: a warning, however bright, does not hold the car |
| W-beam barrier between the road and the ravine | `#` `=` `@` in red and white 2 m panels, `|` posts, amber reflector `*` | Hard guardrails: they stop you |
| Rock wall and scree | A solid, opaque face (taller, 10 m), hazing towards the far ridge with distance; shrubs on top and at its foot | The mountain: what is at stake if you leave the road |
| The close pass (three outcomes) | With nothing at the edge the lorry takes the middle and we go over on a bend: the car tips off the lip, GAME OVER, CONTINUE? 3-2-1, and we start again. With paint the lorry keeps its side and we usually hold the lip, but now and then a bend puts us over. With hard protection we tuck in short of it; only on a close one (sharp bend or bad luck, about one pass in three) do we hit it and get thrown back in: concrete chips off the kerb, splinters off timber, sparks off steel | Nothing, soft, hard: the same scare, three endings |
| Our car, just ahead of the camera | A red 911 Carrera S (992) from behind, drawn with shapes: hips swelling over the rear wheels, fastback roof and big rear window with the two of us, louvred engine grille with the vertical third brake light, thin light bar across the tail, black diffuser with two oval tailpipes. No badges | Us, driving the change |
| Dials, bottom right | Speedometer to 320 km/h and a rev counter to 8000 rpm with the redline, the gear and the digital speed | The pace of the drive | Us, driving the change: the protagonist of the talk |
| Tail lights ahead, headlights oncoming | `*` `@` red and amber | Changes moving through the system (later: the agent) |
| Ridges, sun glow, stars, village lights in the valley | Silhouettes, `.` `+` `*` | The light, never content |

## The light walks with the talk

The sheet number sets the hour: **PK 01 is sunset, the last sheet is night.** The sky goes from orange and violet to black with stars, the sun's glow sinks behind the ridges, village lights come on in the valley. At night the paint is only visible where the headlights reach, while the chevrons and the barrier's reflectors glow: in the dark, you depend on what was built into the road.

## The barrier grows where it is needed

Each form says how much of the road the barrier covers, measured by how sharp the bend is:

| Form | Barrier | Used for |
| --- | --- | --- |
| `gravel` | None, and no paint or signs: an unmade track of loose stone, lorries coming | Title, definition, first step of two kinds |
| `road` | Only the sharpest bends | (spare) |
| `paint` | None; paint and chevrons in blue | Soft act |
| `stones` | Hard level 1: a raised concrete kerb along the bends | Surfaces 1 · Commit, commit sheet (`dimStones`) |
| `logs` | Hard level 2: timber fence, the mountain kind | Surfaces 2 · CI, CI sheets (`dimLogs`) |
| `barrier` | Hard level 3: steel W-beam on every bend that matters | Surfaces 3 · Build, build sheets, refuses, philosophy |
| `stop` | Hard level 4: the officer stops us | Surfaces 4 · Agent, agent harness |
| `steel` | The whole ravine | The black spot, after: paint became steel |
| `dim` | As `road`, dimmed and slower | Text-heavy sheets |
| `parked` | The whole ravine, no traffic | (spare) |
| `mirador` | The car pulls in at a viewpoint and the camera pans right onto the bay: full moon, its silver road on the water, a dark headland with a lighthouse, the town lit along the shore, the car parked against the parapet | Closing: write to me |

That is the talk in one picture: the road authority puts steel first on the bends where people go over, and the bends where it keeps happening (the *punto negro*) are where a soft rule must become hard.

Forms still to draw: a car crossing the line on a bend with no barrier (`soft-practice`); four kilometre posts for the four enforcement surfaces (`surfaces`); a driverless car meeting the barrier (`agent`); paint turning into steel on one bend (`takeaway`).

## Colour code

From Spanish road signs, so it reads without a legend.

| Token | Hex | Meaning |
| --- | --- | --- |
| `--soft` | `#5b8cff` | Blue: indication, chevron panels. Soft |
| `--hard` | `#f2384f` | Red: prohibition, barrier panels. Hard |
| `--amber` | `#ffb21c` | Retroreflective attention: chrome, labels, reflectors |
| `--paint` | `#eef0f2` | Road paint and ink |
| Sky | `#1d2b4f` → `#f08a4b` at sunset, `#04060b` at night | The hour of the talk (`src/road/palette.ts`) |

## Sheet chrome

- No grid. Amber corner marks only; the sky and the road are the background.
- **Chapter bar by act**: amber line (the road), dashed blue lane paint (soft), red and white barrier (hard).
- **Sheet number as a kilometre post** (*hito kilométrico*): white plate with a red top band, `PK 03/16`.
- Title words wear their marking: *Soft* underlined with lane dashes, *Hard* with barrier panels.
- Plates: blue rectangle for soft, white disc with red ring for hard, as on traffic signs.

## Coast road, traffic and the stop (second pass)

- **A coast road on a 400 m sea cliff.** The mountain wall stays on the left; on the right, past a narrow verge and the barrier, the cliff edge and the sea far below. No headlands across the water: seen from 400 m up their faces hung below the horizon and read as reflections. Our own cliff face shows on the outside of bends ahead, fading into sea haze. The sun is white-hot at the core with a gold bloom and a band of fire along the horizon; it sinks into the sea and turns deep orange as the talk goes on. Its reflection is a gold column about as wide as the disc, broken into glittering streaks, with a bright seam at the horizon. At night a moon behind us lights the scene faintly: cooler, lighter rock and asphalt, a blue haze off the horizon, silver sparkle on the water, silvered ridge lines and edges; boats' lights at night. Mountains only on the land side.
- **Narrow shoulders**: a hand's width at the foot of the cut, a step between the edge line and the barrier.
- **Oncoming traffic**: cars, a motorbike and two lorries on a loop. Dipped beams from sunset, full glare and a pool of light at night. Nothing drives ahead of us.
- **The flinch**: when a lorry bears down it drifts over the centre line, we pull right with our wheels over the edge line, lean towards the drop, shudder, and gravel flies. Lorries only appear where nothing would stop us (the opening and the soft scenes, low `coverage`); once the hard barrier is up there are no lorries at all.
- **Narrowings**: every 170 m a rockfall takes two metres of the oncoming lane. P-17a warning triangle forty metres before, solid centre line, fallen rock at the foot of the cut.
- **The stop** (`surfaces`, step 4, form `stop`): a traffic officer in a reflective vest steps into our lane with a STOP paddle, the patrol car flashes blue on the shoulder, traffic clears, and we halt. Stage 4: the harness can stop the agent.

## The lorry script

Lorries no longer come round on a loop. Each sheet lists its own in `src/scenes.tsx` (`traffic`): when the lorry appears, in seconds after the sheet opens, and how the pass ends. `crash` waits for a left-hand bend, where we are on the outside; steel never lets us over.

| Sheet | Lorries |
| --- | --- |
| `title` | 15 s a scare we survive; 50 s over the edge |
| `definition` | 4 s over the edge (it waits for the bend) |
| `soft-examples` | 12 s a scare; 45 s over the edge |
| `soft-code` | 14 s over the edge, right after "everything green" |
| `refuses` | 4 s into the barrier: sparks, back in |
| `surfaces` | 10 s a scare; 32 s into the protection |
| `philosophy` | 10 s into the barrier |
| `takeaway` | 8 s a scare |
| everything else | none |

## The track

`src/road/track.ts` lays the road out once from a seed, as a 3.6 km loop: long straights, single bends, S-bends and runs of tight curves (each announced by a P-14 warning triangle), and climbs and descents of 4 to 8.5 %. The car is driven with a simple model: it pulls up to 200 km/h and beyond on the long straights, brakes at 8.5 m/s² so it reaches each bend at that bend's speed (about 60 km/h in the tightest), accelerates out, loses pull on climbs and changes gear through a seven-speed box. One metre of the road on screen stands for 2.5 m of driving. Text-heavy sheets cap the top speed; the stop brings it to zero.

## Opening, stop and closing (one continuous shot)

- **Opening** (`title`, form `start`): the car parked on a straight stretch of the gravel track, from behind, the sun over the sea. Nothing moves and INSERT COIN · PRESS M blinks top right until the first M; then the engine catches with a puff from the tailpipes and we pull away.
- **The car is a flat picture**: a static drawing of the 992 Carrera S from behind, the same size and place on the screen all the way. It does not turn with the road or bob; it only shudders when it hits a barrier and tips when it goes over. Its paint keeps its colour after dark. The car brakes before each bend, down to the speed of its tightest point by the time the bend begins.
- **The police** (`stop`): when the stage-4 sheet comes up, a lay-by opens on the sea side at the far end of the visible road, with the patrol car in it and the officer at its mouth holding up STOP. We brake to rest a few metres short of him. It happens twice: the four surfaces sheet and the agent harness sheet.
- **Closing** (`contact`, form `mirador`): we look for the next straight, a P sign and a lay-by over the bay at its end; the car pulls across into it and stops, and the camera turns right, away from the parked car, out over the bay: the full moon over the water, the QR and email on the left.
- **M**, in either window: the first press starts the game (the coin); after that it freezes the drive (a small PAUSE · M mark shows above the dials) and starts it again.
