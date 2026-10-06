/**
 * Dựng kế hoạch cho 1 PHIÊN HỌC BÀI — thay cho việc "học từ mới" bằng lật
 * flashcard SRS (4 nút Quên/Khó/Được/Dễ cho từ chưa từng thấy, người mới
 * không có gì để tự đánh giá). Theo cách HelloChinese/Duolingo: giới thiệu
 * từng nhóm nhỏ từ → luyện ngay nhóm đó bằng nhiều dạng câu → ôn trộn cả bài
 * ở cuối. Hàm thuần (nhận `rand` từ ngoài) để test được.
 */

export interface SessionExample {
  zh: string;
  pinyin: string | null;
  vi: string | null;
}

export interface SessionWordInput {
  id: string;
  simplified: string;
  meaningVi: string | null;
  audioUrl: string | null;
  examples: SessionExample[];
}

/** Từ cùng cấp dùng làm phương án nhiễu khi bài quá ít từ. */
export interface DistractorInput {
  simplified: string;
  meaningVi: string | null;
}

export type ChoicePrompt = 'hanzi' | 'meaning' | 'audio';

export type SessionStep =
  | { kind: 'intro'; wordId: string }
  | {
      kind: 'choice';
      wordId: string;
      prompt: ChoicePrompt;
      /** prompt 'hanzi' → các NGHĨA; 'meaning'/'audio' → các Hán tự. */
      options: string[];
      answer: number;
    }
  | { kind: 'match'; wordIds: string[] }
  | {
      kind: 'sentence';
      wordId: string;
      before: string;
      after: string;
      vi: string | null;
      options: string[];
      answer: number;
    };

const CHUNK = 4;
const OPTION_COUNT = 4;
const FINAL_REVIEW = 5;
const MAX_SENTENCES = 3;
const MATCH_MAX = 5;

/** Nghĩa ngắn gọn cho phương án trắc nghiệm: vế đầu trước ";", bỏ chú
 * thích trong ngoặc nếu phần còn lại không rỗng ("(khái niệm) thời gian" →
 * "thời gian"). Thẻ giới thiệu từ vẫn hiện nghĩa đầy đủ. */
export function shortMeaning(meaning: string): string {
  const first = meaning.split(';')[0].trim();
  const stripped = first
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const out = stripped || first;
  return out.length > 48 ? `${out.slice(0, 47).trimEnd()}…` : out;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK)
    out.push(items.slice(i, i + CHUNK));
  // Nhóm cuối chỉ 1 từ thì gộp vào nhóm trước — 1 từ thì không ghép cặp được.
  if (out.length > 1 && out[out.length - 1].length === 1)
    out[out.length - 2].push(...out.pop()!);
  return out;
}

interface Candidate {
  simplified: string;
  value: string;
}

/** Hai từ dùng chung chữ Hán (那里/那儿, 哪里/哪儿) thường gần nghĩa — làm
 * phương án nhiễu cho nhau là ra câu hỏi có 2 đáp án đúng. */
function sharesChar(a: string, b: string): boolean {
  const set = new Set(Array.from(a));
  return Array.from(b).some((c) => set.has(c));
}

/** Phương án đúng + tối đa 3 phương án nhiễu KHÁC NHAU (không trùng chữ,
 * không dùng chung chữ Hán với đáp án). */
function buildOptions(
  target: Candidate,
  sameLesson: Candidate[],
  fallback: Candidate[],
  rand: () => number,
): { options: string[]; answer: number } | null {
  const seen = new Set([target.value]);
  const picks: string[] = [];
  for (const pool of [shuffle(sameLesson, rand), shuffle(fallback, rand)]) {
    for (const c of pool) {
      if (picks.length === OPTION_COUNT - 1) break;
      if (!c.value || seen.has(c.value)) continue;
      if (sharesChar(c.simplified, target.simplified)) continue;
      seen.add(c.value);
      picks.push(c.value);
    }
  }
  if (picks.length < 2) return null;
  const options = shuffle([target.value, ...picks], rand);
  return { options, answer: options.indexOf(target.value) };
}

/** 1 câu trắc nghiệm ĐỨNG RIÊNG (không thuộc phiên học) — cho bài kiểm tra
 * trình độ: phương án nhiễu lấy từ `pool` (từ cùng cấp), cùng luật chống câu
 * hỏi 2 đáp án đúng như phiên học. */
export function buildChoiceStep(
  w: SessionWordInput,
  prompt: ChoicePrompt,
  pool: DistractorInput[],
  rand: () => number = Math.random,
): Extract<SessionStep, { kind: 'choice' }> | null {
  if (prompt === 'hanzi') {
    if (!w.meaningVi) return null;
    const built = buildOptions(
      { simplified: w.simplified, value: shortMeaning(w.meaningVi) },
      [],
      pool.flatMap((d) =>
        d.meaningVi
          ? [{ simplified: d.simplified, value: shortMeaning(d.meaningVi) }]
          : [],
      ),
      rand,
    );
    return built && { kind: 'choice', wordId: w.id, prompt, ...built };
  }
  if (prompt === 'audio' && !w.audioUrl) return null;
  if (prompt === 'meaning' && !w.meaningVi) return null;
  const built = buildOptions(
    { simplified: w.simplified, value: w.simplified },
    [],
    pool.map((d) => ({ simplified: d.simplified, value: d.simplified })),
    rand,
  );
  return built && { kind: 'choice', wordId: w.id, prompt, ...built };
}

/** Nhóm ghép cặp không được có 2 nghĩa trùng nhau hay 2 từ dùng chung chữ
 * Hán (没事/没关系 đều là "không sao") — bấm cặp nào cũng "đúng" mà bị chấm
 * sai. */
function matchable(words: SessionWordInput[]): SessionWordInput[] {
  const meanings = new Set<string>();
  const picked: SessionWordInput[] = [];
  for (const w of words) {
    if (!w.meaningVi) continue;
    const m = shortMeaning(w.meaningVi);
    if (meanings.has(m)) continue;
    if (picked.some((p) => sharesChar(p.simplified, w.simplified))) continue;
    meanings.add(m);
    picked.push(w);
  }
  return picked;
}

export function buildLessonSession(
  words: SessionWordInput[],
  distractors: DistractorInput[],
  rand: () => number = Math.random,
): SessionStep[] {
  const asMeaning = (w: DistractorInput): Candidate[] =>
    w.meaningVi
      ? [{ simplified: w.simplified, value: shortMeaning(w.meaningVi) }]
      : [];
  const asHanzi = (w: DistractorInput): Candidate[] => [
    { simplified: w.simplified, value: w.simplified },
  ];
  const lessonMeanings = words.flatMap(asMeaning);
  const lessonHanzi = words.flatMap(asHanzi);
  const extraMeanings = distractors.flatMap(asMeaning);
  const extraHanzi = distractors.flatMap(asHanzi);

  const choice = (
    w: SessionWordInput,
    prompt: ChoicePrompt,
  ): SessionStep | null => {
    // Không có audio thì không hỏi nghe; không có nghĩa thì chỉ hỏi nghe.
    const p: ChoicePrompt =
      prompt === 'audio' && !w.audioUrl
        ? 'hanzi'
        : !w.meaningVi && w.audioUrl
          ? 'audio'
          : prompt;
    if (p === 'hanzi') {
      const [target] = asMeaning(w);
      if (!target) return null;
      const built = buildOptions(target, lessonMeanings, extraMeanings, rand);
      return built && { kind: 'choice', wordId: w.id, prompt: p, ...built };
    }
    if (p === 'meaning' && !w.meaningVi) return null;
    const [target] = asHanzi(w);
    const built = buildOptions(target, lessonHanzi, extraHanzi, rand);
    return built && { kind: 'choice', wordId: w.id, prompt: p, ...built };
  };

  const ROTATION: ChoicePrompt[] = ['hanzi', 'audio', 'meaning'];
  const steps: SessionStep[] = [];
  const firstPrompt = new Map<string, ChoicePrompt>();

  chunks(words).forEach((group, gi) => {
    for (const w of group) steps.push({ kind: 'intro', wordId: w.id });
    const practice: SessionStep[] = [];
    group.forEach((w, i) => {
      const step = choice(w, ROTATION[(i + gi) % ROTATION.length]);
      if (step && step.kind === 'choice') {
        practice.push(step);
        firstPrompt.set(w.id, step.prompt);
      }
    });
    steps.push(...shuffle(practice, rand));
    const pairs = matchable(group);
    if (pairs.length >= 3)
      steps.push({ kind: 'match', wordIds: pairs.map((w) => w.id) });
  });

  // Ôn trộn cả bài: hỏi lại bằng DẠNG KHÁC lần đầu để buộc nhớ theo nhiều chiều.
  const final: SessionStep[] = [];
  for (const w of shuffle(words, rand).slice(0, FINAL_REVIEW)) {
    const first = firstPrompt.get(w.id);
    const next = ROTATION.find((p) => p !== first && p !== 'audio') ?? 'hanzi';
    const step = choice(w, next);
    if (step) final.push(step);
  }

  const sentences: SessionStep[] = [];
  for (const w of shuffle(words, rand)) {
    if (sentences.length === MAX_SENTENCES) break;
    const ex = w.examples.find((e) => e.zh.includes(w.simplified));
    if (!ex) continue;
    const at = ex.zh.indexOf(w.simplified);
    const [target] = asHanzi(w);
    // Nhiễu lấy từ BÀI KHÁC: từ cùng bài cùng loại (động từ với động từ) hay
    // điền vừa câu — "我是学生" mà nhiễu bằng 有 là 2 đáp án đều đọc được.
    const built = buildOptions(target, [], extraHanzi, rand);
    if (!built) continue;
    sentences.push({
      kind: 'sentence',
      wordId: w.id,
      before: ex.zh.slice(0, at),
      after: ex.zh.slice(at + w.simplified.length),
      vi: ex.vi,
      ...built,
    });
  }
  steps.push(...shuffle([...final, ...sentences], rand));

  const matchPool = matchable(shuffle(words, rand)).slice(0, MATCH_MAX);
  if (words.length > CHUNK && matchPool.length >= 3)
    steps.push({ kind: 'match', wordIds: matchPool.map((w) => w.id) });

  return steps;
}
