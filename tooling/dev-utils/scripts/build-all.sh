#!/usr/bin/env bash
# Полная сборка всех пакетов Warog
echo "[Warog tooling] Сборка всех пакетов..."
pnpm -r --filter ./packages... run build
