#!/bin/sh
set -e
# Apply migrations, then start the standalone server.
npx prisma migrate deploy
exec node server.js
