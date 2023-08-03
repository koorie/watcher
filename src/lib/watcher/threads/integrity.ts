import { readdir, stat } from 'fs/promises';
import { Stats } from 'node:fs';
import { resolve } from 'node:path';
import { kWatcherCRC32 } from '../../rs/crc32.js';
import { parentPort, workerData } from 'node:worker_threads';

let kCRC32: ( path: string ) => Promise<kWatcherCRC32>;
if( workerData.rustCRC32 === true ){
  kCRC32 = ( await import( '../../rs/crc32.js' ) ).kCRC32;
}else {
  kCRC32 = ( await import( '../functions/hashes.js' ) ).kCRC32;
}

export declare type kWatcherMapData = {crc32: string, path:string, marked_for_deletion:boolean, stats:Stats|string};
export declare type kWatcherMap = Map<string, kWatcherMapData>;

const integrityMap: kWatcherMap = new Map();

parentPort.on( 'message', async ( { path, stats_enabled } ) => {
  await integrity( path, stats_enabled );
  parentPort.postMessage( integrityMap );
  process.exit();
} );

async function integrity( path: string, stats_enabled?: boolean ): Promise<void>{

  const recursiveDir = await readdir( path, { withFileTypes: true } ).catch( error => error );
  if ( recursiveDir instanceof Error ) {
    throw recursiveDir;
  }

  for ( const dirent of recursiveDir ) {

    if ( dirent.isDirectory() ) {
      await integrity( `${ dirent.path }/${ dirent.name }`, stats_enabled );
    } else if ( dirent.isFile() ) {

      const crc32 = await kCRC32( `${ dirent.path }/${ dirent.name }` ).catch( ( error: Error ) => error );

      if ( crc32 instanceof Error ) {
        throw crc32;
      }

      let stats: string|Stats = 'should be activated';
      if( stats_enabled !== undefined ) {
        stats = await stat( resolve( `${ dirent.path }/${ dirent.name }` ) ).catch( error => error );
        if( stats instanceof Error ){
          throw stats;
        }
      }

      integrityMap.set(
        crc32.index, {
          crc32: crc32.crc32,
          path: resolve( `${ dirent.path }/${ dirent.name }` ),
          marked_for_deletion: false,
          stats: stats
        }
      );
    }
  }
}
