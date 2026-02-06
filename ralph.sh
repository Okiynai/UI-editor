#!/usr/bin/env zsh

set -e

if [ -z "$1" ]; then
	echo "Usage: $0 <Iterations> [--task <task-id>]"
	exit 1
fi

iterations="$1"
shift

task_id=""
while [ $# -gt 0 ]; do
	case "$1" in
		--task)
			shift
			task_id="$1"
			;;
		*)
			echo "Unknown arg: $1"
			echo "Usage: $0 <Iterations> [--task <task-id>]"
			exit 1
			;;
	esac
	shift
done

extra_instructions=""
if [ -n "$task_id" ]; then
	extra_instructions="0. Work only on the task with id \"$task_id\". If it does not exist, stop and explain. "
fi

for ((i=1; i<=$iterations; i++)); do
	echo "Iteration $i"
	echo "-------------------------------------------"
	result=$(codex exec --full-auto --sandbox danger-full-access "@prd.json @progress.txt \
${extra_instructions}1. Find the highest-priority feature to work on and work only on that feature. Use the numeric \"prio\" field if present (lower number = higher priority). If there are no prio values, or all prio values are 3 or higher, re-assign priorities yourself first. \
This should be the one YOU decide has the highest priority - not necessarily the first in the list. \
2. Check that the types check via bun run typecheck and that the tests pass via bun run test. \
3. Update the PRD with the work that was done. \
4. Append your progress to the progress.txt file. \
Use this to leave a note for the next person working in the codebase. \
5. Make a git commit of that feature. \
ONLY WORK ON A SINGLE FEATURE. \
If, while implementing the feature, you notice the PRD is complete, output <promise>COMPLETE</promise>. \
")

	echo "$result"

	if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
		echo "PRD Compelete, Exiting..."
		exit 0
	fi
done
