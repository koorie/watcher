interface kWatcherEvents {
  ready: (kWatcherData?: kWatcherMapData) => kWatcherEventsEmitter<Promise<void>>;
  deleted: (path: string, kWatcherData?: kWatcherMapData) => kWatcherEventsEmitter<Promise<void>>;
  updated: (path: string, kWatcherData?: kWatcherMapData) => kWatcherEventsEmitter<Promise<void>>;
  moved: (path: string, kWatcherData?: kWatcherMapData) => kWatcherEventsEmitter<Promise<void>>;
  created: (path: string, kWatcherData?: kWatcherMapData) => kWatcherEventsEmitter<Promise<void>>;
}
interface kWatcherEventsEmitter<kWatcherEvent> {
  on<name extends keyof kWatcherEvent>(event: name | symbol | string, listener: (path: string, kWatcherData?: kWatcherMapData) => Promise<void>): void;
  emit<name extends keyof kWatcherEvent>(event: name | symbol | string, path: string, kWatcherData?: kWatcherMapData): void;
  on<name extends keyof kWatcherEvent>(event: name | symbol | string, listener: (kWatcherData?: kWatcherMapData) => Promise<void>): void;
  emit<name extends keyof kWatcherEvent>(event: name | symbol | string, kWatcherData?: kWatcherMapData): void;
}
import { Stats } from 'node:fs';
type kWatcherMapData = {
  crc32: string;
  path: string;
  marked_for_deletion: boolean;
  stats: Stats | string;
};
export declare type kWatcherMap = Map<string, kWatcherMapData>;
export declare class kWatcherConstructor {
  private kWatcherEmitsData;
  private kWatcherEmitsStats;
  private kWatcherPath;
  private kWatcherFilename;
  private kWatcherIntegrity;
  private kWatcherEvent;
  private kWatcherMarkedForDeletion;
  private kWatcherAccess;
  private kWatcherEmits;
  constructor(options?: { rs_crc32: boolean; });
  init(path?: string | undefined, kEmitsWatcherData?: boolean | undefined, kEmitsWatcherStats?: boolean | undefined): Promise<kWatcherEventsEmitter<kWatcherEvents>>;
  getIntegrity(): Promise<kWatcherMap>;
  private kWatcher;
  private kWatcherEventChange;
  private kWatcherEventRename;
  private kWatcherFilenameExists;
  private kWatcherStats;
}
export declare function kWatcher(path?: string, kEmitsWatcherData?: boolean, kEmitsWatcherStats?: boolean): Promise<kWatcherEventsEmitter<kWatcherEvents>>;
