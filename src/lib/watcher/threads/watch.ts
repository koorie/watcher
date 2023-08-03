import { watch } from 'node:fs/promises';
import { parentPort, workerData } from 'node:worker_threads';

const watcher = watch( workerData.path, {
  recursive: true
} );

for await ( const watcherEvent of watcher ) {
  if( watcherEvent.filename.at( watcherEvent.filename.length - 1 ) !== '~' ){
    parentPort.postMessage( { event: watcherEvent.eventType, filename: watcherEvent.filename } );
  }
}
