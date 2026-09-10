/**
 * Tải các file nguồn về data/raw/. Chạy: npx tsx scripts/import/fetch-sources.ts
 *
 * Lưu ý:
 *  - Punpuf KHÔNG cung cấp file dữ liệu sẵn — nó là parser. Clone repo đó, chạy theo
 *    hướng dẫn của họ trên PDF đại cương HSK 3.0 (2026), rồi copy TSV vào
 *    data/raw/hsk-2025-official.tsv.
 *  - CC-CEDICT tải bản .gz từ MDBG rồi giải nén thủ công (giữ script này gọn).
 */
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const RAW = join(__dirname, '..', '..', 'data', 'raw');

const DOWNLOADS: { file: string; url: string; note?: string }[] = [
  {
    file: 'complete-hsk-vocabulary.json',
    url: 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json',
    note: 'MIT',
  },
  {
    file: 'cvdict.u8',
    url: 'https://raw.githubusercontent.com/ph0ngp/CVDICT/main/CVDICT.u8',
    note: 'CC BY-SA 4.0 — nhớ ghi nguồn trong app',
  },
];

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  await pipeline(
    Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(dest),
  );
}

async function main(): Promise<void> {
  if (!existsSync(RAW)) mkdirSync(RAW, { recursive: true });
  for (const d of DOWNLOADS) {
    const dest = join(RAW, d.file);
    process.stdout.write(`↓ ${d.file} … `);
    try {
      await download(d.url, dest);
      console.log(`ok${d.note ? ` (${d.note})` : ''}`);
    } catch (err) {
      console.log(`LỖI: ${(err as Error).message}`);
    }
  }
  console.log('\nCòn cần thủ công:');
  console.log('  - data/raw/hsk-2025-official.tsv  (chạy Punpuf parser)');
  console.log('  - data/raw/cedict_ts.u8          (tải + giải nén từ mdbg.net)');
}

main();
