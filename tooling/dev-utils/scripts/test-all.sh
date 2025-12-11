#!/usr/bin/env bash
# Запуск всех тестов во всех пакета
echo "[Warog tooling] Запуск тестов..."
pnpm -r --filter ./packages... run test
