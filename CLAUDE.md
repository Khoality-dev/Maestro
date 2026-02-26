# CLAUDE.md

## Project Overview

Maestro is a standalone MCP media player (Electron + React) that plays YouTube audio. AI agents control it via MCP tools over HTTP (localhost:29170). Decoupled from KurisuAssistant — audio plays locally on the user's machine.

## Architecture

Single Electron app — no sidecar processes.

- **Main process**: MCP server (Express, SSE + Streamable HTTP), YouTube integration (yt-dlp binary), PlayerController (state/queue/cache), IPC bridge
- **Renderer process**: React UI with Zustand store, HTMLAudioElement playback

```
electron/
├── main.ts               # Window creation, IPC handlers, MCP server start
├── preload.ts             # contextBridge (player controls, state subscription)
├── mcp/
│   ├── server.ts          # McpServer with 10 tool registrations
│   └── transport.ts       # Express: /mcp (Streamable HTTP) + /sse (legacy SSE)
├── youtube/
│   ├── bin.ts             # yt-dlp binary path resolution (bundled → Python Scripts → PATH)
│   ├── search.ts          # yt-dlp ytsearch → Track[]
│   └── download.ts        # yt-dlp -x --audio-format opus → cache file
└── player/
    ├── types.ts           # Track, PlayerState, PlaybackState
    ├── controller.ts      # Singleton PlayerController
    └── cache.ts           # SHA256 disk cache (data/media_cache/)

src/
├── App.tsx
├── main.tsx
├── styles.css
├── components/            # NowPlaying, TrackInfo, PlaybackControls, VolumeSlider, QueueView, SearchBar
├── store/playerStore.ts   # Zustand (syncs via IPC from main process)
├── hooks/useAudio.ts      # HTMLAudioElement wrapper
└── types/electron.d.ts    # Preload API types
```

## MCP Tools (10)

| Tool | Input | Description |
|------|-------|-------------|
| `play_music` | `query` | Search YouTube and play. Auto-enqueues if already playing. |
| `pause_music` | — | Pause current track |
| `resume_music` | — | Resume playback |
| `skip_music` | — | Skip to next in queue |
| `stop_music` | — | Stop playback, clear queue |
| `add_to_queue` | `query` | Search and add to queue |
| `remove_from_queue` | `index` | Remove from queue by index (0-based) |
| `get_music_state` | — | Returns playback state, current track, queue, volume |
| `set_volume` | `volume` (0.0–1.0) | Set volume |
| `search_music` | `query` | Search without playing, returns up to 5 results |

## Audio Playback Flow

1. MCP tool or UI action calls `controller.play(query)`
2. Controller searches YouTube via yt-dlp (`ytsearch`) → gets Track
3. Checks disk cache (`data/media_cache/{sha256(videoId)}.opus`)
4. If not cached: downloads via yt-dlp (`-x --audio-format opus`) → saves to cache
5. Sends `play-file` IPC to renderer with `file://` URL
6. Renderer creates `new Audio(fileUrl)`, plays it
7. On `ended`: renderer sends `player:track-finished` → controller auto-advances queue

## IPC (main ↔ renderer)

**Main → Renderer**: `state-update`, `play-file`, `pause`, `resume`, `stop`, `set-volume`, `error`
**Renderer → Main**: `player:play`, `player:pause`, `player:resume`, `player:skip`, `player:stop`, `player:add-to-queue`, `player:remove-from-queue`, `player:set-volume`, `player:search`, `player:get-state`, `player:track-finished`

## Development

```bash
npm install
npm run dev       # Vite dev server + Electron
npm run build     # Production build
```

## Integration with KurisuAssistant

Register as MCP server in KurisuAssistant:
- URL: `http://localhost:29170/sse` (or `http://host.docker.internal:29170/sse` from Docker)
- Transport: SSE

## Key Dependencies

- electron, vite, vite-plugin-electron
- react, react-dom, zustand
- @modelcontextprotocol/sdk, express, zod
- yt-dlp (external binary, resolved from bundled/Python Scripts/PATH)
