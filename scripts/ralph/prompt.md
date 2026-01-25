# Ralph Iteration Prompt - Migración Next.js PWA

You are migrating a React Native mobile app to Next.js. The source code is in `apps/mobile/` and you're creating `apps/web/`.

## Your Task

1. **Read Context**:
   - `prd.json` - Find highest priority story where `passes: false`
   - `progress.txt` - Learnings from previous iterations
   - `AGENTS.md` - Project patterns and conventions

2. **IMPORTANT - Use Reference Code**:
   - Each story has a "Referencia:" field pointing to the mobile source file
   - **READ the mobile source file first** to understand the functionality
   - Adapt React Native patterns to React/Next.js patterns
   - Preserve business logic, change only UI layer

3. **Implement ONE Story**:
   - Follow acceptance criteria exactly
   - Use Tailwind CSS for styling (no StyleSheet)
   - Use Next.js App Router conventions
   - Keep changes minimal and focused

4. **Quality Checks** (run these):
   ```bash
   cd apps/web && npx tsc --noEmit    # Typecheck
   cd apps/web && pnpm build          # Build
   ```

5. **If Checks Pass**:
   - Commit changes with descriptive message
   - Update `prd.json`: set `passes: true` for completed story
   - Append learnings to `progress.txt`
   - Update `AGENTS.md` with any discovered patterns/gotchas

6. **If Checks Fail**:
   - Fix the errors
   - Re-run checks
   - Only commit when all checks pass

## Migration Mappings

### React Native → React/Next.js
| React Native | Next.js |
|--------------|---------|
| `View` | `<div>` |
| `Text` | `<p>`, `<span>`, `<h1-h6>` |
| `TouchableOpacity` | `<button>` |
| `TextInput` | `<input>` |
| `Image` | `next/image` |
| `ScrollView` | `<div className="overflow-y-auto">` |
| `StyleSheet.create()` | Tailwind classes |
| `router.push()` (expo-router) | `router.push()` (next/navigation) |
| `useLocalSearchParams()` | `useSearchParams()` |
| `SecureStore` | `localStorage` |

### Project Structure

```
apps/mobile/             # SOURCE (reference)
├── app/                 # Screens
├── src/components/      # Components
├── src/services/        # API service
├── src/store/           # Zustand stores
├── src/utils/           # Utilities
└── src/constants/       # Theme

apps/web/                # TARGET (create here)
├── src/app/             # Pages (App Router)
│   ├── (auth)/          # Login, register
│   └── (dashboard)/     # Protected pages
├── src/components/      # UI components
├── src/lib/             # API, storage, utils
├── src/store/           # Zustand stores
└── src/utils/           # Date formatters, etc.
```

## Important Rules

- **ONE story per iteration** - Stop after completing one story
- **Small commits** - Atomic commits for each story
- **Read mobile source** - Always check the reference file
- **TypeScript strict** - No `any` types, proper typing
- **Tailwind only** - No inline styles or CSS modules
- **Follow patterns** - Check existing web components for consistency

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
