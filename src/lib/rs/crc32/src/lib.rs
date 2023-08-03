use neon::prelude::*;
use neon::context::{ModuleContext};
use async_std::fs::read;
use async_std::{task};
use async_std::io::{Result};

async fn read_file(path: &str) -> Result<Vec<u8>> {

    let contents = read(path).await?;
    Ok(contents)
}

pub(crate) fn crc32(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);

    let (deferred, promise) = cx.promise();

    // async read file
    match task::block_on(
        task::spawn(async move {

            match read_file(&path).await {
                Err(e) => Err(e),
                Ok(contents) => {
                    let mut data_buffer = Vec::new();
                    data_buffer.push(contents);
                    data_buffer.push(path.as_bytes().to_vec());
                    Ok(data_buffer)

                }
            }
        })
    ) {
        // async read file error return a js Promise<Error>
        Err(e) => {
            let js_error = cx.error(e.to_string())?;

            deferred.reject(&mut cx, js_error);
            Ok(promise)
        },
        Ok(contents) => {
            let buffer = if contents[0].is_empty() {
                contents[1].clone()
            } else {
                contents[0].clone()
            };

            //Ok(promise)
            match task::block_on(
                task::spawn(async move {

                    let mut result: Vec<u32> = Vec::new();

                    let contents = contents[1].as_slice();
                    let mut hasher = crc32fast::Hasher::new();
                    hasher.update(contents); // update hasher with file path
                    let crc32 = hasher.finalize();

                    result.push(crc32);
                    let contents = buffer.as_slice();
                    let mut hasher = crc32fast::Hasher::new();
                    hasher.update(contents); // update hasher with file contents
                    let crc32 = hasher.finalize();


                    result.push(crc32);

                    Ok::<Vec<u32>, String>(result)
                })
            ) {
                // async read file error return a js Promise<Error>
                Err(e) => {
                    let js_error = cx.error(e.to_string())?;

                    deferred.reject(&mut cx, js_error);
                    Ok(promise)
                },
                Ok(mut crc32) => {

                    let k_crc32data = JsObject::new(&mut cx);
                    let index = cx.string(format!("{:x}", &mut crc32[1]));
                    let crc32 = cx.string(format!("{:x}", &mut crc32[0]));

                    k_crc32data.set(&mut cx, "index", index)?;
                    k_crc32data.set(&mut cx, "crc32", crc32)?;

                    deferred.resolve(&mut cx, k_crc32data);
                    Ok(promise)
                }
            }
        }
    }
}

/*pub(crate) fn compute(mut context: FunctionContext) -> JsResult<JsObject> {
    let file_path = context.argument::<JsString>(0)?;
    let file_path = file_path.value(&mut context);

    let mut file = std::fs::File::open(file_path.clone()).expect("Failed to open file");

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).unwrap();
    let buffer_ = if buffer.is_empty() {
        file_path.as_bytes().to_vec()
    } else {
        buffer
    };

    let mut checksum_path_as_index = hash_data(&file_path.as_bytes());
    let mut checksum_file_contents = hash_data(&buffer_);

    let k_crc32data = JsObject::new(&mut context);
    let index = context.string(format!("{:x}", &mut checksum_path_as_index));
    let crc32 = context.string(format!("{:x}", &mut checksum_file_contents));

    k_crc32data.set(&mut context, "index", index)?;
    k_crc32data.set(&mut context, "crc32", crc32)?;
    Ok(k_crc32data)
}*/

/*fn hash_data(bytes: &[u8]) -> u32 {
    let mut hasher = crc32fast::Hasher::new();
    hasher.update(bytes);
    hasher.finalize()
}*/

#[neon::main]
pub fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("kCRC32", crc32)?;
    Ok(())
}
