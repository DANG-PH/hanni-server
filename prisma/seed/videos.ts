import { PrismaClient, VideoKind } from '@prisma/client';
import { parseTranscript } from '../../src/modules/videos/transcript.util';

/**
 * Video mẫu để demo tính năng "Học qua video". youtubeId dùng 1 video luôn tồn tại
 * (để player + thumbnail hoạt động) — người dùng tự thay bằng video thật qua /watch/new.
 */
const SAMPLES: {
  youtubeId: string;
  title: string;
  titleZh: string;
  description: string;
  hskLevel: number;
  kind: VideoKind;
  transcript: string;
}[] = [
  {
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Bước nhỏ vẫn tiến về phía trước',
    titleZh: '小步，也能向前走',
    description: 'Podcast ngắn, giọng đọc chậm — phù hợp HSK 2–3. (Video mẫu)',
    hskLevel: 3,
    kind: VideoKind.PODCAST,
    transcript: [
      '[0:00] 大家好，欢迎来到今天的节目。 | Xin chào mọi người, chào mừng đến với chương trình hôm nay.',
      '[0:04] 希望你今天过得还不错。 | Mong hôm nay của bạn vẫn ổn.',
      '[0:08] 今天我们聊一个很简单的话题。 | Hôm nay chúng ta nói về một chủ đề rất đơn giản.',
      '[0:13] 那就是：每天进步一点点。 | Đó là: mỗi ngày tiến bộ một chút.',
      '[0:18] 学习语言不需要很快。 | Học ngôn ngữ không cần phải nhanh.',
      '[0:22] 只要每天坚持，就会看到变化。 | Chỉ cần mỗi ngày kiên trì, bạn sẽ thấy sự thay đổi.',
      '[0:28] 好，我们下期再见。 | Được rồi, hẹn gặp lại kỳ sau.',
    ].join('\n'),
  },
  {
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Ngày đầu tiên đi học của tôi',
    titleZh: '我的第一天上学',
    description: 'Câu chuyện ngắn, từ vựng cơ bản HSK 1–2. (Video mẫu)',
    hskLevel: 2,
    kind: VideoKind.STORY,
    transcript: [
      '今天是我第一天上学。 | Hôm nay là ngày đầu tiên tôi đi học.',
      '我很紧张，也很开心。 | Tôi rất hồi hộp, cũng rất vui.',
      '老师对我说：欢迎你。 | Cô giáo nói với tôi: Chào mừng em.',
      '同学们都很友好。 | Các bạn học đều rất thân thiện.',
      '我们一起读书，一起玩。 | Chúng tôi cùng nhau đọc sách, cùng nhau chơi.',
      '放学的时候，我已经交了新朋友。 | Lúc tan học, tôi đã có bạn mới.',
    ].join('\n'),
  },
];

export async function seedVideos(prisma: PrismaClient): Promise<void> {
  if ((await prisma.video.count()) > 0) {
    console.log('  ✓ Video đã có — bỏ qua video mẫu');
    return;
  }
  for (const s of SAMPLES) {
    const lines = parseTranscript(s.transcript);
    await prisma.video.create({
      data: {
        youtubeId: s.youtubeId,
        title: s.title,
        titleZh: s.titleZh,
        description: s.description,
        hskLevel: s.hskLevel,
        kind: s.kind,
        sentenceCount: lines.length,
        thumbnailUrl: `https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`,
        author: 'Hanni (mẫu)',
        lines: {
          create: lines.map((l) => ({
            index: l.index,
            startMs: l.startMs,
            zh: l.zh,
            pinyin: l.pinyin,
            pinyinNum: l.pinyinNum,
            vi: l.vi,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${SAMPLES.length} video mẫu`);
}
