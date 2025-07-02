#!/bin/bash
# Test the bridge directly from host

echo "Testing Claude bridge directly..."

# Send a test request
REQUEST='{"command":"claude","args":["--version"],"env":{},"cwd":"/"}'

echo "Sending: $REQUEST"
echo ""
echo "Response:"
echo "$REQUEST" | nc -U /tmp/claude-bridge-persistent/claude-bridge.sock