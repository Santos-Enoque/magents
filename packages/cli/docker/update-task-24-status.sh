#!/bin/bash

# Script to update Task 24 status in Task Master
# Run this from the project root: /Users/santossafrao/Development/personal/magents

echo "Updating Task 24 status in Task Master..."
echo "========================================="

# Check if we're in the right directory
if [ ! -f ".taskmaster/tasks/tasks.json" ]; then
    echo "❌ Error: Not in project root directory"
    echo "Please run this script from: /Users/santossafrao/Development/personal/magents"
    exit 1
fi

echo "✅ Found Task Master configuration"

# Update all subtasks to done
echo "📝 Marking subtasks as completed..."

echo "   Updating Task 24.2 (Progressive complexity modes)..."
task-master set-status --id=24.2 --status=done

echo "   Updating Task 24.3 (Assign command)..."
task-master set-status --id=24.3 --status=done

echo "   Updating Task 24.4 (Start command)..."
task-master set-status --id=24.4 --status=done

echo "   Updating Task 24.5 (Utility features)..."
task-master set-status --id=24.5 --status=done

# Update main task to done
echo "📝 Marking main Task 24 as completed..."
task-master set-status --id=24 --status=done

echo ""
echo "✅ Task 24 status update complete!"
echo ""
echo "Verification:"
echo "============="
task-master show 24

echo ""
echo "🎉 Task 24 'Core CLI Commands Implementation' is now marked as DONE!"
echo ""
echo "All implemented features:"
echo "✅ Progressive complexity modes (simple/standard/advanced)"
echo "✅ Automatic task generation with 'magents assign'"
echo "✅ Container orchestration with 'magents start'"
echo "✅ Utility features (dry-run, progress indicators, interactive mode)"