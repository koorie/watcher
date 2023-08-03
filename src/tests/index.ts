console.time( 'ready' );
import { Dang } from '@cli-dang/decors';
import { kWatcherConstructor } from '@koorie/watcher';

const kWatcher = new kWatcherConstructor( { rs_crc32: true } );
const watcher = await kWatcher.init( 'tests/', true );

watcher.on( 'ready', async ( data ): Promise<void> => {

  console.log( Dang.red( 'ready' ), data );
  console.timeEnd( 'ready' );
} );

watcher.on( 'changed', async ( path, data ): Promise<void> => {

  console.log( Dang.red( 'changed testing file' ), 'path', Dang.blue( path ), data );

} );

watcher.on( 'created', async ( path, data ): Promise<void> => {

  console.log( Dang.red( 'created testing file' ), 'path', Dang.blue( path ), data );
} );

watcher.on( 'deleted', async ( path, data ): Promise<void> => {

  console.log( Dang.red( 'deleted testing file' ), 'path', Dang.blue( path ), data );

} );

watcher.on( 'moved', async ( path, data ): Promise<void> => {

  console.log( Dang.red( 'moved testing file' ), 'path', Dang.blue( path ), data );

} );
