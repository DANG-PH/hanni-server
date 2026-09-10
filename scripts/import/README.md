# Pipeline import từ vựng HSK 3.0

Từ nguồn mở → `data/processed/words.seed.json` → `prisma db seed` → Postgres.

> `data/processed/words.seed.json` (~11k từ, 9 cấp) **đã commit sẵn** trong repo.
> Chỉ chạy pipeline khi muốn dựng lại / cập nhật dataset hoặc lấy audio.

## Nguồn (đều CC BY-SA 4.0 — xem `../../data/NOTICES.md`)

| Nguồn | Dùng cho |
|---|---|
| [krmanik/HSK-3.0](https://github.com/krmanik/HSK-3.0) (bản 2025-11) | đại cương chính thức (cấp + pinyin + từ loại), nghĩa Anh theo cấp, phồn thể, tần suất, **audio** |
| [ph0ngp/CVDICT](https://github.com/ph0ngp/CVDICT) | nghĩa tiếng Việt (dịch máy có rà soát một phần) |
| `../../data/curated/hsk1.json` | 70 từ HSK 1 nghĩa tiếng Việt đã rà tay + câu ví dụ |

## Chạy

```bash
# 1) Clone 2 repo về data/raw/ + copy audio vào assets/audio/
npm run data:fetch-sources

# 2) Gộp & chuẩn hoá → data/processed/words.seed.json + build-report.md
npm run data:build-words

# 3) Nạp DB (SEED_RESET=true để ghi đè dữ liệu Word cũ)
SEED_RESET=true npm run db:seed
```

## ETL làm gì (`build-words.ts`)

1. Đọc `syllabus.tsv` (`新版HSK考试大纲-词汇_cleaned.txt`): `idx \t cấp \t 简体 \t pinyin \t 词性`.
   - Cấp `"3（7-9）"` → lấy phần dẫn đầu (`3`). `"7-9"` → `hskLevel = 7`, `hskBandOnly = true`.
   - `"本1" / "本2"` (ký hiệu phân biệt nghĩa) → bỏ số cuối; các nghĩa trùng khoá được **gộp từ loại**.
2. Khớp cách đọc (dấu thanh, `"bàba"`) với CC-CEDICT (`ba4 ba5`) bằng cách bỏ dấu để so →
   lấy `pinyinNumeric` chuẩn + `pinyin` hiển thị có tách âm tiết.
3. Nghĩa Anh: `tsv/HSK N.tsv` → fallback `all_cedict.json` (rút gọn còn ~6 cụm).
4. Nghĩa Việt: `CVDICT.u8` join theo `(简体, pinyin-key)` → `translationStatus = MACHINE`, `needsReview = true`.
   Từ nào có trong `data/curated/hsk1.json` → dùng nghĩa đã rà, `translationStatus = REVIEWED`.
5. Tần suất: gộp `with frequency/Final-Merged-*.txt` → xếp hạng toàn cục → `frequencyRank`.
6. `audioUrl = /media/audio/cmn-<简体>.mp3` nếu file mp3 tồn tại (backend phục vụ tĩnh qua ServeStaticModule).
7. Dedupe theo `(simplified, pinyinNumeric)`; xuất JSON + báo cáo.

## Giấy phép dataset build ra

`words.seed.json` **phát hành lại theo CC BY-SA 4.0** (phái sinh krmanik/HSK-3.0 + CVDICT —
điều khoản share-alike). Bắt buộc ghi công ở trang `/nguon-du-lieu` của app.
