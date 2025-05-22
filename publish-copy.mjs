import * as path from 'path';
import * as fs from 'fs';
import { globbySync } from 'globby';

const cwd = process.cwd();
const srcRoot = path.join(cwd, 'src');
const destRoot = path.join(cwd, 'dist');

const toCopy = globbySync('**/*.json', { cwd: srcRoot })
  .map( p => ({
    from: path.join(srcRoot, p),
    to: path.join(destRoot, p),
  }));

for (const ci of toCopy) {
  fs.copyFileSync(ci.from, ci.to);
}