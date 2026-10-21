/**
 * Đề thi thử HSK — kiểu dữ liệu nội dung đề (soạn tay ở `papers/`).
 *
 * Bám cấu trúc đề HSK HIỆN HÀNH (kỳ thi HSK 1–6 thường kỳ năm 2026 vẫn dùng
 * đề này; đề HSK 3.0 mới thi ở một số đợt riêng và chưa công bố đủ cấu trúc).
 * Tranh là emoji — không vướng bản quyền ảnh đề thật, hiển thị được trên mọi
 * máy; lời thoại phần nghe do client đọc bằng giọng tiếng Trung của trình
 * duyệt (`audio`), từ đơn có bản ghi âm thật thì server gắn thêm `audioUrl`.
 */

/** M = nam, F = nữ, N = giọng dẫn đọc câu hỏi ("问：…") như đề thật. */
export type SpeakerCode = 'M' | 'F' | 'N';

export interface SpeechLine {
  s: SpeakerCode;
  zh: string;
}

/** Tranh: emoji + nhãn tiếng Việt (chỉ hiện khi chữa bài — đề thật không ghi chú tranh). */
export interface Picture {
  e: string;
  vi: string;
}

interface ItemBase {
  /** Bản dịch tiếng Việt của lời thoại/câu hỏi — hiện khi chữa bài. */
  vi: string;
  /** Giải thích thêm cho câu dễ nhầm (vd suy luận "hôm nay thứ Tư → mai thứ Năm"). */
  explain?: string;
}

/** Nghe/đọc rồi đối chiếu với tranh: ✓ hay ✗. */
export interface JudgeItem extends ItemBase {
  audio?: SpeechLine[];
  text?: string;
  picture: Picture;
  answer: boolean;
}

/** Nghe 1 câu, chọn 1 trong 3 tranh. */
export interface ChoosePictureItem extends ItemBase {
  audio: SpeechLine[];
  pictures: Picture[];
  answer: number;
}

/** Nghe hội thoại / đọc câu, chọn tranh trong bộ tranh A–F dùng chung cả phần. */
export interface MatchPictureItem extends ItemBase {
  audio?: SpeechLine[];
  text?: string;
  answer: number;
}

/** Nghe câu + câu hỏi, chọn 1 trong 3 đáp án chữ; HSK 3 phần đọc 3 thì đọc
 * đoạn văn + câu hỏi ★ in trên đề. */
export interface ChooseTextItem extends ItemBase {
  audio?: SpeechLine[];
  text?: string;
  /** Câu hỏi ★ in trên đề (phần đọc) — phần nghe hỏi bằng lời ("问：…"). */
  question?: string;
  options: string[];
  answer: number;
}

/** Đọc 1 đoạn (HSK 2 phần đọc 3) hoặc nghe 1 đoạn (HSK 3 phần nghe 2) rồi xét
 * câu có dấu ★ in trên đề đúng hay sai. */
export interface JudgeTextItem extends ItemBase {
  audio?: SpeechLine[];
  text?: string;
  /** Câu ★ cần xét (không ghi dấu ★, client tự thêm). */
  statement: string;
  answer: boolean;
}

/** Sắp xếp các mảnh cho sẵn thành câu (HSK 3 phần viết 1). */
export interface OrderItem extends ItemBase {
  /** Các mảnh theo thứ tự in trên đề (đã xáo — spec kiểm tra không trùng
   * thứ tự đúng). */
  pieces: string[];
  /** Câu đúng, có dấu câu. Chấm sau khi bỏ dấu câu + khoảng trắng. */
  answer: string;
  /** Thứ tự khác cũng đúng (vd trạng ngữ thời gian trước/sau chủ ngữ). */
  alternatives?: string[];
}

/** Nhìn pinyin viết chữ vào chỗ trống (HSK 3 phần viết 2). Thi trên máy thì
 * gõ pinyin rồi chọn chữ trong danh sách bộ gõ đưa ra — ở đây chọn trong các
 * chữ đồng âm, khỏi bắt người học cài bàn phím tiếng Trung. */
export interface PinyinCharItem extends ItemBase {
  /** Câu có đúng 1 chỗ trống "（ ）". */
  text: string;
  /** Pinyin in trên chỗ trống (đứng đầu câu thì viết hoa, như đề thật). */
  pinyin: string;
  /** Chữ đồng âm để chọn, không lặp. */
  choices: string[];
  answer: number;
}

/** Nhìn tranh, dùng từ cho sẵn đặt 1 câu (HSK 4 phần viết 2). Đề thật do giám khảo chấm theo mức; ở đây chấm
 * tự động mức tối thiểu (`acceptableSentence`) và chữa bài bằng câu mẫu. */
export interface WriteSentenceItem extends ItemBase {
  picture: Picture;
  /** Từ bắt buộc dùng, in dưới tranh. */
  word: string;
  /** Câu mẫu (hiện khi chữa bài). */
  answer: string;
  /** Câu mẫu khác. */
  alternatives?: string[];
}

/** Ghép câu hỏi với câu trả lời / điền từ vào chỗ trống, dùng bộ A–F chung. */
export interface TextItem extends ItemBase {
  /** Với `fill-blank`: chỗ trống viết là "（ ）". */
  text: string;
  answer: number;
}

export type PaperPart = (
  | { type: 'judge'; items: JudgeItem[] }
  | { type: 'choose-picture'; items: ChoosePictureItem[] }
  | { type: 'match-picture'; pictures: Picture[]; items: MatchPictureItem[] }
  | { type: 'choose-text'; items: ChooseTextItem[] }
  | { type: 'match-text'; options: string[]; items: TextItem[] }
  | { type: 'fill-blank'; options: string[]; items: TextItem[] }
  | { type: 'judge-text'; items: JudgeTextItem[] }
  | { type: 'order'; items: OrderItem[] }
  | { type: 'pinyin-char'; items: PinyinCharItem[] }
  | { type: 'write-sentence'; items: WriteSentenceItem[] }
) & {
  /** Nửa sau của CÙNG 1 phần đề nhưng dùng bộ tranh/đáp án riêng (HSK 2: câu
   * 11–15 và 16–20 cùng là "第二部分") — đánh số phần, phân tích điểm gộp chung. */
  continues?: boolean;
};

export type SectionKind = 'listening' | 'reading' | 'writing';

export interface PaperSection {
  kind: SectionKind;
  parts: PaperPart[];
}

export interface MockPaper {
  slug: string;
  level: number;
  title: string;
  durationMin: number;
  sections: PaperSection[];
}

/** Số thứ tự phương án, ✓/✗, hoặc câu đã sắp xếp (dạng `order`). */
export type AnswerValue = number | boolean | string;
