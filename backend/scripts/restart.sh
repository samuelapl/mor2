#!/bin/bash
# Restart the LMS backend on a fixed port. Use this after every backend rebuild
# so the running process matches dist/ (the guard fix lives in dist/src/...).
cd "$(dirname "$0")/.." || exit 1
pkill -f "dist/.*main.js" 2>/dev/null
pkill -f "node dist/main.js" 2>/dev/null
sleep 2
PORT=3001 nohup node dist/src/main.js >/tmp/lms-backend.log 2>&1 &
echo "started pid $!"
for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/docs-json 2>/dev/null)
  [ "$code" = "200" ] && { echo "UP on 3001 (docs-json 200)"; exit 0; }
  sleep 1
done
echo "WARN not up; last code=$code; tail log:"; tail -5 /tmp/lms-backend.log; exit 1
