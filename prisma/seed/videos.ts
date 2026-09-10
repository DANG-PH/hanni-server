import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, VideoKind } from '@prisma/client';
import { pinyin } from 'pinyin-pro';
import { parseTranscript } from '../../src/modules/videos/transcript.util';
import { translateLinesToVi } from '../../src/modules/videos/translate.util';
import { fetchTimedTranscript } from '../../src/modules/videos/youtube-transcript.util';

/** Cache máy dịch: { [câu Hán]: bản dịch VI }. Commit để deploy khỏi gọi lại. */
const VI_CACHE_PATH = join(__dirname, 'vi-cache.json');
function loadViCache(): Map<string, string> {
  try {
    return new Map(
      Object.entries(
        JSON.parse(readFileSync(VI_CACHE_PATH, 'utf8')) as Record<string, string>,
      ),
    );
  } catch {
    return new Map();
  }
}
function saveViCache(cache: Map<string, string>): void {
  const obj = Object.fromEntries([...cache].sort());
  writeFileSync(VI_CACHE_PATH, JSON.stringify(obj, null, 1) + '\n');
}

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
  /** chỉ lấy N dòng đầu (video gốc quá dài, chỉ dịch phần trích đoạn) */
  maxLines?: number;
  /** thứ tự hiển thị (nhỏ hiện trước); mặc định theo vị trí trong mảng */
  sortOrder?: number;
}

const SAMPLES: Sample[] = [
  {
    youtubeId: 'wKM1rSEvMbo',
    title: 'Trói buộc phế tông: mỗi ngày được chia tu vi',
    titleZh: '绑定废宗，每人每天分我一点修为',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: nam chính xuyên không thành tông chủ một "phế tông", mở ra hệ thống mỗi ngày được đệ tử chia tu vi. Trọn bộ (~75 phút), phụ đề chạy đồng bộ theo lời nói. ~184 câu đầu dịch tay; phần còn lại do máy dịch miễn phí (có bảng thuật ngữ tu tiên) nên có thể thô/sai.',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
    viByIndex: [
      'Tông chủ ở trên,',
      'xin nhận đệ tử một lạy.',
      'Chúc mừng tông chủ kế vị.',
      'Tông môn hưng thịnh có hy vọng rồi.',
      'Chư vị, sao trên lệnh bài tông chủ này lại có vết máu?',
      'Ấy chà, tông chủ,',
      'tôi chợt nhớ ra ruộng thuốc chưa tưới nước.',
      'Đúng đúng đúng,',
      'chiều nay tôi còn phải đến chỗ trưởng lão học nữa.',
      'Rốt cuộc là chuyện gì vậy?',
      'Ba ngày trước, tôi xuyên không đến thế giới huyền huyễn này,',
      'trở thành một đệ tử của Thiên Huyền Tông.',
      'Cứ tưởng sẽ phải ngày ngày khổ luyện,',
      'không ngờ lại trực tiếp trở thành tông chủ Thiên Huyền Tông.',
      'Mà lạ ở chỗ,',
      'hình như ai cũng vội vàng tôn tôi làm tông chủ.',
      'Ngươi lại đây.',
      'Tô... tông chủ, ngài có gì dặn dò?',
      'Vì sao mọi người đều không muốn làm tông chủ,',
      'mà đều tôn tôi lên?',
      'Ngài thật sự không biết mình thực ra đã',
      'là tông chủ thứ mười của Thiên Huyền Tông năm nay rồi.',
      'Cái gì mà thứ mười?',
      'Vậy chín vị tông chủ trước đâu rồi?',
      'Đều chôn ở núi sau tông môn cả.',
      'Cỏ trên mộ chắc mọc cao hơn một mét rồi.',
      'Chết... chết hết rồi ư?',
      'Bọn người Ma giáo để nổi danh lập uy,',
      'mỗi lần đến, việc đầu tiên là giết tông chủ.',
      'Thảo nào ai cũng không muốn làm tông chủ.',
      'Tông chủ này ta không làm nữa.',
      'Ai thích thì làm.',
      'Không được đâu ạ!',
      'Tông chủ, khi kế vị ngài đã lập thiên đạo độc thệ,',
      'trói buộc với ngôi vị tông chủ.',
      'Muốn cởi bỏ là phải chịu thiên phạt.',
      'Mẹ kiếp.',
      'Ông trời, ông đùa tôi à?',
      'Bảy ngày sau, đường chủ Huyết Sát Đường sẽ đến "viếng thăm".',
      'Khi đó tông chủ các ngươi ra nghênh chiến,',
      'thì mới không diệt sạch cả môn.',
      'Xong rồi, tiêu hết rồi.',
      'Cái Thiên Huyền Tông chết tiệt này hại người quá.',
      'Chúc mừng ký chủ kích hoạt Hệ thống Cộng Tu Tông Môn.',
      'Trên dưới Huyền Tông mỗi ngày mỗi người tự động chia cho ngươi một điểm tu vi.',
      'Tu vi đã vào tài khoản.',
      'Tu vi +50.',
      'Mỗi người trong tông môn mỗi ngày đều chia cho ta một điểm tu vi.',
      'Chẳng cần tự tu luyện cũng mạnh lên được.',
      'Sướng thật đấy.',
      'Ha ha ha, có hệ thống này,',
      'có lẽ vẫn còn một tia sinh cơ.',
      'Chúc mừng ký chủ đột phá tu vi.',
      'Đột phá lên Luyện Khí tầng 3.',
      'Đột phá lên Luyện Khí tầng 4.',
      'Đột phá lên Luyện Khí tầng 6.',
      'Đột phá lên Luyện Khí tầng 9.',
      'Mới đó đã lên tới Luyện Khí tầng 9.',
      'Nghe nói thiên kiêu mạnh nhất trong tông',
      'từ Luyện Khí tầng 2 đột phá lên tầng 9',
      'ít nhất cũng mất 3 năm.',
      'Còn ta chỉ mất 5 ngày.',
      'Chỉ cần đột phá Trúc Cơ kỳ,',
      'đánh bại đường chủ Huyết Sát Đường cũng không phải là không thể.',
      'Đột phá Trúc Cơ kỳ',
      'còn cần 500 điểm tu vi.',
      'Nhưng ta chỉ còn hai ngày.',
      'Tốc độ vẫn chưa đủ nhanh.',
      'Nhắc nhở: nếu đệ tử tông môn không tu luyện,',
      'thì không thể chia tu vi cho ký chủ.',
      'Cũng tức là,',
      'những điểm chưa sáng này đều là đang lười biếng.',
      'Thế sao được.',
      'Chư vị đệ tử,',
      'kể từ hôm nay,',
      'mọi người phải chăm chỉ tu luyện,',
      'không được lơ là.',
      'Tu luyện thì có ích gì?',
      'Luyện tu vi lên cao,',
      'đợi Ma giáo đến,',
      'kẻ đầu tiên chúng nhắm tới chính là mình.',
      'Cho dù thành thiên kiêu thì đã sao?',
      'Chẳng phải vẫn là cái mạng bị chém để lập uy sao.',
      'Bọn mình cứ mặc kệ đi thôi,',
      'dù sao cũng sống thêm được vài ngày.',
      'Mẹ nó, các ngươi không nỗ lực tu luyện,',
      'thì ta tiêu đời.',
      'Được lắm, đã vậy chư vị lòng dạ thảnh thơi thế,',
      'truyền lệnh của ta:',
      'kể từ hôm nay,',
      'hễ ai bị ta bắt gặp không chăm tu luyện,',
      'sẽ được đề cử làm tông chủ kế nhiệm.',
      'Tông chủ kế nhiệm ư?',
      'Vậy chẳng phải chết chắc sao?',
      'Ngươi có còn là người không vậy?',
      'Nhãi con, đòi đấu với ta.',
      'Chúc mừng ký chủ đột phá lên Trúc Cơ tầng 2.',
      'Tốt lắm, có sức mạnh này,',
      'ít nhất cũng có tư cách đánh một trận.',
      'Chỉ có tu vi thì chưa đủ,',
      'còn cần một pháp khí thuận tay mới được.',
      'Phải rồi,',
      'kho báu tông môn.',
      'Đây là kho báu của Thiên Huyền Tông ư?',
      'Chư vị, cút hết lại đây cho ta.',
      'Tô... tông chủ, ngài có gì dặn?',
      'Đây mà là kho báu của Thiên Huyền Tông ta?',
      'Ngươi dám lừa ta.',
      'Tông chủ bớt giận.',
      'Mỗi lần Ma môn đến xâm phạm,',
      'đều cướp sạch sành sanh.',
      'Thêm nữa các tông chủ tiền nhiệm chết quá nhanh,',
      'cho nên, cho nên...',
      'Cho nên bảo vật đều bị các trưởng lão...',
      'Được, rất tốt.',
      'Đám trưởng lão đó ở đâu?',
      'Ồ, tân tông chủ đến rồi.',
      'Có việc gì thế?',
      'Giao nộp bảo vật tông môn ra đây.',
      'Ta phải đánh một trận với Ma môn.',
      'Bảo vật? Bảo vật gì cơ?',
      'Lão hủ không biết.',
      'Đúng đấy tông chủ,',
      'chẳng lẽ tu luyện tu đến hồ đồ rồi sao?',
      'Vậy đến lúc đó các ngươi đừng có hối hận.',
      'Lão phu việc gì phải hối hận?',
      'Vậy được.',
      'Kể từ hôm nay,',
      'các ngươi là ứng viên tông chủ kế nhiệm.',
      'Không được đâu ạ!',
      'Tông chủ, lão hủ tuổi đã cao,',
      'gánh không nổi chức tông chủ.',
      'Bảo vật ở đây.',
      'Đều ở đây cả.',
      'Còn cả quyển trục và trận pháp cũng ở đây rồi.',
      'Hừ, thế còn được.',
      'Tu vi hôm nay đã vào tài khoản.',
      'Chúc mừng ký chủ đột phá lên Trúc Cơ tầng 3.',
      'Tông chủ Thiên Huyền Tông ở đâu?',
      'Còn không cút ra chịu chết.',
      'Ngự không phi hành!',
      'Hóa ra là kẻ mạnh nhất Trúc Cơ.',
      'Tân tông chủ lần này e là toi rồi.',
      'Toi thì toi thôi.',
      'Bọn ta tôn tông chủ chẳng phải để cho lúc này sao?',
      'Nhỡ tân tông chủ chạy mất hoặc trốn không ra thì sao?',
      'Hắn dám kế thừa ngôi tông chủ,',
      'là đã lập thiên đạo độc thệ đấy.',
      'Bỏ chạy hoặc né tránh giao chiến sẽ bị trời đánh sét giáng.',
      'Luyện Khí tầng hai.',
      'Chút tu vi này mà cũng đòi làm tông chủ.',
      'Ngươi tưởng ta muốn làm tông chủ à?',
      'Chẳng qua bị lũ khốn này gạt.',
      'Cái gì mà đánh đánh giết giết, hại hòa khí lắm.',
      'Hay là chúng ta ngồi lại nói chuyện tử tế đi.',
      'Bớt lảm nhảm, bổn đường chủ cần mượn cái đầu trên cổ ngươi.',
      'Về còn có cái mà nộp nhiệm vụ.',
      'Chênh lệch quá lớn.',
      'Thằng nhóc chết chắc.',
      'Đúng vậy, dù chỉ là một đòn tùy tay của tu sĩ Trúc Cơ,',
      'cũng không phải tu sĩ Luyện Khí bình thường đỡ nổi.',
      'Trừ phi là Luyện Khí tầng 9 đại viên mãn... thế mà...',
      'Sao có thể chứ.',
      'Khí tức của hắn hóa ra là Luyện Khí tầng 9 đại viên mãn.',
      'Tốc độ tu luyện thế này chưa từng nghe thấy.',
      'Một tuần trước hắn còn chỉ là Luyện Khí tầng 2 mà.',
      'Con kiến hôi mà cũng dám làm ta bị thương.',
      'Tìm chết! Thôn Thiên!',
      'Là bí thuật độc môn của Huyết Ma Môn!',
      'Nghe nói dưới cú đánh nặng của chiêu này,',
      'chạm vào là chết.',
      'Tiếc thay, thiên kiêu như vậy hôm nay cũng phải ngã xuống.',
      'Nếu cho hắn thêm chút thời gian nữa...',
      'A a!',
      'Không đúng.',
      'Lại bị đánh văng đi.',
      'Chuyện... chuyện này sao có thể.',
      'Đó là tu sĩ Trúc Cơ đấy.',
      'Khoan đã, tông chủ đâu rồi?',
      'Chẳng lẽ bị đánh nát thành tro rồi?',
      'Ở... ở đằng kia.',
      'Ngự... ngự không phi hành... vỏn vẹn một tuần,',
      'tông chủ ngài ấy lại trúc cơ thành công rồi!',
      'Sao có thể chứ.',
    ],
  },
  {
    youtubeId: 'MSyCeuF3eyo',
    title: 'Tu tiên: từ điều của ta có thể mở hack',
    titleZh: '修仙：我的词条能开挂',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'y_ZX85ss8nk',
    title: 'Ra ngõ gặp may: thiếu chủ ăn chơi thống lĩnh tông môn',
    titleZh: '出门撞大运，纨绔少主统领宗门',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'tH6FIjh1Z8g',
    title: 'Chuyện trảm yêu của một người, một mập và một mèo đen',
    titleZh: '一人一胖一黑猫的斩妖日常',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên / trảm yêu (một người, một mập, một mèo đen đi diệt yêu). Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'bFN7fgGIUX4',
    title: 'Trước khi chạy nạn, ta đã chất đầy kho lương',
    titleZh: '逃荒前，我囤粮满仓',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên không (nữ chính về thời cổ, tích trữ lương thực trước nạn đói). Trọn bộ (~50 phút), bản chép chạy đồng bộ theo lời nói. Bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô.',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'r1X7c2RQOyo',
    title: 'Điền Điền bận trồng trọt: vườn quê có thú cưng',
    titleZh: '田田忙种田之田园有宠',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI dễ thương: xuyên không về làm ruộng, nuôi thú cưng ở vùng quê. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '8uEvs7pvEpY',
    title: 'Điền Điền bận trồng trọt: kỳ duyên tiếng thú',
    titleZh: '田田忙种田之兽语奇缘',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI dễ thương: xuyên không về làm ruộng, nghe hiểu được tiếng loài vật. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'wvpGf5OR8KI',
    title: 'Xuân Hòa thời cổ: trồng trọt, săn bắn, nuôi con',
    titleZh: '春禾在古代，种田打猎养娃的日子',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ấm áp: người mẹ xuyên không về thời cổ, vào rừng săn bắn, làm ruộng nuôi cả nhà. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
];

export async function seedVideos(prisma: PrismaClient): Promise<void> {
  await prisma.video.deleteMany({ where: { createdById: null } });

  const viCache = loadViCache();
  let synced = 0;
  let count = 0;
  let mt = 0;
  for (const [idx, s] of SAMPLES.entries()) {
    const fetched = await fetchTimedTranscript(s.youtubeId).catch(() => []);
    const timed = s.maxLines ? fetched.slice(0, s.maxLines) : fetched;

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

    // Dịch máy (miễn phí) cho các câu chưa có bản dịch tay.
    const missing = lines.filter((l) => l.vi == null && hanOnly(l.zh));
    if (missing.length) {
      const vis = await translateLinesToVi(
        missing.map((l) => l.zh),
        viCache,
      );
      missing.forEach((l, i) => {
        l.vi = vis[i];
        if (vis[i] != null) mt += 1;
      });
      saveViCache(viCache);
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
        sortOrder: s.sortOrder ?? 100 + idx,
        sentenceCount: lines.length,
        thumbnailUrl: `https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`,
        lines: { create: lines },
      },
    });
  }
  console.log(
    `  ✓ ${count} video mẫu (${synced} đồng bộ theo lời nói, ${mt} câu máy dịch)`,
  );
}
