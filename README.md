# Maestro

A lightweight YouTube music player. Streams audio directly from YouTube — no downloads, no bloat.

Built with Electron and React. Includes an MCP server so AI agents can control playback.

## Features

- YouTube search and audio streaming
- Queue with drag-to-reorder
- Loop modes (off / queue / one)
- Play history
- State persisted across restarts
- yt-dlp auto-installed on first launch
- MCP server for AI agent integration

## Setup

```bash
npm install
```

## Run

```bash
# Windows
run_dev.bat

# Or directly
npx vite
```

## Build

```bash
npx vite build
npx electron dist-electron/main.js
```

## MCP Integration

Maestro exposes 10 tools on `localhost:29170` for AI agents to search, play, pause, skip, queue, and control volume.

```json
{
  "name": "Maestro",
  "transport_type": "sse",
  "url": "http://localhost:29170/sse"
}
```
