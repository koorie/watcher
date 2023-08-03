# clean build
rm -rf ./coverage || true
rm -rf ./lib || true
rm -rf ./node_modules || true
rm -rf ./target || true
rm -rf ./tests || true
rm -rf ./types || true
rm -rf ./utils || true
rm ./Cargo.lock || true
rm ./index.js || true
rm ./package-lock.json || true
# install all the dependencies
npm install --ignore-scripts
# build the project
npx tsc
npx eslint . --fix --ext .ts
# copy rust metadata
mkdir -p ./lib/rs/crc32/src || true
cp ./src/lib/rs/crc32/src/lib.rs ./lib/rs/crc32/src/lib.rs || true
cp ./src/lib/rs/crc32/Cargo.toml ./lib/rs/crc32/Cargo.toml || true
cp ./src/utils/Cargo.toml ./utils/Cargo.toml || true
