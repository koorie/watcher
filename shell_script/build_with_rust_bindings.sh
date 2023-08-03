npx tsc
npx eslint . --fix --ext .ts
chmod u+x ./koorie.js || true
chmod u+x ./bin/koorie_lw.js || true
chmod u+x ./bin/koorie_hlr.js || true
npx cargo-cp-artifact -a cdylib \
  crc32 \
  lib/rs/crc32.node \
  -- \
  cargo build --release \
  --message-format=json-render-diagnostics
