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
| Our car, just ahead of the camera | A red open roadster seen from behind, two heads over the windscreen, solid cells with a glyph in each; leans out of the bends, brake lights at the stop | Us, driving the change: the protagonist of the talk |
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
| `barrier` | Every bend that matters; straights still open to the ravine | Hard act |
| `steel` | The whole ravine | The black spot, after: paint became steel |
| `dim` | As `road`, dimmed and slower | Text-heavy sheets |
| `parked` | The whole ravine, no traffic | Closing question, at night |

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
