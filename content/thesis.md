# Thesis

**Talk:** Soft & Hard Guardrails (EN) · Guardarraíles blandos y duros (ES)
**Speaker:** Juan G. Carmona, Software Development Engineer at Plain Concepts
**Source deck:** `presentations/talks/soft-and-hard-guardrails` (DevEx Chapter Roundtable, 2026)

## The idea in one sentence

> Guardrails keep changes within acceptable boundaries; soft ones guide and depend on someone choosing to follow them, hard ones are part of the execution path and refuse. When a rule matters enough, make it executable, and when agents do the work, guard the verdicts as well as the code.

## What the audience takes home

1. **Two kinds.** Soft guardrails guide (docs, ADRs, `AGENTS.md`, warnings, checklists). Hard guardrails block (compiler, analyzers as errors, hooks, required CI checks, harness policies).
2. **Four enforcement surfaces.** Build, commit, CI/merge, and the agent harness. The first three guard the code; the fourth guards the agent: its verdicts and its process.
3. **Soft to hard.** "Every soft guardrail is a hard one someone hasn't written yet." Promote the rules that matter; leave preferences as guidance.

## The metaphor

A road at night. Paint tells you where to drive and you can still cross it. A barrier does not ask. A *punto negro* (accident black spot) is where the road authority stops painting and installs steel: the same rule broken again and again is the signal to make it hard.
