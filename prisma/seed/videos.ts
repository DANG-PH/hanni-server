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
    sortOrder: 1,
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
    sortOrder: 2,
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
    sortOrder: 3,
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
    sortOrder: 20,
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
    sortOrder: 39,
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
    sortOrder: 40,
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
    sortOrder: 41,
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
    sortOrder: 42,
    title: 'Xuân Hòa thời cổ: trồng trọt, săn bắn, nuôi con',
    titleZh: '春禾在古代，种田打猎养娃的日子',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ấm áp: người mẹ xuyên không về thời cổ, vào rừng săn bắn, làm ruộng nuôi cả nhà. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  // --- Tu tiên ---
  {
    youtubeId: '1pi8kNxjTKU',
    sortOrder: 12,
    title: 'Tiểu công chúa Đại Đường là cục cưng của tiên môn',
    titleZh: '大唐小兕子是仙门团宠',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: công chúa Đại Đường xuyên vào giới tu tiên bái sư học đạo, qua lại giữa Đại Đường và tiên vực để bảo vệ người thân. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '1NMwCMkw2lM',
    sortOrder: 13,
    title: 'Mở đầu nhặt được đỉnh vỡ, ta từ phàm nhân tu thành tiên',
    titleZh: '开局捡残鼎，我从凡夫修成仙',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: thiếu niên nhặt được thần đỉnh tàn khuyết, từ đó bước lên con đường tu tiên. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '2PtyL6Fa7JQ',
    sortOrder: 14,
    title: 'Ta thu mua phế phẩm trong giới tu tiên, âm thầm vô địch (Phần 2)',
    titleZh: '在修仙界收废品的我，悄悄无敌了（第二季）',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: khởi nghiệp bằng nghề nhặt phế phẩm, luyện hóa đan dược pháp khí bỏ đi thành bảo vật, từng bước đánh bại kẻ thù lên đỉnh tiên giới. Phần 2. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '9BUh3NwimmI',
    sortOrder: 15,
    title: 'Cả lớp tu tiên trở về, người người Nguyên Anh còn ta đã Đại Thừa',
    titleZh: '全班修仙归来，你们元婴我大乘',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: cả lớp cùng xuyên không tu tiên rồi trở về, nhưng cảnh giới của nam chính bỏ xa tất cả bạn học. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'mpPAcCy2SdM',
    sortOrder: 16,
    title: 'Ta thu mua phế phẩm trong giới tu tiên, âm thầm vô địch (Phần 1)',
    titleZh: '在修仙界收废品的我，悄悄无敌了（第一季）',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: khởi nghiệp bằng nghề nhặt phế phẩm, luyện hóa đan dược pháp khí bỏ đi thành bảo vật, từng bước đánh bại kẻ thù lên đỉnh tiên giới. Phần 1 (video gốc dài nhất trong loạt — ghép 138 tập). Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu.',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'e6glSZuI400',
    sortOrder: 17,
    title: 'Con gái phi phàm, dũng cảm xông pha giới tu tiên',
    titleZh: '女儿不凡，勇闯修仙界',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: cô con gái mang tư chất phi phàm một mình xông pha giới tu tiên đầy hiểm nguy. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'oLrkimF62mg',
    sortOrder: 18,
    title: 'Tu tiên: mọi người nhìn ta cày cuốc điên cuồng',
    titleZh: '修仙：众人看我舔疯癫',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: nam chính bám trụ tiệm luyện đan, khổ luyện không ngừng, liên tục gặp cơ duyên thu thập thần công bí bảo, từng bước vươn lên đỉnh cao tu tiên. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'yC0NEyZavuM',
    sortOrder: 19,
    title: 'Phàm nhân tu tiên: đốt thọ nguyên nghịch chuyển đường tiên',
    titleZh: '凡人修仙：寿元燃烧逆仙途',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: một phàm nhân không tư chất, phải đốt thọ nguyên của chính mình để đổi lấy sức mạnh nghịch thiên trên con đường tu tiên. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  // --- Tổng tài / ngôn tình / xuyên không ---
  {
    youtubeId: '_N0c1DP5LBE',
    sortOrder: 27,
    title: 'Nữ nông dân dẫn gia đình làm giàu',
    titleZh: '农女带着家人致富',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình xuyên không: nữ y toàn năng xuyên về nhà nông, ly hôn chồng bội bạc, dẫn con về quê, nhờ không gian bồn báu mà buôn bán làm giàu giữa thời loạn. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'ee4793u6VcI',
    sortOrder: 28,
    title: 'Tổng tài, phu nhân lại bắt đầu ghi nợ mua dao rồi',
    titleZh: '总裁，夫人她又开始赊刀了',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình tổng tài: vì muốn phá lời nguyền chết yểu, cô gái bán dao ghi nợ gả cho phú hào số một, cùng nhau phá âm mưu, dần nảy sinh tình cảm. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'FS7L4SiP2bM',
    sortOrder: 29,
    title: 'Kiếp trước chết thảm chẳng ai thương, trùng sinh cả nhà họ Lệ nghe ta sai khiến',
    titleZh: '前世惨死无人怜，重生厉家全听我差遣',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình trùng sinh: kiếp trước chết oan không ai thương xót, kiếp này trở lại nắm quyền, khiến cả gia tộc phải nghe theo mình. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '9GUPXXMysRg',
    sortOrder: 30,
    title: 'Tổng tài là thần ẩm thực',
    titleZh: '总裁是食神',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình tổng tài: vị tổng tài bá đạo hóa ra là một thần ẩm thực ẩn danh, sau khi sa cơ đã trở lại giang hồ, vừa nấu ăn vừa vạch trần âm mưu để giành lại vị trí. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'AQBlOL_c1mE',
    sortOrder: 31,
    title: 'Bồn báu sinh tài, dẫn con về quê',
    titleZh: '宝盆生财携崽归乡',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình xuyên không: nữ y toàn năng xuyên không, gặp chồng bội bạc rồi ly hôn, dẫn con về quê, nhờ không gian bồn báu buôn bán làm giàu, tránh xa thời loạn. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '73Bn2GH2pTU',
    sortOrder: 32,
    title: 'Tông môn sủng ái độc nhất tiểu sư đệ? Ta xách thùng chạy trốn ngay trong đêm',
    titleZh: '宗门独宠小师弟？我连夜提桶跑路',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên sách: xuyên thành vai phụ lót đường cho nam chính, sau khi tỉnh ngộ liền vùng lên phản kháng số phận đã định sẵn. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'PpBvNtYprDo',
    sortOrder: 33,
    title: 'Xuyên thành đích nữ nhà tướng, tiểu thư đây quyết nghịch thiên đổi mệnh',
    titleZh: '穿成将门嫡女本小姐要逆天改命',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình xuyên không: xuyên thành đích nữ của một nhà tướng quân, quyết tâm thay đổi vận mệnh đã được định sẵn trong sách. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'qdviVy9zKj8',
    sortOrder: 34,
    title: 'Xuyên sách rồi, tiếng lòng của ta giấu không nổi',
    titleZh: '穿书后我的心声藏不住了',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên sách hài hước: sau khi xuyên vào tiểu thuyết, suy nghĩ trong lòng nữ chính cứ vô tình bị người khác nghe thấy hết, gây ra hàng loạt tình huống dở khóc dở cười. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'XzmrdcLWhT8',
    sortOrder: 35,
    title: 'Xuyên sách nghịch tập, thu phục phong ấn tôn chủ',
    titleZh: '穿书逆袭收服封印尊主',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên sách tu tiên: xuyên vào tiểu thuyết ở vị trí bất lợi, nữ chính từng bước nghịch tập, thu phục vị tôn chủ đang bị phong ấn. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '2TGgp1Mfho8',
    sortOrder: 36,
    title: 'Xuyên qua song phương: ta dùng lương thực chinh phục nữ đế thời cổ',
    titleZh: '双向穿梭：我在古代用粮食征服女帝',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên không nông nghiệp: có thể qua lại tự do giữa hiện đại và cổ đại, nam chính mang lương thực và kỹ thuật trồng trọt hiện đại về giúp nữ đế thời cổ, dần chiếm được lòng nàng. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'iDl2EMf8rRU',
    sortOrder: 37,
    title: 'Phu quân phản diện chỉ sủng mình ta, sao trăng xa xôi gửi về Nam Châu',
    titleZh: '反派夫君独宠我，星月迢迢寄南州',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình xuyên sách: xuyên thành vợ của nhân vật phản diện trong truyện, không ngờ vị phu quân này lại chỉ hết lòng sủng ái riêng mình nàng. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'COmDqMStWic',
    sortOrder: 38,
    title: 'Xuyên qua hai giới, Chanh Bảo thành cục cưng cả nhà',
    titleZh: '两界穿梭，柠宝成团宠',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI ngôn tình xuyên không dễ thương: cô bé Chanh Bảo có thể qua lại giữa hai thế giới, trở thành cục cưng được cả hai bên gia đình hết lòng che chở. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  // --- Tu tiên (đợt 2) ---
  {
    youtubeId: '0Zn2hHOnhA8',
    sortOrder: 4,
    title: 'Bồn tiên tụ bảo: chương linh giới',
    titleZh: '聚宝仙盆灵界篇',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: mang linh căn tạp năm hành, nam chính vẫn nghịch tập tu luyện, vượt ngàn dặm đến linh giới cứu người thương, trải bao thử thách để đạt được bí thuật và Cửu Thiên Huyền Hỏa. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'lfdRFjLVx40',
    sortOrder: 5,
    title: 'Ai bảo không linh căn thì không tu tiên được',
    titleZh: '谁说没灵根不能修仙的',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: tạp dịch không linh căn tình cờ nhặt được thanh kiếm gãy gỉ sét, phát hiện chỉ cần vung kiếm chém là có thể hấp thụ năng lượng, tự cường bản thân — không linh căn vẫn phá vào Luyện Khí, chấn động cả tông môn. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'Ut1_N1kcNjU',
    sortOrder: 6,
    title: 'Phàm nhân tu tiên: bắt đầu từ khi có được ký ức Đại Đế',
    titleZh: '凡人修仙从获得大帝记忆开始',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: sinh ra không linh căn, bị coi là phế vật tu tiên, nam chính bất ngờ nhận được truyền thừa Càn Khôn Ngọc của một vị Đại Đế, từ đó tung hoành con đường tu tiên. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'QFLusV6HWXk',
    sortOrder: 7,
    title: 'Phàm nhân tu tiên: ta dựa vào cây non nghịch chuyển đường tiên',
    titleZh: '凡人修仙：我靠小树苗逆仙途',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: tạp dịch linh căn kém tình cờ gặp được mầm linh dị, nuốt đan dược phế bỏ luyện thành bảo vật, âm thầm nhẫn nhịn tích lũy để cuối cùng nghịch tập phong thần. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'VX2YQTL1luk',
    sortOrder: 8,
    title: 'Bị đày đến ruộng hoang, linh căn phế lại trồng ra con đường tu tiên',
    titleZh: '发配荒田，废灵根种出修仙路',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: bị đày đến mảnh ruộng hoang vì linh căn phế bỏ, nam chính không nản lòng mà từ chính mảnh đất ấy trồng ra cả một con đường tu tiên cho riêng mình. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '4ObdsSjJBFA',
    sortOrder: 9,
    title: 'Kiếm Triều: phong lôi chiếu cốt',
    titleZh: '剑朝：风雷照骨',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên kiếm hiệp: trùng sinh trỗi dậy giữa thâm sơn tuyệt cảnh, dựa vào một thanh trường kiếm chém hết cường địch khắp thiên hạ, tiến đến đỉnh cao võ đạo chí tôn. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'NS98kS93YH8',
    sortOrder: 10,
    title: 'Trùng sinh rồi, ta không làm sư tôn ngốc nghếch nữa',
    titleZh: '重生后，我不当大冤种师尊了',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: trùng sinh trở về, vị sư tôn từng bị đệ tử lợi dụng lần này quyết không ngốc nghếch chịu thiệt nữa, dùng trí tuệ và bản lĩnh xoay chuyển cả cục diện tông môn. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'NQFJddPqAYc',
    sortOrder: 11,
    title: 'Tỉnh thức hệ thống trảm yêu, từ bổ khoái đến võ thần',
    titleZh: '觉醒斩妖系统，从捕快到武神',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI tu tiên: một bổ khoái bình thường tỉnh thức hệ thống trảm yêu, từng bước diệt trừ yêu ma, tu luyện trở thành võ thần vang danh thiên hạ. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 5,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  // --- Tổng tài / ngôn tình / xuyên không (đợt 2) ---
  {
    youtubeId: '8o8c_Htrt_E',
    sortOrder: 21,
    title: 'Xuyên thành pháo hôi rồi: không phải phản diện sao? Sao lại đòi ôm',
    titleZh: '穿成炮灰后：不是反派吗？怎么要抱抱',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên sách ngôn tình: xuyên nhầm vào thân phận một nhân vật phụ chết yểu, lỡ tay làm bị thương vị vương gia quyền khuynh triều dã, từng bước cẩn trọng hóa giải hết tai họa này đến tai họa khác. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'qoEAvY8N5Vg',
    sortOrder: 22,
    title: 'Hai chị em thân thiết cùng xuyên sách, nam chính và phản diện mỗi người ôm một',
    titleZh: '闺蜜双穿，男主反派我俩一人一个',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên sách ngôn tình hài hước: hai người bạn thân cùng xuyên vào tiểu thuyết, nhầm lẫn theo đuổi vị nhiếp chính vương, nữ chính bước vào kinh thành xoay chuyển mưu kế triều đình, mở ra hai tuyến tình yêu vừa hài vừa ngọt. Phần 2. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: '5Wix8Vba3SM',
    sortOrder: 23,
    title: 'Trùng sinh làm thần chứng khoán, ta nghịch tập cuộc đời',
    titleZh: '重生做股神，我逆袭人生',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI đô thị trùng sinh: quay lại quá khứ với ký ức về thị trường chứng khoán, nam chính từng bước xoay chuyển vận mệnh, nghịch tập từ tay trắng thành người đứng đỉnh cao. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'kXim9iK9kBE',
    sortOrder: 24,
    title: 'Ta là độc giả nam tần, chấn chỉnh não yêu đương của nữ tần',
    titleZh: '我男频读者，整治女频恋爱脑',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI xuyên không hài hước: một độc giả quen đọc tiểu thuyết nam chính xuyên vào thế giới tiểu thuyết nữ chính, phẫn nộ trước những tình tiết tiêu chuẩn kép vô lý, phá vỡ mọi khuôn sáo để nghịch chuyển cả triều đình. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'VxhOhjxC9jY',
    sortOrder: 25,
    title: 'Thần hào: mở đầu bị chia tay, kích hoạt hệ thống quay số',
    titleZh: '神豪：开局被分手,激活抽奖系统',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI đô thị hài hước: bị bạn gái chia tay và chế giễu ngay tại chỗ, nam chính bất ngờ kích hoạt hệ thống quay số thần hào, liên tục quay trúng đại lễ, nghịch tập cả cuộc đời. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
    hskLevel: 4,
    kind: VideoKind.STORY,
    maxLines: 1500,
  },
  {
    youtubeId: 'AHsMFfyIczo',
    sortOrder: 26,
    title: 'Hệ thống thần hào: mở đầu ràng buộc nữ đế, càn quét vạn cổ',
    titleZh: '神豪系统，开局绑定女帝，横扫万古',
    author: '破晓动漫社 Dawn Anime Club',
    description:
      'Hoạt hình AI huyền huyễn ngôn tình: mang nợ nần bị đẩy vào Ma Uyên, nam chính ràng buộc cùng nữ đế và một hệ thống nghịch thiên, càn quét khắp thiên tài các phương, từng bước trở thành vương phu vô địch của nữ đế. Bản chép chạy đồng bộ theo lời nói; bản dịch tiếng Việt do máy dịch miễn phí (có bảng thuật ngữ tu tiên) — đọc để nắm ý, có thể sai/thô. Trích ~90 phút đầu (video gốc là bản ghép nhiều tập, dài 2–3 tiếng).',
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
