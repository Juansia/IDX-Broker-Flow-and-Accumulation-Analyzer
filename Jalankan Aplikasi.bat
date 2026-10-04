@echo off
title IDX Broker Flow Accumulation Analyzer
cd /d "%~dp0"
set "BUNDLED_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%BUNDLED_PY%" (
  "%BUNDLED_PY%" app.py
) else (
  py -3 --version >nul 2>&1
  if errorlevel 1 (
    python app.py
  ) else (
    py -3 app.py
  )
)
if errorlevel 1 (
  echo.
  echo Gagal menjalankan. Gunakan Python 3.10 atau lebih baru: https://python.org
  pause
)
