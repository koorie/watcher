import { existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { kWatcherCRC32 } from '../rs/crc32.js';
import { kWatcherMap, kWatcherMapData } from './threads/integrity.js';

declare type kWatcherMarkedForDeletion = { key?: string, crc32?: string, path?: string, };
declare type kWatchThreadMessage = { event: string, filename: string };

export declare interface kWatcherEvents {
  ready: ( kWatcherData?: kWatcherMapData ) => kWatcherEventsEmitter<Promise<void>>
  deleted: ( path: string, kWatcherData?: kWatcherMapData ) => kWatcherEventsEmitter<Promise<void>>
  updated: ( path: string, kWatcherData?: kWatcherMapData ) => kWatcherEventsEmitter<Promise<void>>
  moved: ( path: string, kWatcherData?: kWatcherMapData ) => kWatcherEventsEmitter<Promise<void>>
  created: ( path: string, kWatcherData?: kWatcherMapData ) => kWatcherEventsEmitter<Promise<void>>
}

export declare interface kWatcherEventsEmitter<kWatcherEvent> {
  on<name extends keyof kWatcherEvent>( event: name|symbol|string, listener: ( path: string, kWatcherData?: kWatcherMapData ) => Promise<void> ): void
  emit<name extends keyof kWatcherEvent>( event: name|symbol|string, path: string, kWatcherData?: kWatcherMapData ): void
  on<name extends keyof kWatcherEvent>( event: name|symbol|string, listener: ( kWatcherData?: kWatcherMapData ) => Promise<void> ): void
  emit<name extends keyof kWatcherEvent>( event: name|symbol|string, kWatcherData?: kWatcherMapData ): void
}

declare interface kWatcherInternalEvents {
  crc32: ( crc32: kWatcherCRC32 ) => kWatcherInternalEventsEmitter<Promise<void>>
  watch: ( watch: kWatchThreadMessage ) => kWatcherInternalEventsEmitter<Promise<void>>
}

declare interface kWatcherInternalEventsEmitter<kWatcherInternalEvent> {
  on<name extends keyof kWatcherInternalEvent>( event: name|symbol|string, listener: ( data: kWatcherCRC32 & kWatchThreadMessage ) => Promise<void> ): void
  once<name extends keyof kWatcherInternalEvent>( event: name|symbol|string, listener: ( data: kWatcherCRC32 & kWatchThreadMessage ) => Promise<void> ): void
  emit<name extends keyof kWatcherInternalEvent>( event: name|symbol|string, crc32: kWatcherCRC32 ): void
  emit<name extends keyof kWatcherInternalEvent>( event: name|symbol|string, watch: kWatchThreadMessage ): void
}

const __filename = import.meta.url;

export class kWatcherConstructor {

  #kWatcherEmitsData: boolean =  false;
  #kWatcherEmitsStats: undefined|boolean = undefined;
  #kWatcherPath: string = process.cwd();
  #kWatcherFilename: string = '';
  #kWatcherIntegrity: kWatcherMap = new Map();
  #kWatcherEvent: kWatcherEventsEmitter<kWatcherEvents> = new EventEmitter();
  #kWatcherMarkedForDeletion: kWatcherMarkedForDeletion = {};
  #kWatcherAccess: boolean = false;
  #kWatcherInternalEvent: kWatcherInternalEventsEmitter<kWatcherInternalEvents> = new EventEmitter();
  readonly #kWatcherRustCRC32: boolean = true;

  constructor( options?: {rs_crc32: boolean} ) {

    if( options !== undefined ) {

      if( options?.rs_crc32 === false ) {
        this.#kWatcherRustCRC32 = false;
      }
    }
  }

  async #kWatcherEmits( event: string, path: string, kWatcherData?: kWatcherMapData ): Promise<void> {

    this.#kWatcherMarkedForDeletion = {};
    if( this.#kWatcherEmitsData === true ) {
      this.#kWatcherEvent.emit( event, path, kWatcherData );
    }else {
      this.#kWatcherEvent.emit( event, path );
    }
  }

  async #kWatcherThreadManager( name: 'crc32' | 'watch' )
    : Promise<kWatcherInternalEventsEmitter<kWatcherInternalEvents>>{

    let options = undefined;
    switch ( name ) {

      case 'watch': {
        options = { workerData: { path: this.#kWatcherPath } };
      }
        break;

      case 'crc32': {
        options = { workerData: { rust: this.#kWatcherRustCRC32 } };
      }
        break;

      default: break;
    }

    const thread = new Worker( new URL( `./threads/${ name }.js`, __filename ), options );

    thread.on( 'error', error => {
      console.error( error );
    } );

    thread.on( 'exit', code => {
      if ( code !== 0 ) {
        console.error( new Error( `Worker ${ name } stopped with exit code ${ code }` ) );
        process.exit( 1 );
      }
    } );

    switch ( name ) {

      case 'crc32': {

        thread.postMessage( this.#kWatcherFilename );
        thread.on( 'message', async ( { kCRC32Data } ) => {
          this.#kWatcherInternalEvent.emit( name, kCRC32Data );
        } );
      }
        break;

      case 'watch': {

        thread.on( 'message', async ( { event, filename } ) => {
          this.#kWatcherInternalEvent.emit( 'change-detected', { event, filename } );
        } );
      }
        break;

      default: break;
    }

    return this.#kWatcherInternalEvent;
  }

  async init( path?: string | undefined, kEmitsWatcherData?: boolean | undefined, kEmitsWatcherStats?: boolean | undefined )
    : Promise<kWatcherEventsEmitter<kWatcherEvents>> {

    if( path !== undefined ) {
      this.#kWatcherPath = resolve( path );
    }

    if( kEmitsWatcherStats !== undefined ) {
      this.#kWatcherEmitsStats = true;
    }

    if( kEmitsWatcherData !== undefined ) {
      this.#kWatcherEmitsData = true;
    }

    const integrityThread = new Worker(
      new URL( './threads/integrity.js', __filename ),
      { workerData: { rustCRC32: this.#kWatcherRustCRC32 } }
    );

    integrityThread.on( 'error', error => {

      console.error( error );
    } );

    integrityThread.on( 'exit', code => {

      if ( code !== 0 ) {

        console.error( new Error( `Worker Integrity stopped with exit code ${ code }` ) );
        process.exit( 1 );
      }
    } );

    integrityThread.on( 'online', () => {
      console.log( '[watching] -> ', `${ resolve( path || this.#kWatcherPath ) }/**/*` );
    } );

    integrityThread.postMessage( {
      path: resolve( path || this.#kWatcherPath ),
      stats_enabled: this.#kWatcherEmitsStats
    } );

    integrityThread.on( 'message', async ( kWatcherData ) => {
      this.#kWatcherIntegrity = kWatcherData;
      this.#kWatcherEvent.emit( 'ready', kWatcherData );
      await this.#kWatcher();
    } );

    return this.#kWatcherEvent;
  }

  async #kWatcher(): Promise<void>{

    ( await this.#kWatcherThreadManager( 'watch' ) )

      .on( 'change-detected', async ( { event, filename } ) => {

        if( event === 'rename' ) {
          this.#kWatcherFilename = `${this.#kWatcherPath}/${filename}`;
          await this.#kWatcherEventRename();
        }

        else if( event === 'change' ) {
          this.#kWatcherFilename = `${this.#kWatcherPath}/${filename}`;
          await this.#kWatcherEventChange();
        }

      } );
  }

  async #kWatcherEventChange(): Promise<void>{

    ( await this.#kWatcherThreadManager( 'crc32' ) )
      .once( 'crc32', async ( crc32 ) => {

        for ( const [ key, value ] of this.#kWatcherIntegrity ) {

          if ( value.path === this.#kWatcherFilename ) {

            this.#kWatcherIntegrity.delete( key );

            const stats: string | Stats = await this.#kWatcherStats();

            this.#kWatcherIntegrity.set(
              crc32.index, {
                crc32: crc32.crc32,
                path: this.#kWatcherFilename,
                marked_for_deletion: false,
                stats: stats
              }
            );
            await this.#kWatcherEmits( 'changed', this.#kWatcherFilename, this.#kWatcherIntegrity.get( crc32.index ) );

            break;
          }
        }
      } );

    return;
  }

  async #kWatcherEventRename(): Promise<void> {

    this.#kWatcherAccess = await this.#kWatcherFilenameExists();

    if( this.#kWatcherAccess === false ) {

      for ( const [ key, value ] of this.#kWatcherIntegrity ) {
        if ( value.path === this.#kWatcherFilename ) {
          this.#kWatcherIntegrity.get( key ).marked_for_deletion = true;
          this.#kWatcherMarkedForDeletion.key = key;
          this.#kWatcherMarkedForDeletion.crc32 = value.crc32;
          this.#kWatcherMarkedForDeletion.path = value.path;

          setTimeout( async () => {
            if( Object.keys( this.#kWatcherMarkedForDeletion ).length === 3 ) {
              await this.#kWatcherEmits( 'deleted', this.#kWatcherFilename, this.#kWatcherIntegrity.get( key ) );
              this.#kWatcherIntegrity.delete( this.#kWatcherMarkedForDeletion.key );
            }
          }, 500 );

          break;
        }
      }

      return;
    }

    else if( this.#kWatcherAccess && Object.keys( this.#kWatcherMarkedForDeletion ).length === 3 ){

      ( await this.#kWatcherThreadManager( 'crc32' ) )
        .once( 'crc32', async ( crc32 ) => {

          for ( const [ key, value ] of this.#kWatcherIntegrity ) {

            if ( crc32.crc32 === this.#kWatcherMarkedForDeletion.crc32 && value.marked_for_deletion === true ) {

              this.#kWatcherIntegrity.delete( key );

              const stats: string|Stats = await this.#kWatcherStats();

              this.#kWatcherIntegrity.set( crc32.index, {
                crc32: crc32.crc32,
                path: this.#kWatcherFilename,
                marked_for_deletion: false,
                stats: stats
              } );

              await this.#kWatcherEmits( 'moved', this.#kWatcherFilename, this.#kWatcherIntegrity.get( crc32.index ) );

              break;
            }
          }
        } );

      return;
    }

    else if( this.#kWatcherAccess && Object.keys( this.#kWatcherMarkedForDeletion ).length === 0 ) {

      ( await this.#kWatcherThreadManager( 'crc32' ) )
        .once( 'crc32', async ( crc32 ) => {

          let event_: string;
          for ( const [ key, value ] of this.#kWatcherIntegrity ) {
            if ( value.path === this.#kWatcherFilename ) {
              this.#kWatcherIntegrity.delete( key );
              event_ = 'changed';
              break;
            }else{
              event_ = 'created';
            }
          }

          const stats: string|Stats = await this.#kWatcherStats();

          this.#kWatcherIntegrity.set(
            crc32.index, {
              crc32: crc32.crc32,
              path: this.#kWatcherFilename,
              marked_for_deletion: false,
              stats: stats
            }
          );
          await this.#kWatcherEmits( event_, this.#kWatcherFilename, this.#kWatcherIntegrity.get( crc32.index ) );
        } );

      return;
    }

  }

  #kWatcherFilenameExists(): Promise<boolean> {

    return new Promise( resolve => {
      resolve( existsSync( this.#kWatcherFilename ) );
    } );
  }

  async #kWatcherStats(): Promise<string|Stats> {

    if( this.#kWatcherEmitsStats === true ) {
      return stat( this.#kWatcherFilename );
    }

    return 'should be activated';
  }

  async #getIntegrity(): Promise<kWatcherMap> {
    return this.#kWatcherIntegrity;
  }
}

export async function kWatcher( path?: string, kEmitsWatcherData?: boolean, kEmitsWatcherStats?: boolean ): Promise<kWatcherEventsEmitter<kWatcherEvents>> {
  const watcher = new kWatcherConstructor();

  return watcher.init( path, kEmitsWatcherData, kEmitsWatcherStats );
}
