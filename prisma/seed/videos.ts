import { PrismaClient, VideoKind } from '@prisma/client';
import { parseTranscript } from '../../src/modules/videos/transcript.util';

/**
 * Video mẫu — dùng video công khai thật trên YouTube (kênh học tiếng Trung).
 * Bản chép là bản mẫu do Hanni soạn THEO CHỦ ĐỀ video (chưa phải phụ đề gốc từng câu);
 * thay bằng phụ đề thật khi có (qua /watch/new hoặc web admin sau này).
 * Video có `createdById = null` được coi là nội dung hệ thống → seed lại sẽ làm mới.
 */
const SAMPLES: {
  youtubeId: string;
  title: string;
  titleZh: string;
  author: string;
  description: string;
  hskLevel: number;
  kind: VideoKind;
  transcript: string;
}[] = [
  {
    youtubeId: 'rbLlUXT72C4',
    title: 'Nhà của tôi',
    titleZh: '我的家',
    author: 'Mandarin Click',
    description: 'Truyện ngắn HSK 1, giọng đọc chậm rõ. Bản chép mẫu theo chủ đề.',
    hskLevel: 1,
    kind: VideoKind.STORY,
    transcript: [
      '这是我的家。 | Đây là nhà của tôi.',
      '我的家不大，但是很干净。 | Nhà tôi không lớn, nhưng rất sạch sẽ.',
      '家里有三个房间。 | Trong nhà có ba phòng.',
      '这是我和妈妈的房间。 | Đây là phòng của tôi và mẹ.',
      '那是爸爸的房间。 | Kia là phòng của bố.',
      '客厅里有一个大电视。 | Trong phòng khách có một cái tivi lớn.',
      '我很喜欢我的家。 | Tôi rất thích nhà của mình.',
    ].join('\n'),
  },
  {
    youtubeId: 'o51Dsn7YTjw',
    title: 'Cuộc sống của Mary',
    titleZh: '玛丽的生活',
    author: 'Mandarin Click',
    description: 'Truyện ngắn HSK 1–2 về một ngày của Mary ở Bắc Kinh.',
    hskLevel: 2,
    kind: VideoKind.STORY,
    transcript: [
      '玛丽是一个美国人。 | Mary là người Mỹ.',
      '她现在住在北京。 | Bây giờ cô ấy sống ở Bắc Kinh.',
      '玛丽每天早上七点起床。 | Mỗi sáng Mary dậy lúc bảy giờ.',
      '她喜欢喝咖啡，也喜欢吃面包。 | Cô ấy thích uống cà phê, cũng thích ăn bánh mì.',
      '上午她去学校学习汉语。 | Buổi sáng cô ấy đến trường học tiếng Hán.',
      '下午她常常和朋友一起打篮球。 | Buổi chiều cô ấy thường chơi bóng rổ với bạn.',
      '晚上她在家看中文电影。 | Buổi tối cô ấy xem phim tiếng Trung ở nhà.',
    ].join('\n'),
  },
  {
    youtubeId: 'PcergOJuC1M',
    title: 'Cuộc sống một tuần',
    titleZh: '一周的生活',
    author: 'Mandarin Click',
    description: 'Nghe chậm HSK 1–2: kể lại các ngày trong tuần.',
    hskLevel: 2,
    kind: VideoKind.STORY,
    transcript: [
      '星期一到星期五，我要上班。 | Từ thứ Hai đến thứ Sáu, tôi phải đi làm.',
      '我每天八点半到公司。 | Mỗi ngày tôi đến công ty lúc tám giờ rưỡi.',
      '中午我在公司附近吃饭。 | Buổi trưa tôi ăn cơm gần công ty.',
      '星期三晚上我去学游泳。 | Tối thứ Tư tôi đi học bơi.',
      '星期六我常常睡到中午。 | Thứ Bảy tôi thường ngủ đến trưa.',
      '星期天我和家人一起去公园。 | Chủ nhật tôi cùng gia đình đi công viên.',
      '这就是我一个星期的生活。 | Đó là cuộc sống một tuần của tôi.',
    ].join('\n'),
  },
  {
    youtubeId: 'TAvSslliSQw',
    title: 'Buổi sáng',
    titleZh: '早上',
    author: 'Mandarin Click',
    description: 'Truyện ngắn HSK 2–3: một buổi sáng vội vã.',
    hskLevel: 3,
    kind: VideoKind.STORY,
    transcript: [
      '今天早上，我起床起得很晚。 | Sáng nay tôi dậy rất muộn.',
      '因为昨天晚上我睡得太晚了。 | Vì tối qua tôi ngủ quá muộn.',
      '我很快地刷牙、洗脸。 | Tôi nhanh chóng đánh răng, rửa mặt.',
      '早饭我只喝了一杯牛奶。 | Bữa sáng tôi chỉ uống một cốc sữa.',
      '出门的时候，外面下雨了。 | Lúc ra khỏi nhà thì bên ngoài trời mưa.',
      '我没带伞，只好跑到地铁站。 | Tôi không mang ô, đành chạy đến ga tàu điện ngầm.',
      '到公司的时候，我已经迟到了十分钟。 | Lúc đến công ty, tôi đã muộn mười phút.',
    ].join('\n'),
  },
  {
    youtubeId: 'iamQclBCfoY',
    title: 'Tôi bị cảm rồi',
    titleZh: '我感冒了',
    author: 'Mandarin Click',
    description: 'Truyện ngắn HSK 2–3: đi khám khi bị cảm.',
    hskLevel: 3,
    kind: VideoKind.STORY,
    transcript: [
      '这几天天气变冷了。 | Mấy hôm nay trời trở lạnh.',
      '昨天晚上我开始头疼、发烧。 | Tối qua tôi bắt đầu đau đầu, sốt.',
      '今天早上，我觉得更不舒服了。 | Sáng nay tôi thấy càng khó chịu hơn.',
      '我给公司打电话，请了一天假。 | Tôi gọi điện cho công ty, xin nghỉ một ngày.',
      '然后我去医院看了医生。 | Sau đó tôi đến bệnh viện khám bác sĩ.',
      '医生说我感冒了，要多喝水、多休息。 | Bác sĩ nói tôi bị cảm, phải uống nhiều nước và nghỉ ngơi nhiều.',
      '吃了药以后，我睡了一个下午。 | Sau khi uống thuốc, tôi ngủ cả buổi chiều.',
    ].join('\n'),
  },
  {
    youtubeId: 'nGJ60LoxCXk',
    title: 'Mỗi ngày tiến bộ 1%',
    titleZh: '每天进步百分之一',
    author: 'Everyday Chinese Chat',
    description: 'Podcast luyện nghe HSK 3–4 về thói quen học.',
    hskLevel: 3,
    kind: VideoKind.PODCAST,
    transcript: [
      '大家好，欢迎收听今天的节目。 | Xin chào mọi người, chào mừng nghe chương trình hôm nay.',
      '今天我想跟大家聊聊“每天进步百分之一”。 | Hôm nay tôi muốn trò chuyện về "mỗi ngày tiến bộ 1%".',
      '很多人学中文的时候，希望进步得很快。 | Nhiều người khi học tiếng Trung mong tiến bộ thật nhanh.',
      '但是我觉得，慢一点也没关系。 | Nhưng tôi nghĩ, chậm một chút cũng không sao.',
      '如果你每天学习二十分钟，一年以后会有很大的变化。 | Nếu mỗi ngày bạn học hai mươi phút, một năm sau sẽ thay đổi rất lớn.',
      '重要的不是速度，而是坚持。 | Điều quan trọng không phải tốc độ, mà là sự kiên trì.',
      '好，我们下次再见。 | Được rồi, hẹn gặp lại lần sau.',
    ].join('\n'),
  },
];

export async function seedVideos(prisma: PrismaClient): Promise<void> {
  // Làm mới nội dung hệ thống (createdById = null), giữ video do người dùng thêm.
  await prisma.video.deleteMany({ where: { createdById: null } });

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
        author: s.author,
        sentenceCount: lines.length,
        thumbnailUrl: `https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`,
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
