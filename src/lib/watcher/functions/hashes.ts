import { readFile } from 'fs/promises';
import { kWatcherCRC32 } from '../../rs/crc32.js';
import { crc32_table } from '../constant/crc32_table.js';

export async function kCRC32( path: string ): Promise<kWatcherCRC32> {

  const buffer_from_file: Buffer|Error = await readFile( path ).catch( error => error );
  const buffer_from_path = Buffer.from( path );

  const crc32_IntegrityIndex = await compute_CRC32( buffer_from_path ).catch( error => error );
  if ( crc32_IntegrityIndex instanceof RangeError ) {
    throw crc32_IntegrityIndex;
  }

  let crc32_IntegrityFile: string|RangeError = '';
  if ( buffer_from_file instanceof Error ) {
    throw buffer_from_file;
  }

  if ( buffer_from_file.length === 0 ) {
    crc32_IntegrityFile = await compute_CRC32( buffer_from_path ).catch( error => error );
  }else{
    crc32_IntegrityFile = await compute_CRC32( buffer_from_file ).catch( error => error );
  }

  if ( crc32_IntegrityFile instanceof RangeError ) {
    throw crc32_IntegrityFile;
  }

  return { index: crc32_IntegrityIndex, crc32: crc32_IntegrityFile };
}

function compute_CRC32( buffer: Uint8Array ): Promise<string|Error> {

  let crc = 0xFFFFFFFF;
  let error = false;
  const RangeErrorMessage: RangeError = new RangeError( 'crc32 out of range [0–255]' );

  for ( const byte of buffer ) {

    const tableIndex = ( crc ^ byte ) & 0xFF;
    const tableVal = crc32_table?.[ tableIndex ];

    if ( tableVal === undefined ) {

      error = true;
    }

    crc = ( crc >>> 8 ) ^ tableVal;
  }

  return new Promise( ( resolve, reject ) => {
    if( error ) {

      reject( RangeErrorMessage );
    }
    else {

      resolve( new Uint32Array( [ crc ^ 0xFFFFFFFF ] )[ 0 ].toString( 16 ) );
    }
  } );
}
