#!/usr/bin/env bash
set -euo pipefail

# Find a .glb in repo root
glb=""
if [ -f "Zayka.glb" ]; then
  glb="Zayka.glb"
else
  glb=$(ls *.glb 2>/dev/null | head -n1 || true)
fi

if [ -z "$glb" ]; then
  echo "No .glb file found in repo root. Place a GLB (e.g. Zayka.glb) at repo root and re-run."
  exit 0
fi

if command -v gltfpack >/dev/null 2>&1; then
  mkdir -p optimized
  out="optimized/${glb%.}.opt.glb"
  echo "Optimizing $glb -> $out"
  gltfpack -i "$glb" -O "$out" -c 10 --draco
  echo "Optimized file at $out"
else
  echo "gltfpack not found in PATH. For local optimization:"
  echo "1) Install gltfpack (https://github.com/zeux/meshoptimizer)."
  echo "2) Run: gltfpack -i Zayka.glb -O optimized/Zayka.opt.glb -c 10 --draco"
  echo "This workflow will upload 'optimized' folder as artifact if present."
  exit 0
fi
