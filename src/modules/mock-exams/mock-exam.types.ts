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

/** Nghe câu + câu hỏi, chọn 1 trong 3 đáp án chữ. */
export interface ChooseTextItem extends ItemBase {
  audio: SpeechLine[];
  options: string[];
  answer: number;
}

/** Ghép câu hỏi với câu trả lời / điền từ vào chỗ trống, dùng bộ A–F chung. */
export interface TextItem extends ItemBase {
  /** Với `fill-blank`: chỗ trống viết là "（ ）". */
  text: string;
  answer: number;
}

export type PaperPart =
  | { type: 'judge'; items: JudgeItem[] }
  | { type: 'choose-picture'; items: ChoosePictureItem[] }
  | { type: 'match-picture'; pictures: Picture[]; items: MatchPictureItem[] }
  | { type: 'choose-text'; items: ChooseTextItem[] }
  | { type: 'match-text'; options: string[]; items: TextItem[] }
  | { type: 'fill-blank'; options: string[]; items: TextItem[] };

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

export type AnswerValue = number | boolean;
