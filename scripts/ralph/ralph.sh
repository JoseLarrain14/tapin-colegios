#!/bin/bash

# Ralph Loop - Iterative AI Development
# Based on the Ralph Wiggum technique by Geoffrey Huntley
# https://ghuntley.com/ralph/

set -e

MAX_ITERATIONS=${1:-10}
ITERATION=0
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"
PROMPT_FILE="scripts/ralph/prompt.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Ralph Loop Starting${NC}"
echo -e "${BLUE}  Max iterations: ${MAX_ITERATIONS}${NC}"
echo -e "${BLUE}========================================${NC}"

# Check for required files
if [ ! -f "$PRD_FILE" ]; then
    echo -e "${RED}Error: $PRD_FILE not found${NC}"
    echo "Create a prd.json file with your user stories first."
    exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo -e "${RED}Error: $PROMPT_FILE not found${NC}"
    exit 1
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
fi

# Get branch name from PRD
BRANCH_NAME=$(cat "$PRD_FILE" | jq -r '.branchName // "feature/ralph-work"')

# Create feature branch if not already on it
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo -e "${YELLOW}Creating/switching to branch: $BRANCH_NAME${NC}"
    git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi

# Main loop
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Iteration $ITERATION of $MAX_ITERATIONS${NC}"
    echo -e "${GREEN}========================================${NC}"

    # Check if all stories are complete
    INCOMPLETE=$(cat "$PRD_FILE" | jq '[.userStories[] | select(.passes != true)] | length')

    if [ "$INCOMPLETE" -eq 0 ]; then
        echo -e "${GREEN}All stories complete!${NC}"
        echo "<promise>COMPLETE</promise>"
        exit 0
    fi

    echo -e "${YELLOW}Remaining stories: $INCOMPLETE${NC}"

    # Run Claude with the prompt
    echo -e "${BLUE}Spawning Claude instance...${NC}"

    # Use claude -p (print mode) with permissions for tools
    claude -p "$(cat $PROMPT_FILE)" \
        --dangerously-skip-permissions \
        --allowedTools "Bash,Read,Write,Edit,Glob,Grep" \
        --verbose \
        --output-format stream-json

    # Log iteration
    echo "Iteration $ITERATION completed at $(date)" >> "$PROGRESS_FILE"

    # Small delay between iterations
    sleep 2
done

echo -e "${YELLOW}Max iterations ($MAX_ITERATIONS) reached${NC}"
echo "Check prd.json for remaining incomplete stories:"
cat "$PRD_FILE" | jq '.userStories[] | select(.passes != true) | {id, title}'
