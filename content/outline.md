# Outline

Scene by scene, restored from the first version of the deck: `presentations` commit `56b7388` (2026-09-22), the version given at the DevEx Chapter Roundtable. On-screen wording stays close to verbatim; the Spanish is a translation of it. **Source** is the page in `talks/soft-and-hard-guardrails/deck/pages/` at that commit. Status: *content* (original text restored, drawing still to come) or *designed*.

| PK | Scene | Act | Source | Form | Status |
| --- | --- | --- | --- | --- | --- |
| 01 | `title` | — | `slides.md` cover | `gravel` | designed |
| 02 | `definition` | I · The road | `01-definition.md` | `gravel` | content |
| 03 | `two-kinds` | I · The road | `02-soft-vs-hard.md` (cards + chips) | `gravel` → `paint` → `barrier` | content |
| 04 | `soft-examples` | II · Paint | `03-soft-examples.md` | `paint` | content |
| 05 | `soft-practice` | II · Paint | `04-soft-concrete.md` (Where / Rule + "None of them guarantees compliance") | `paint` | content |
| 06 | `refuses` | III · Barrier | `05-hard-section.md`, reworded after the roundtable: "When the tool says no", "part of the execution", plus determinism vs non-determinism (feedback from colleagues) | `barrier` | content |
| 07 | `surfaces` | III · Barrier | `06-hard-map.md` (four cards; closing line reworded: "Stages 1–3 stop bad code. Stage 4 stops the agent. Our harness can halt everything: workflows and processes have to be hard too.") | `barrier` → `stop` at step 4 (officer with STOP paddle, we halt) | content |
| 08 | `build` | III · Barrier | `07-hard-compile.md` (Where / Rule / Effect) | `dim` | content |
| 09 | `build-console` | III · Barrier | `08-console-compile.md` | `dim` | content |
| 10 | `commit-ci` | III · Barrier | `09-hard-commit-ci.md` (two tables) | `dim` | content |
| 11 | `adoption-console` | III · Barrier | `10-console-adoption.md` | `dim` | content |
| 12 | `agent` | III · Barrier | `11-hard-agent.md` (four refusals with their hooks) | `barrier` | content |
| 13 | `agent-console` | III · Barrier | `12-console-agent.md` (with compliant shapes) | `dim` | content |
| 14 | `philosophy` | III · Barrier | `13-hard-philosophy.md` | `barrier` | content |
| 15 | `takeaway` | IV · Black spot | `14-takeaway.md` | `barrier` → `steel` | content |
| 16 | `contact` | — | new, after Aligned's closing sheet | `mirador` | QR (`mailto:`) and the author's email |

The closing "What's our next soft → hard candidate?" scene from the concept deck was dropped: the original ends on the takeaway.

An earlier draft (commit `426918d`, 2026-09-19) defined guardrails as "automated or policy-driven constraints that prevent risky actions… They function like crash barriers: only triggering when a significant deviation from safe practices occurs." Not on screen; a candidate line for the speaker notes, since it is the road metaphor in the author's own words.

Concrete examples in the concept deck (`research/soft-and-hard-guardrails.txt`, from the ds-connect repo) are not on screen: `TreatWarningsAsErrors`, `MOD002` as error, NetArchTest boundary test, `eslint --max-warnings=0`, husky + commitlint, `openspec validate` in CI, and "`validate-design-system.sh` was a doc first".
