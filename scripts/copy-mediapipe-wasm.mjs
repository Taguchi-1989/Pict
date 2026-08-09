// MediaPipeのwasmを自サイト内に配置する。
// CDNを参照しないので、社内ネットワークなど外部配信が塞がれた環境でも写真の読み取りが動く。
// 生成物はビルドのたびにnode_modulesから作り直すため、リポジトリには含めない。
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const target = join(root, "public", "mediapipe");

// SIMD対応環境用と非対応環境用の両方を置く（FilesetResolverが実行時に選ぶ）。
const needed = /^vision_wasm_(internal|nosimd_internal)\.(js|wasm)$/;

const files = (await readdir(source)).filter((name) => needed.test(name));
if (files.length === 0) throw new Error(`MediaPipeのwasmが見つかりません: ${source}`);

await mkdir(target, { recursive: true });
await Promise.all(files.map((name) => copyFile(join(source, name), join(target, name))));

console.log(`copied ${files.length} MediaPipe wasm files to public/mediapipe`);
