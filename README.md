# Maestro

Standalone MCP media player for YouTube audio. Streams music locally and exposes tools for AI agents to control playback.

## Architecture

Single Electron app — no sidecar, no extra processes.

```
Electron Main Process (Node.js)
  ├── MCP Server (SSE + Streamable HTTP, port 29170)
  ├── YouTube search/extract (yt-dlp)
  ├── PlayerController (state, queue, history)
  └── IPC bridge to renderer

Electron Renderer Process (React)
  ├── Two-column UI (Search + Queue)
  ├── Playback controls + volume + loop
  └── Audio playback (HTMLAudioElement, CDN streaming)
```

## MCP Tools

| Tool | Input | Description |
|------|-------|-------------|
| `play_music` | `query` | Search YouTube and play (auto-enqueues if already playing) |
| `pause_music` | — | Pause current track |
| `resume_music` | — | Resume playback |
| `skip_music` | — | Skip to next in queue |
| `stop_music` | — | Stop playback, clear queue |
| `add_to_queue` | `query` | Search and add to queue |
| `remove_from_queue` | `index` | Remove from queue by position |
| `get_music_state` | — | Returns playback state, current track, queue, volume |
| `set_volume` | `volume` | Set volume 0.0–1.0 |
| `search_music` | `query` | Search without playing, returns up to 5 results |

## Features

- YouTube search and CDN audio streaming via yt-dlp
- Drag-to-reorder queue
- Loop modes: off, loop queue, loop one
- Play history (persisted, shown when search is empty)
- Queue and volume persisted across restarts
- MCP server on `localhost:29170` (SSE + Streamable HTTP)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`pip install yt-dlp` or download binary)

## Setup

```bash
npm install
```

## Development

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

Register Maestro as an MCP server in your AI agent:

```json
{
  "name": "Maestro",
  "transport_type": "sse",
  "url": "http://localhost:29170/sse"
}
```

Or use Streamable HTTP at `http://localhost:29170/mcp`.

## Project Structure

```
electron/
  ├── main.ts              # Electron entry, IPC handlers
  ├── preload.ts           # contextBridge API
  ├── mcp/
  │   ├── server.ts        # 10 MCP tool registrations
  │   └── transport.ts     # Express SSE + Streamable HTTP
  ├── youtube/
  │   ├── bin.ts           # yt-dlp binary resolution
  │   ├── search.ts        # YouTube search
  │   └── extract.ts       # Stream URL extraction
  └── player/
      ├── types.ts         # Track, PlayerState, LoopMode
      └── controller.ts    # State machine, queue, history, persistence
src/
  ├── App.tsx              # Root component, two-column layout
  ├── components/
  │   ├── SearchPanel.tsx  # Search bar + results + recent history
  │   └── QueuePanel.tsx   # Now playing + controls + queue list
  ├── store/
  │   └── playerStore.ts   # Zustand store (synced via IPC)
  └── hooks/
      └── useAudio.ts      # HTMLAudioElement wrapper
```
