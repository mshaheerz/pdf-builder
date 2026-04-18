import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pkgDir = path.join(rootDir, 'packages', 'wasm', 'pkg');

const requiredFiles = [
  'package.json',
  'pdf_builder_wasm.d.ts',
  'pdf_builder_wasm.js',
  'pdf_builder_wasm_bg.wasm',
];

function hasCompiledWasmPackage() {
  return requiredFiles.every((file) => existsSync(path.join(pkgDir, file)));
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });
}

if (hasCompiledWasmPackage()) {
  console.log('Using checked-in WebAssembly package from packages/wasm/pkg.');
  process.exit(0);
}

const probe = spawnSync('wasm-pack', ['--version'], {
  cwd: rootDir,
  stdio: 'ignore',
  shell: false,
});

if (probe.status === 0) {
  console.log('Compiled WebAssembly package not found. Building it with wasm-pack...');
  const build = run('wasm-pack', ['build', 'packages/wasm', '--target', 'web', '--out-dir', 'pkg']);
  process.exit(build.status ?? 1);
}

console.error('Missing packages/wasm/pkg and wasm-pack is not installed.');
console.error('Either commit packages/wasm/pkg for deployment or install wasm-pack and rerun the build.');
process.exit(1);
