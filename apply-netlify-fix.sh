#!/usr/bin/env bash
set -e

cp package.json package.json.backup-before-netlify-fix
rm -f package-lock.json
echo "package-lock.json lama dihapus. Commit package.json dan penghapusan lockfile ke GitHub."
