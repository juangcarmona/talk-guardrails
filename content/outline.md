# Outline

Scene by scene. It started from the first version of the deck: `presentations` commit `56b7388` (2026-09-22), the version given at the DevEx Chapter Roundtable. On-screen wording stays close to verbatim; the Spanish is a translation of it. **Source** is the page in `talks/soft-and-hard-guardrails/deck/pages/` at that commit. Status: *content* (original text restored, drawing still to come) or *designed*.

| PK | Scene | Act | Source | Form | Status |
| --- | --- | --- | --- | --- | --- |
| 01 | `title` | — | `slides.md` cover | `gravel` | designed |
| 02 | `definition` | I · The road | `01-definition.md`, reworded | `gravel` | rewritten |
| 03 | `two-kinds` | I · The road | `02-soft-vs-hard.md` (cards + chips) | `gravel` → `paint` → `barrier` | rewritten |
| 04 | `determinism` | I · The road | new: the same change ten times, against `AGENTS.md` and against an architecture test; quote from the Claude Code hooks docs | `paint` → `barrier` | new |
| 05 | `soft-examples` | II · Paint | `03-soft-examples.md` | `paint` | rewritten |
| 06 | `soft-practice` | II · Paint | `04-soft-concrete.md`, plus a "who checks it" column | `paint` | rewritten |
| 07 | `soft-code` | II · Paint | new: an `AGENTS.md` rule and the controller that breaks it, everything green | `paint` | new |
| 08 | `refuses` | III · Barrier | `05-hard-section.md`, reworded | `barrier` | rewritten |
| 09 | `surfaces` | III · Barrier | `06-hard-map.md` | `stones` → `logs` → `barrier` → `stop` | rewritten |
| 10 | `commit-ci` | III · Barrier | `09-hard-commit-ci.md`, with the tools named; now levels 1 and 2 | `dimStones` → `dimLogs` | rewritten |
| 11 | `adoption-console` | III · Barrier | `10-console-adoption.md` (level 2, CI) | `dimLogs` | rewritten |
| 12 | `build` | III · Barrier | `07-hard-compile.md`, plus `TreatWarningsAsErrors` and `MOD002` from the concept deck; now level 3 | `dim` | rewritten |
| 13 | `build-console` | III · Barrier | `08-console-compile.md`, plus the build output | `dim` | rewritten |
| 14 | `agent` | III · Barrier | `11-hard-agent.md` | `stop` | rewritten |
| 15 | `agent-hook` | III · Barrier | new: the `PreToolUse` hook behind `no-piped-verdicts` (settings + script, exit 2) | `dim` | new |
| 16 | `agent-console` | III · Barrier | `12-console-agent.md` | `dim` | rewritten |
| 17 | `philosophy` | III · Barrier | `13-hard-philosophy.md` | `barrier` | rewritten |
| 18 | `takeaway` | IV · Black spot | `14-takeaway.md`, plus the black-spot criterion | `barrier` → `steel` | rewritten |
| 19 | `contact` | — | new, after Aligned's closing sheet | `mirador` | QR (`mailto:`) and the author's email |

The closing "What's our next soft → hard candidate?" scene from the concept deck was dropped: the original ends on the takeaway.

An earlier draft (commit `426918d`, 2026-09-19) defined guardrails as "automated or policy-driven constraints that prevent risky actions… They function like crash barriers: only triggering when a significant deviation from safe practices occurs." Not on screen; a candidate line for the speaker notes, since it is the road metaphor in the author's own words.

Concrete examples in the concept deck (`research/soft-and-hard-guardrails.txt`, from the ds-connect repo) are not on screen: `TreatWarningsAsErrors`, `MOD002` as error, NetArchTest boundary test, `eslint --max-warnings=0`, husky + commitlint, `openspec validate` in CI, and "`validate-design-system.sh` was a doc first".

## Research behind the rewrite

- Claude Code docs, hooks guide: hooks give "deterministic control: certain actions always happen rather than relying on the LLM to choose to run them"; exit code 2 blocks the action. https://code.claude.com/docs/en/hooks-guide
- Birgitta Böckeler, "Harness engineering for coding agent users", martinfowler.com, 2 April 2026: guides (feedforward) and sensors (feedback); computational controls are "deterministic and fast", inferential ones are slower and non-deterministic. https://martinfowler.com/articles/harness-engineering.html
- "Deterministic guardrails: prompts steer, hooks enforce", dev.to: "A prompt is the channel that can only ask. A gate is the channel that can refuse." https://dev.to/reporails/deterministic-guardrails-prompts-steer-hooks-enforce-14ag
