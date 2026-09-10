# Pipeline import từ vựng HSK 3.0

Mục tiêu: từ các nguồn mở → `data/processed/words.seed.json` → `prisma db seed` → Postgres.

> **Không cần chạy để dev.** Repo đã có sẵn `data/processed/words.seed.json` mẫu
> (~45 từ HSK 1, nghĩa tiếng Việt đã rà). Pipeline dưới đây để dựng bộ đầy đủ 9 cấp.

## Kiến trúc 2 lớp

| Lớp | Nguồn | License | Vai trò |
|---|---|---|---|
| Xương sống | [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) `complete.json` | MIT | từ, pinyin, POS, tần suất, traditional, phủ 9 cấp |
| Trọng tài phân cấp | [Punpuf/hsk-syllabus-vocabulary-parser](https://github.com/Punpuf/hsk-syllabus-vocabulary-parser) (TSV tự sinh) | MIT + CC BY-SA 4.0 | cấp HSK theo **đại cương thi chính thức 2026** |
| Nghĩa tiếng Việt | [ph0ngp/CVDICT](https://github.com/ph0ngp/CVDICT) `CVDICT.u8` | CC BY-SA 4.0 | nghĩa tiếng Việt (dịch máy GPT-4o + rà một phần) |
| Nghĩa Anh (fallback) | [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) `cedict_ts.u8` | CC BY-SA 3.0 | nghĩa tiếng Anh, bù `traditional` |

## Các bước

```bash
# 1) Tải nguồn tự động được
npx tsx scripts/import/fetch-sources.ts

# 2) Thủ công:
#    - data/raw/hsk-2025-official.tsv : clone Punpuf, chạy parser trên PDF đại cương 2026
#    - data/raw/cedict_ts.u8          : tải bản .gz từ mdbg.net rồi giải nén

# 3) Gộp & chuẩn hoá → data/processed/words.seed.json + build-report.md + level-mismatches.csv
npm run data:build-words

# 4) Nạp vào DB
npm run db:seed
```

## ETL làm gì (`build-words.ts`)

1. Parse `complete.json`, chỉ giữ mục `new-*` (HSK 3.0); `new-7` → cấp 7, `hskBandOnly = true`.
2. Đối chiếu cấp với TSV Punpuf theo khoá `(giản thể, pinyin-key)`. Lệch → ghi `level-mismatches.csv`, **lấy cấp của Punpuf**.
3. Gắn `meaningVi` từ CVDICT (join `(giản thể|phồn thể, pinyin-key)`), `translationStatus = MACHINE`, `needsReview = true`.
4. Không khớp CVDICT → `meaningVi = null`, `translationStatus = MISSING` (ưu tiên dịch tay: HSK 1–3 trước, theo tần suất).
5. Bù `meaningEn` + `traditional` từ CC-CEDICT.
6. Chuyển pinyin số → pinyin dấu thanh; chuẩn hoá `pinyinNumeric` làm khoá `@@unique`.
7. Dedupe theo `(simplified, pinyinNumeric)`; xuất JSON + báo cáo.

## Giấy phép của bộ dữ liệu build ra

`data/processed/words.seed.json` **phát hành lại theo CC BY-SA 4.0** vì có dữ liệu phái
sinh từ CC-CEDICT / CVDICT (điều khoản share-alike). Ghi nguồn bắt buộc — xem
`data/NOTICES.md`, hiển thị ở trang `/nguon-du-lieu` của app.
