import { cp } from "node:fs/promises";
import { spawn } from "node:child_process";

async function build_rs(): Promise<void> {

  spawn( "cargo", [ "-V" ] )
    .on( "error", () => {
      process.exit( 0 );
    } );

  await cp( './utils/Cargo.toml', './Cargo.toml' )
    .catch( () => { process.exit( 0 ); } );

  const cargo = spawn( 'npx', [
    'cargo-cp-artifact',
    '-a',
    'cdylib',
    'crc32',
    'lib/rs/crc32.node',
    '--',
    'cargo',
    'build',
    '--release',
    '--message-format=json-render-diagnostics'
  ] )
    .on( 'error', ( console.error ) );

  cargo.stderr
    .on( "data", data => console.log( data.toString() ) );

  cargo.stdout
    .on( "data", data => console.log( data.toString() ) );

}

await build_rs();
