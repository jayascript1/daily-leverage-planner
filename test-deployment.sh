#!/bin/bash

# Test script for Vercel MCP deployment
# Usage: ./test-deployment.sh https://your-project.vercel.app

BASE_URL="${1:-https://your-project.vercel.app}"

echo "Testing MCP Server at: $BASE_URL"
echo "=================================="
echo ""

echo "1. Testing POST /mcp (tool definitions)..."
curl -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received (install jq for pretty printing)"
echo ""

echo "2. Testing POST /mcp/generate_leverage_plan..."
curl -X POST "$BASE_URL/mcp/generate_leverage_plan" \
  -H "Content-Type: application/json" \
  -d '{"goals":"Test goal for today","constraints":"No time constraints"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

echo "3. Testing POST /mcp/export_daily_brief..."
curl -X POST "$BASE_URL/mcp/export_daily_brief" \
  -H "Content-Type: application/json" \
  -d '{"ranked_actions":["Action 1","Action 2"],"rationale_summary":"Test rationale","date":"2024-01-01"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

echo "4. Testing CORS headers..."
curl -X OPTIONS "$BASE_URL/mcp" \
  -H "Origin: https://chat.openai.com" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep -i "access-control" || echo "CORS headers check"
echo ""

echo "=================================="
echo "Tests complete!"


