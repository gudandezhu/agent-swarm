#!/bin/bash
set -e

export PATH="$HOME/.bun/bin:$PATH"

echo "Building CLI with Bun..."
bun build src/cli.ts --outfile dist/cli.js --target bun

echo "Adding shebang..."
echo '#!/usr/bin/env bun' | cat - dist/cli.js > temp-cli.js
mv temp-cli.js dist/cli.js

echo "Setting executable permission..."
chmod +x dist/cli.js

echo "Building type definitions..."
tsc --emitDeclarationOnly

echo "✓ Build complete!"
