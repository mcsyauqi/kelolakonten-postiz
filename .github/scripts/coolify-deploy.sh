#!/usr/bin/env bash
# Picu deploy satu aplikasi Coolify (dengan coba ulang) dan cetak nomor deployment-nya.
# Token di sini hanya punya izin deploy, jadi status build tidak bisa dibaca dari sini:
# cek hasilnya di situs live (marketing ~1 menit, app ~25 menit) atau di dashboard Coolify.
# Pemakaian: TOKEN=... COOLIFY=https://coolify.mcsyauqi.com/api/v1 bash coolify-deploy.sh <app-uuid>
set -euo pipefail
uuid="$1"
for i in 1 2 3 4 5; do
  res=$(curl -sS -m 30 -X POST -H "Authorization: Bearer ${TOKEN}" "${COOLIFY}/deploy?uuid=${uuid}" || true)
  dep=$(echo "$res" | grep -o '"deployment_uuid":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [ -n "$dep" ]; then
    echo "Deploy dipicu untuk $uuid, deployment $dep"
    echo "### Deploy $uuid dipicu: \`$dep\`" >> "$GITHUB_STEP_SUMMARY"
    exit 0
  fi
  echo "deploy belum terpicu (percobaan $i): $res"; sleep 15
done
echo "Gagal memicu deploy $uuid"; exit 1
