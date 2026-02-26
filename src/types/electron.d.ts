import type { MaestroAPI } from '../../electron/preload';

declare global {
  interface Window {
    maestro: MaestroAPI;
  }
}
