import { parentPort, workerData } from 'node:worker_threads';
import { kWatcherCRC32 } from '../../rs/crc32.js';

let kCRC32: ( path: string ) => Promise<kWatcherCRC32>;
if( workerData.rustCRC32 === true ){
  kCRC32 = ( await import( '../../rs/crc32.js' ) ).kCRC32;
}else {
  kCRC32 = ( await import( '../functions/hashes.js' ) ).kCRC32;
}

parentPort.on( 'message', async ( filename ): Promise<void> => {

  const crc32= await kCRC32( filename ).catch( ( error: Error ) => error );

  parentPort.postMessage( { kCRC32Data: crc32 } );

  process.exit( 0 );
} );
