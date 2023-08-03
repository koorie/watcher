import { createRequire } from 'module';

export declare type kWatcherCRC32 = { index: string, crc32: string };
export declare interface rustBindings{
  kCRC32( path: string ): kWatcherCRC32 & Promise<kWatcherCRC32>;
}

const kCRC32_rust_binding: rustBindings['kCRC32']= createRequire( import.meta.url )( './crc32.node' ).kCRC32;

export function kCRC32( path: string ): kWatcherCRC32 & Promise<kWatcherCRC32>{
  return kCRC32_rust_binding( path );
}
