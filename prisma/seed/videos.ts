import { PrismaClient, VideoKind } from '@prisma/client';
import { pinyin } from 'pinyin-pro';
import { parseTranscript } from '../../src/modules/videos/transcript.util';
import { fetchTimedTranscript } from '../../src/modules/videos/youtube-transcript.util';

/**
 * Video mẫu = clip công khai thật trên YouTube.
 * - Video CÓ phụ đề tiếng Trung → lấy bản chép + MỐC THỜI GIAN THẬT (đồng bộ karaoke),
 *   dịch tiếng Việt do Hanni soạn.
 * - Video KHÔNG có phụ đề → dùng bản chép mẫu (thời gian ước lượng theo nhịp đọc).
 * Video `createdById = null` là nội dung hệ thống → seed lại sẽ làm mới.
 */

const hanOnly = (s: string) => s.replace(/[^\p{Script=Han}]/gu, '');

interface Sample {
  youtubeId: string;
  title: string;
  titleZh: string;
  author: string;
  description: string;
  hskLevel: number;
  kind: VideoKind;
  /** dịch theo thứ tự dòng (khớp phụ đề gốc đã lọc) */
  viByIndex?: (string | null)[];
  /** dịch tra theo chữ Hán của dòng (bỏ dấu câu / latin) */
  viByHan?: Record<string, string>;
  /** dùng khi video không có phụ đề tiếng Trung */
  fallback?: string;
}

const SAMPLES: Sample[] = [
  {
    youtubeId: 'o51Dsn7YTjw',
    title: 'Cuộc sống của Mary',
    titleZh: '玛丽的生活',
    author: 'Mandarin Click',
    description:
      'Truyện HSK 1–2, giọng đọc chậm. Phụ đề đồng bộ theo lời nói (mốc thời gian gốc từ YouTube).',
    hskLevel: 2,
    kind: VideoKind.STORY,
    viByHan: {
      玛丽今年十八岁: 'Mary năm nay mười tám tuổi.',
      她是美国人: 'Cô ấy là người Mỹ.',
      和爸爸妈妈住在北京: 'Sống cùng bố mẹ ở Bắc Kinh.',
      她的爸爸是老师: 'Bố cô ấy là giáo viên,',
      妈妈是医生: 'còn mẹ là bác sĩ.',
      年他们来中国工作: 'Năm 2015 họ đến Trung Quốc làm việc.',
      玛丽和他们一起来中国学习: 'Mary cùng họ đến Trung Quốc học.',
      他们有一只狗: 'Họ có một con chó.',
      小狗很可爱名字叫乐乐: 'Chú chó rất đáng yêu, tên là Lạc Lạc.',
      玛丽很喜欢和它一起玩儿: 'Mary rất thích chơi với nó.',
      他们来中国快六年了: 'Họ đến Trung Quốc gần sáu năm rồi,',
      认识了很多好朋友: 'quen được rất nhiều bạn tốt.',
      他们经常一起吃饭喝茶: 'Họ thường cùng nhau ăn cơm, uống trà.',
      玛丽的爸爸喜欢看书: 'Bố Mary thích đọc sách.',
      妈妈喜欢看电影买东西: 'Mẹ thích xem phim, mua sắm.',
      玛丽喜欢听歌学中文: 'Mary thích nghe nhạc, học tiếng Trung.',
      玛丽会说中文也会写字: 'Mary biết nói tiếng Trung, cũng biết viết chữ.',
      她在大学学习很好: 'Cô ấy học ở đại học rất tốt.',
      同学和老师都很喜欢她: 'Bạn học và thầy cô đều rất quý cô ấy.',
      下个月是妈妈的生日: 'Tháng sau là sinh nhật mẹ.',
      她想给妈妈买一件礼物: 'Cô ấy muốn mua cho mẹ một món quà.',
      但是她没有很多钱: 'Nhưng cô ấy không có nhiều tiền.',
      学校后面有一家饭店: 'Phía sau trường có một nhà hàng.',
      她上午八点去学校学习: 'Buổi sáng tám giờ cô ấy đến trường học,',
      下午四点去饭店工作: 'buổi chiều bốn giờ đi làm ở nhà hàng.',
      一个月后她有钱了: 'Một tháng sau, cô ấy có tiền rồi.',
      她给妈妈买了一件漂亮的衣服: 'Cô ấy mua cho mẹ một bộ quần áo đẹp.',
      给自己买了一本汉语书: 'Mua cho mình một quyển sách tiếng Hán.',
      生日的时候她给妈妈礼物: 'Hôm sinh nhật, cô ấy tặng quà cho mẹ.',
      妈妈看见漂亮的衣服很高兴: 'Mẹ nhìn thấy bộ quần áo đẹp, rất vui.',
      她和玛丽说: 'Mẹ nói với Mary:',
      谢谢你我的女儿: '“Cảm ơn con, con gái của mẹ.',
      妈妈爱你: 'Mẹ yêu con!”',
    },
  },
  {
    youtubeId: 'fbjSH487Hhc',
    title: 'Amber và mèo Tiền Tiền',
    titleZh: '你好，我是 Amber',
    author: 'Comprehensible Chinese',
    description:
      'TPRS siêu cơ bản: câu ngắn, lặp lại nhiều. Phụ đề đồng bộ theo lời nói.',
    hskLevel: 1,
    kind: VideoKind.STORY,
    viByIndex: [
      'Xin chào.',
      'Xin chào, tôi là Amber.',
      'Nó không phải Amber, nó là Tiền Tiền.',
      'Tôi ở nhà, nó không ở nhà.',
      'Nó ở quán bar.',
      'Tôi là Amber phải không?',
      'Phải, tôi là Amber.',
      'Nó là Amber phải không?',
      'Không, nó không phải Amber.',
      'Nó là Beyoncé phải không?',
      'Không, nó cũng không phải Beyoncé.',
      'Nó không phải Amber.',
      'Nó cũng không phải Beyoncé.',
      'Vậy nó là ai?',
      'Tiền Tiền.',
      'Nó là Tiền Tiền.',
      'Tôi có ở nhà không?',
      'Ở nhà, tôi ở nhà.',
      'Tiền Tiền có ở nhà không?',
      'Không, Tiền Tiền không ở nhà.',
      'Tiền Tiền có ở công ty không?',
      'Không, Tiền Tiền không ở công ty.',
      'Tiền Tiền không ở nhà, cũng không ở công ty.',
      'Vậy Tiền Tiền ở đâu?',
      'Ở quán bar, Tiền Tiền ở quán bar.',
      'Tôi thích uống cà phê.',
      'Tiền Tiền không thích uống cà phê.',
      'Nó thích uống rượu.',
      'Tôi uống cà phê ở nhà.',
      'Tiền Tiền uống rượu ở quán bar.',
      'Tôi có thích uống cà phê không?',
      'Thích, tôi thích uống cà phê.',
      'Nó có thích uống cà phê không?',
      'Không thích, nó không thích uống cà phê.',
      'Nó có thích uống rượu không?',
      'Thích, nó thích uống rượu.',
      'Nó có uống rượu ở nhà không?',
      'Không, nó không uống rượu ở nhà.',
      'Nó uống rượu ở quán bar.',
      'Xin chào, tôi là Amber.',
      'Nó không phải Amber, nó là Tiền Tiền.',
      'Tôi ở nhà, nó không ở nhà.',
      'Nó ở quán bar.',
      'Tôi thích uống cà phê.',
      'Nó không thích uống cà phê.',
      'Nó thích uống rượu.',
      'Tôi uống cà phê ở nhà.',
      'Nó uống rượu ở quán bar.',
      'Nó là Lạc Lạc.',
      'Lạc Lạc cũng ở quán bar.',
      'Nó không thích uống cà phê.',
      'cũng không thích uống rượu.',
      'Nó thích uống nước.',
      'Tiền Tiền thích Lạc Lạc.',
      'Nhưng Lạc Lạc không thích Tiền Tiền.',
      'Bạn có thích uống cà phê không?',
      'Tạm biệt, tạm biệt.',
    ],
  },
];

export async function seedVideos(prisma: PrismaClient): Promise<void> {
  await prisma.video.deleteMany({ where: { createdById: null } });

  let synced = 0;
  let count = 0;
  for (const s of SAMPLES) {
    const timed = await fetchTimedTranscript(s.youtubeId).catch(() => []);

    const lines =
      timed.length >= 3
        ? timed.map((tl, i) => ({
            index: i + 1,
            startMs: tl.startMs,
            zh: tl.zh,
            pinyin: pinyin(tl.zh, { toneType: 'symbol', nonZh: 'consecutive' }),
            pinyinNum: pinyin(tl.zh, { toneType: 'num', nonZh: 'consecutive' }),
            vi: s.viByIndex?.[i] ?? s.viByHan?.[hanOnly(tl.zh)] ?? null,
          }))
        : parseTranscript(s.fallback ?? '');

    if (lines.length < 3) {
      console.log(`  ⚠ Bỏ qua ${s.youtubeId}: không lấy được bản chép`);
      continue;
    }
    if (timed.length >= 3) synced += 1;
    count += 1;

    await prisma.video.create({
      data: {
        youtubeId: s.youtubeId,
        title: s.title,
        titleZh: s.titleZh,
        description: s.description,
        hskLevel: s.hskLevel,
        kind: s.kind,
        author: s.author,
        sentenceCount: lines.length,
        thumbnailUrl: `https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`,
        lines: { create: lines },
      },
    });
  }
  console.log(
    `  ✓ ${count} video mẫu (${synced} có phụ đề đồng bộ theo lời nói)`,
  );
}
