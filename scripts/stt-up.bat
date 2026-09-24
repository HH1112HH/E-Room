@echo off
title E-Room AI services (STT + TTS + Pronun)
cd /d "%~dp0.."

echo ============================================
echo   E-Room AI - STT :8001 + TTS :8002 + Pronun :8005
echo   May nay chay dich vu AI, may BAN chay full stack
echo   Yeu cau: Docker Desktop (+ NVIDIA GPU cho STT)
echo ============================================
echo.

REM -- Step 1: env ---------------------------------------------
echo [1/3] Checking stt.env...
if not exist stt.env (
    copy stt.env.example stt.env >nul
    echo        Created stt.env (sua WHISPER__MODEL neu can).
) else (
    echo        stt.env exists, skipping.
)
if not exist demo\pronun-app\.env (
    copy demo\pronun-app\.env.example demo\pronun-app\.env >nul
    echo        Created demo\pronun-app\.env.
) else (
    echo        demo\pronun-app\.env exists, skipping.
)

REM -- Step 2: up -----------------------------------------------
echo [2/3] Starting stt-server + tts-server + pronun...
docker compose -f docker-compose.stt.yml up -d --build
if errorlevel 1 (
    echo        [ERROR] compose failed. Docker Desktop co dang chay?
    pause
    exit /b 1
)

REM -- Step 3: verify --------------------------------------------
echo [3/3] Doi server ready (lan dau tai model, vai phut)...
timeout /t 20 /nobreak >nul
curl -s http://localhost:8001/health
echo.
curl -s http://localhost:8005/api/health
echo.
echo.
echo        --- Dia chi cho may BAN goi sang (uu tien Tailscale, IP tinh vinh vien) ---
where tailscale >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=* " %%t in ('tailscale ip -4 2^>nul') do (
        echo        STT:    http://%%t:8001  ^<^<- dung cai nay
        echo        TTS:    http://%%t:8002
        echo        Pronun: http://%%t:8005
    )
) else (
    echo        [WARN] Chua cai Tailscale - cai o https://tailscale.com/download roi login cung tai khoan voi ban.
)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=* " %%b in ("%%a") do echo        LAN (tam thoi, doi khi DHCP doi so): http://%%b:8001 / :8002 / :8005
)
echo.
echo ============================================
echo   STT server:  http://localhost:8001
echo   TTS server:  http://localhost:8002
echo   Pronun:      http://localhost:8005
echo   Health:      /health (:8001), /api/health (:8005)
echo.
echo   May BAN nhap vao backend/.env.docker (thay 100.x bang IP Tailscale in o tren):
echo     STT_SERVER_BASE_URL=http://100.x.y.z:8001/v1
echo     STT_SERVER_MODEL=mobiuslabsgmbh/faster-whisper-large-v3-turbo
echo     TTS_BASE_URL=http://100.x.y.z:8002/v1
echo     PRONUN_BASE_URL=http://100.x.y.z:8005
echo ============================================
echo.
echo   Commands:
echo     [L] View logs   [S] Status   [D] Down   [Q] Quit
echo ============================================
echo.

:menu
choice /c LSDQ /n /m "Command (L=logs, S=status, D=down, Q=quit): "
if errorlevel 4 exit /b 0
if errorlevel 3 (
    docker compose -f docker-compose.stt.yml down
    goto menu
)
if errorlevel 2 (
    docker compose -f docker-compose.stt.yml ps
    goto menu
)
if errorlevel 1 (
    docker compose -f docker-compose.stt.yml logs --tail=50 -f
    goto menu
)
