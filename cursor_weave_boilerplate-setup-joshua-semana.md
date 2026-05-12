# Weave dashboard fix implementation
_Exported on 5/12/2026 at 15:34:59 MDT from Cursor (3.3.30)_

---

**User**

Implement @/tmp/weave-dashboard-fix.md 

---

**Cursor**

Reading the fix specification and exploring the codebase to implement it.



Checking `types/index.ts` for compatibility with the corrected route.



Replacing `route.ts` with the spec's version (removes `pr.additions` / `pr.deletions` / `pr.changed_files` from list responses; uses `listFiles` for file counts).



Here is what was implemented from `/tmp/weave-dashboard-fix.md`.

### Updates in `app/api/analyze/route.ts`

1. **Stopped using list PR fields** — No more `pr.additions`, `pr.deletions`, or `pr.changed_fields` from `octokit.rest.pulls.list()` (they are not on that response type).

2. **`filesChanged` per engineer** — Count comes from `octokit.rest.pulls.listFiles()` per PR, summed on the author (and directories still come from those filenames).

3. **`codeImpact` in metrics** — Now `Math.round(avgFilesPerPR)` where `avgFilesPerPR = filesChanged / prsMerged` (0 if no merged PRs).

4. **Impact score** — Replaced the log of LOC with `Math.min(avgFilesPerPR, 20) * 2` so large file counts cannot dominate the score.

5. **Reasoning** — Added a line when `avgFilesPerPR > 10` about substantial multi-file PRs.

`npm run build` completes successfully with TypeScript clean.

