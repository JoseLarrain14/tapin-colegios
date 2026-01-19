# Ralph PRD Converter Skill

You convert markdown PRD documents into the JSON format required by Ralph Loop.

## Instructions

When given a PRD file path (e.g., `tasks/prd-feature-name.md`), you will:

1. **Read the PRD** markdown file
2. **Extract user stories** with their acceptance criteria
3. **Generate `prd.json`** in the project root

## Output Format

Create `prd.json` with this structure:

```json
{
  "projectName": "Feature Name",
  "branchName": "feature/feature-name",
  "description": "Brief description from the PRD overview",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "Detailed description of what needs to be done",
      "priority": 1,
      "acceptanceCriteria": [
        "First acceptance criterion",
        "Second acceptance criterion",
        "Third acceptance criterion"
      ],
      "passes": false
    }
  ]
}
```

## Field Mappings

| PRD Field | JSON Field |
|-----------|------------|
| Feature name | `projectName` |
| Feature name (kebab-case) | `branchName` prefix |
| Overview section | `description` |
| US-XXX stories | `userStories` array |
| Priority number | `priority` (1 = highest) |
| Acceptance criteria | `acceptanceCriteria` array |

## Rules

1. **All stories start with `passes: false`** - Ralph marks them true when complete
2. **Branch name format**: `feature/[feature-name-kebab-case]`
3. **Story IDs**: Keep the `US-XXX` format from the PRD
4. **Priority**: Lower number = higher priority (1 is first to implement)
5. **Order stories by priority** in the JSON array

## Workflow

1. User provides path to PRD: `convert tasks/prd-my-feature.md to prd.json`
2. You read the markdown file
3. You parse the user stories
4. You create `prd.json` in the project root
5. User can then run `./scripts/ralph/ralph.sh` or `/ralph-loop`

## Example

Given a PRD with:
```markdown
# PRD: User Settings

## Overview
Add a settings page for user preferences.

### US-001: Create Settings Route
**Priority:** 1
**Acceptance Criteria:**
- Settings page at /settings
- Navigation link added
```

Generate:
```json
{
  "projectName": "User Settings",
  "branchName": "feature/user-settings",
  "description": "Add a settings page for user preferences.",
  "userStories": [
    {
      "id": "US-001",
      "title": "Create Settings Route",
      "description": "Create the settings route and add navigation",
      "priority": 1,
      "acceptanceCriteria": [
        "Settings page at /settings",
        "Navigation link added"
      ],
      "passes": false
    }
  ]
}
```

## Ready

Provide the path to your PRD markdown file, and I'll convert it to `prd.json`.
