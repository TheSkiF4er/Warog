#!/usr/bin/env bash
# Очистка артефактов сборки
echo "[Warog tooling] Очистка dist и coverage..."
find . -name "dist" -type d -prune -exec rm -rf {} +
find . -name "coverage" -type d -prune -exec rm -rf {} +
