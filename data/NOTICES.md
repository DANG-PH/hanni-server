# Nguồn dữ liệu & ghi công (attribution)

App Hanni phải hiển thị nội dung dưới đây ở trang **"Nguồn dữ liệu" (`/nguon-du-lieu`)**
và một liên kết ở footer.

## Từ vựng, âm đọc, audio HSK 3.0

- **[krmanik/HSK-3.0](https://github.com/krmanik/HSK-3.0)** — Mani. Bản **2025-11**.
  Giấy phép **CC BY-SA 4.0** (danh sách từ HSK 3.0). Cung cấp: đại cương thi chính thức
  (cấp + pinyin + từ loại), bản dịch tiếng Anh theo từng cấp, chữ phồn thể, và **10.900
  file audio phát âm** (`cmn-*.mp3`).
  - Danh sách từ + phân cấp gốc: đại cương HSK 3.0 do CLEC/CTI (Bộ Giáo dục Trung Quốc)
    phát hành — dữ liệu dữ kiện.
  - Nghĩa tiếng Anh trong đó dựa trên **CC-CEDICT** (CC BY-SA 4.0) và **danh sách Pleco HSK 3.0**
    (MIT). Tần suất từ: **SUBTLEX-CH** / **BCC corpus** (CC BY-SA 4.0).

- **[ph0ngp/CVDICT — Từ điển Hán Việt](https://github.com/ph0ngp/CVDICT)** — Phong Phan.
  Giấy phép **CC BY-SA 4.0**. Nghĩa tiếng Việt (dịch từ CC-CEDICT bằng ChatGPT-4o fine-tune,
  rà soát một phần bằng tay — vẫn có thể còn sai sót).

## Bộ dữ liệu phái sinh của Hanni

`data/processed/words.seed.json` (10.9k từ, 9 cấp) do Hanni tổng hợp từ các nguồn trên,
**phát hành lại theo CC BY-SA 4.0** (điều khoản share-alike). Mã nguồn app không bị ràng
buộc bởi giấy phép này.

`data/curated/hsk1.json` — 70 từ HSK 1 có nghĩa tiếng Việt do người rà soát + câu ví dụ
tự soạn (CC BY-SA 4.0).

## Nội dung mẫu trang /nguon-du-lieu (tiếng Việt)

> Từ vựng, âm đọc và audio phát âm của Hanni lấy từ **krmanik/HSK-3.0** (CC BY-SA 4.0),
> nghĩa tiếng Việt từ **CVDICT** (CC BY-SA 4.0). Danh sách từ và phân cấp bám theo đại cương
> HSK 3.0 chính thức (CLEC/CTI, bản 2025-11). Nghĩa tiếng Anh và tần suất từ dựa trên
> CC-CEDICT, Pleco và SUBTLEX-CH / BCC corpus. Bộ dữ liệu tổng hợp lại được chia sẻ theo
> giấy phép CC BY-SA 4.0.
