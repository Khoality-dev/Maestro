import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { playerController } from '../player/controller.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'Maestro',
    version: '1.0.0',
  });

  server.tool('play_music', 'Search YouTube and play a track. Auto-enqueues if already playing.', {
    query: z.string().describe('Search query (song name, artist, etc.)'),
  }, async ({ query }) => {
    const track = await playerController.play(query);
    const action = playerController.getState().queue.find(t => t.id === track.id)
      ? 'Enqueued' : 'Now playing';
    return {
      content: [{
        type: 'text' as const,
        text: `${action}: ${track.title}${track.artist ? ` by ${track.artist}` : ''}`,
      }],
    };
  });

  server.tool('pause_music', 'Pause the current track.', {}, async () => {
    playerController.pause();
    return {
      content: [{ type: 'text' as const, text: 'Playback paused.' }],
    };
  });

  server.tool('resume_music', 'Resume playback.', {}, async () => {
    playerController.resume();
    return {
      content: [{ type: 'text' as const, text: 'Playback resumed.' }],
    };
  });

  server.tool('skip_music', 'Skip to the next track in the queue.', {}, async () => {
    playerController.skip();
    return {
      content: [{ type: 'text' as const, text: 'Skipped to next track.' }],
    };
  });

  server.tool('stop_music', 'Stop playback and clear the queue.', {}, async () => {
    playerController.stop();
    return {
      content: [{ type: 'text' as const, text: 'Playback stopped and queue cleared.' }],
    };
  });

  server.tool('add_to_queue', 'Search YouTube and add a track to the queue.', {
    query: z.string().describe('Search query (song name, artist, etc.)'),
  }, async ({ query }) => {
    const track = await playerController.addToQueue(query);
    return {
      content: [{
        type: 'text' as const,
        text: `Added to queue: ${track.title}${track.artist ? ` by ${track.artist}` : ''}`,
      }],
    };
  });

  server.tool('remove_from_queue', 'Remove a track from the queue by index (0-based).', {
    index: z.number().int().min(0).describe('Queue index to remove'),
  }, async ({ index }) => {
    const removed = playerController.removeFromQueue(index);
    if (!removed) {
      return {
        content: [{ type: 'text' as const, text: `Invalid queue index: ${index}` }],
        isError: true,
      };
    }
    return {
      content: [{
        type: 'text' as const,
        text: `Removed from queue: ${removed.title}`,
      }],
    };
  });

  server.tool('get_music_state', 'Get the current playback state, track info, queue, and volume.', {}, async () => {
    const state = playerController.getState();
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(state, null, 2),
      }],
    };
  });

  server.tool('set_volume', 'Set playback volume.', {
    volume: z.number().min(0).max(1).describe('Volume level from 0.0 (mute) to 1.0 (max)'),
  }, async ({ volume }) => {
    playerController.setVolume(volume);
    return {
      content: [{
        type: 'text' as const,
        text: `Volume set to ${Math.round(volume * 100)}%.`,
      }],
    };
  });

  server.tool('search_music', 'Search YouTube for tracks without playing. Returns up to 5 results.', {
    query: z.string().describe('Search query'),
  }, async ({ query }) => {
    const tracks = await playerController.search(query);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(tracks, null, 2),
      }],
    };
  });

  return server;
}
