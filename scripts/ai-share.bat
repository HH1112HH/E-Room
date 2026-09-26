@echo off
REM MAY AI (may nay - chay STT :8001 + TTS :8002 bang docker-compose.stt.yml).
REM Mo firewall + in san URL de MAY KIA tro sang qua Tailscale.
REM Chay 1 lan (can quyen Admin cho lenh firewall; neu khong co quyen thi bo qua firewall).

for /f %%i in ('tailscale ip -4') do set TSIP=%%i
echo Tailscale IP may nay: %TSIP%
echo.

REM Mo firewall cho may kia goi sang (idempotent - co roi thi bao loi, ke no).
netsh advfirewall firewall add rule name="E-Room STT 8001" dir=in action=allow protocol=TCP localport=8001 >nul 2>&1
netsh advfirewall firewall add rule name="E-Room TTS 8002" dir=in action=allow protocol=TCP localport=8002 >nul 2>&1

echo Kiem tra song (localhost)...
curl -s -o nul -w "STT :8001 -> %%{http_code}\n" http://localhost:8001/health
curl -s -o nul -w "TTS :8002 -> %%{http_code}\n" http://localhost:8002/v1/models
echo.
echo Kiem tra song (qua Tailscale IP - dung duong may kia se goi)...
curl -s -o nul -w "STT :8001 -> %%{http_code}\n" http://%TSIP%:8001/health
curl -s -o nul -w "TTS :8002 -> %%{http_code}\n" http://%TSIP%:8002/v1/models
echo.
echo ===== MAY KIA sua backend/.env.docker =====
echo STT_PROVIDER=whisper_server
echo STT_SERVER_BASE_URL=http://%TSIP%:8001/v1
echo TTS_BASE_URL=http://%TSIP%:8002/v1
echo PRONUN_BASE_URL=
echo SCORING_MAX_PARALLEL=1
echo ===========================================
echo Xong nho restart api ben may kia: docker restart api
