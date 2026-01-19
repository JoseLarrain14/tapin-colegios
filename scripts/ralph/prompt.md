# Ralph Iteration Prompt - Casino Escolar Tap In

You are implementing user stories from `prd.json` for a school cafeteria system.

## Your Task

1. **Read Context**:
   - `prd.json` - Find highest priority story where `passes: false`
   - `progress.txt` - Learnings from previous iterations
   - `AGENTS.md` - Project patterns and conventions

2. **Implement ONE Story**:
   - Follow acceptance criteria exactly
   - Use existing patterns from the codebase
   - Keep changes minimal and focused

3. **Quality Checks** (run these):
   ```bash
   cd packages/api && npx tsc --noEmit    # API typecheck
   cd apps/admin && npx tsc --noEmit      # Admin typecheck
   pnpm build:api                          # Build API
   pnpm build:admin                        # Build Admin
   ```

4. **If Checks Pass**:
   - Commit changes with descriptive message
   - Update `prd.json`: set `passes: true` for completed story
   - Append learnings to `progress.txt`
   - Update `AGENTS.md` with any discovered patterns/gotchas

5. **If Checks Fail**:
   - Fix the errors
   - Re-run checks
   - Only commit when all checks pass

## Project Structure

```
packages/api/src/routes/     # API endpoints
apps/admin/app/(dashboard)/  # Admin pages
apps/mobile/app/             # Mobile screens
```

## Important Rules

- **ONE story per iteration** - Stop after completing one story
- **Small commits** - Atomic commits for each story
- **No breaking changes** - Existing functionality must keep working
- **TypeScript strict** - No `any` types, proper typing
- **Follow patterns** - Check AGENTS.md and existing code

## When Complete

When ALL stories have `passes: true`:
```
<promise>COMPLETE</promise>
```

## When Blocked

If you cannot complete a story:
1. Document the blocker in `progress.txt`
2. Do NOT mark as complete
3. Continue to next story if possible

---

Now read `prd.json` and implement the next incomplete story.
