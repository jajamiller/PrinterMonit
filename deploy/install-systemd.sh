#!/bin/bash
set -euo pipefail

PROJECT_ROOT="/root/savepage"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

install_backend_service() {
  cat > /etc/systemd/system/printer-monitor-backend.service <<EOF
[Unit]
Description=Printer Monitor API (FastAPI)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$(command -v uvicorn) app.main:app --host 0.0.0.0 --port 8002
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
}

install_frontend_service() {
  cat > /etc/systemd/system/printer-monitor-frontend.service <<EOF
[Unit]
Description=Printer Monitor Frontend (Vite)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$FRONTEND_DIR
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$(command -v npm) run dev -- --host 0.0.0.0
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
}

reload_and_enable() {
  systemctl daemon-reload
  systemctl enable --now printer-monitor-backend printer-monitor-frontend
}

main() {
  install_backend_service
  install_frontend_service
  reload_and_enable
  systemctl status printer-monitor-backend printer-monitor-frontend --no-pager
}

main "$@"
