/**
 * Tải nguồn dữ liệu về data/raw/. Chạy: npx tsx scripts/import/fetch-sources.ts
 *
 * Clone 2 repo (shallow), copy đúng file cần dùng, rồi có thể xoá repo tạm.
 * data/raw/ đã nằm trong .gitignore.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const RAW = join(__dirname, '..', '..', 'data', 'raw');
const TMP = join(RAW, '_tmp');
const KRM = join(RAW, 'krmanik-hsk3');
const CVD = join(RAW, 'cvdict');

function git(...args: string[]): void {
  execFileSync('git', args, { stdio: 'inherit' });
}

function main(): void {
  mkdirSync(join(KRM, 'words'), { recursive: true });
  mkdirSync(join(KRM, 'freq'), { recursive: true });
  mkdirSync(CVD, { recursive: true });
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  console.log('↓ clone krmanik/HSK-3.0 …');
  git('clone', '--depth', '1', 'https://github.com/krmanik/HSK-3.0.git', join(TMP, 'k'));
  const kroot = join(TMP, 'k');
  cpSync(join(kroot, 'Scripts and data', '新版HSK考试大纲-词汇_cleaned.txt'), join(KRM, 'syllabus.tsv'));
  cpSync(join(kroot, 'Scripts and data', 'all_cedict.json'), join(KRM, 'all_cedict.json'));
  for (const lvl of ['1', '2', '3', '4', '5', '6', '7-9']) {
    cpSync(join(kroot, 'Scripts and data', 'tsv', `HSK ${lvl}.tsv`), join(KRM, 'words', `HSK_${lvl}.tsv`));
    cpSync(join(kroot, 'Scripts and data', 'with frequency', `Final-Merged-${lvl}.txt`), join(KRM, 'freq', `Final-Merged-${lvl}.txt`));
  }
  // audio: copy vào assets/audio + ghi manifest
  const audioSrc = join(kroot, 'New HSK (2025)', 'Audio');
  const audioDst = join(__dirname, '..', '..', 'assets', 'audio');
  mkdirSync(audioDst, { recursive: true });
  cpSync(audioSrc, audioDst, { recursive: true });
  const words = readdirSync(audioSrc)
    .filter((f) => f.endsWith('.mp3'))
    .map((f) => f.replace(/^cmn-/, '').replace(/\.mp3$/, ''));
  writeFileSync(join(KRM, 'audio-words.txt'), words.join('\n'));
  console.log(`  ✓ ${words.length} file audio → assets/audio/`);

  console.log('↓ clone ph0ngp/CVDICT …');
  git('clone', '--depth', '1', 'https://github.com/ph0ngp/CVDICT.git', join(TMP, 'c'));
  cpSync(join(TMP, 'c', 'CVDICT.u8'), join(CVD, 'CVDICT.u8'));

  rmSync(TMP, { recursive: true, force: true });
  console.log('\nXong. Chạy tiếp: npm run data:build-words');
}

main();
