#!/bin/bash
source ./.env
# Define source and destination directories
SRC_DIR="./"
DEST_DIR="${RELATIVE_NGRID_PATH:-../ngrid/node_modules/ng-cli-packagr-tasks}"

# Ensure the destination directory is removed before copying
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

# Use rsync to copy files while excluding specified patterns
rsync -av --progress "$SRC_DIR/" "$DEST_DIR" \
  --exclude="tsconfig.json" \
  --exclude="examples" \
  --exclude="src/**/*.ts" \
  --exclude="publish-copy.js" \
  --exclude=".vscode" \
  --exclude="node_modules" \
  --exclude="yarn.lock" \
  --exclude=".DS_Store"

# # Output completion message
echo "Copy completed successfully!"
