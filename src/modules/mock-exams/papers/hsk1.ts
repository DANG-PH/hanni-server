import type { MockPaper, Picture } from '../mock-exam.types';

/**
 * 3 đề thi thử HSK 1 — Hanni tự soạn (không chép đề thật), chỉ dùng từ vựng
 * HSK 1 (300 từ, HSK 3.0) cộng vài tên riêng (北京, 上海, 越南, 大卫, 李月).
 * Cấu trúc đề HSK 1 hiện hành: Nghe 4 phần × 5 câu, Đọc 4 phần × 5 câu.
 * Đáp án đúng rải đều vị trí; mỗi phần ghép A–F có đúng 1 phương án thừa.
 */
const P = (e: string, vi: string): Picture => ({ e, vi });

export const HSK1_PAPERS: MockPaper[] = [
  {
    slug: 'hsk1-de-1',
    level: 1,
    title: 'HSK 1 — Đề 1',
    durationMin: 35,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'judge',
            items: [
              {
                audio: [{ s: 'F', zh: '打电话' }],
                picture: P('📞', 'gọi điện thoại'),
                answer: true,
                vi: 'gọi điện thoại',
              },
              {
                audio: [{ s: 'M', zh: '一只狗' }],
                picture: P('🐱', 'con mèo'),
                answer: false,
                vi: 'một con chó',
              },
              {
                audio: [{ s: 'F', zh: '三个苹果' }],
                picture: P('🍎🍎🍎', 'ba quả táo'),
                answer: true,
                vi: 'ba quả táo',
              },
              {
                audio: [{ s: 'M', zh: '很热' }],
                picture: P('🌧️', 'trời mưa'),
                answer: false,
                vi: 'rất nóng',
              },
              {
                audio: [{ s: 'F', zh: '看书' }],
                picture: P('📖', 'đọc sách'),
                answer: true,
                vi: 'đọc sách',
              },
            ],
          },
          {
            type: 'choose-picture',
            items: [
              {
                audio: [{ s: 'F', zh: '我想喝一杯茶。' }],
                pictures: [P('🥛', 'sữa'), P('🍵', 'trà'), P('🍚', 'cơm')],
                answer: 1,
                vi: 'Tôi muốn uống một cốc trà.',
              },
              {
                audio: [{ s: 'M', zh: '我坐飞机去中国。' }],
                pictures: [
                  P('🚆', 'tàu hoả'),
                  P('🚕', 'taxi'),
                  P('✈️', 'máy bay'),
                ],
                answer: 2,
                vi: 'Tôi đi máy bay sang Trung Quốc.',
              },
              {
                audio: [{ s: 'F', zh: '我家有一只狗。' }],
                pictures: [
                  P('🐶', 'con chó'),
                  P('🐱', 'con mèo'),
                  P('🐟', 'con cá'),
                ],
                answer: 0,
                vi: 'Nhà tôi có một con chó.',
              },
              {
                audio: [{ s: 'M', zh: '现在是下午三点。' }],
                pictures: [
                  P('🕗', '8 giờ'),
                  P('🕒', '3 giờ'),
                  P('🕘', '9 giờ'),
                ],
                answer: 1,
                vi: 'Bây giờ là ba giờ chiều.',
              },
              {
                audio: [{ s: 'F', zh: '她在医院工作，她是医生。' }],
                pictures: [
                  P('👨‍🏫', 'giáo viên'),
                  P('👩‍🍳', 'đầu bếp'),
                  P('👩‍⚕️', 'bác sĩ'),
                ],
                answer: 2,
                vi: 'Cô ấy làm việc ở bệnh viện, cô ấy là bác sĩ.',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🛒', 'đi siêu thị mua đồ'),
              P('😴', 'đang ngủ'),
              P('🍜', 'mì sợi'),
              P('📺', 'xem TV'),
              P('🚕', 'đi taxi'),
              P('🎤', 'hát'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你在做什么呢？' },
                  { s: 'F', zh: '我在看电视。' },
                ],
                answer: 3,
                vi: 'Nam: Bạn đang làm gì thế? — Nữ: Mình đang xem TV.',
              },
              {
                audio: [
                  { s: 'F', zh: '你想吃什么？' },
                  { s: 'M', zh: '我想吃面条儿。' },
                ],
                answer: 2,
                vi: 'Nữ: Anh muốn ăn gì? — Nam: Anh muốn ăn mì.',
              },
              {
                audio: [
                  { s: 'M', zh: '我们怎么去？' },
                  { s: 'F', zh: '坐出租车去吧。' },
                ],
                answer: 4,
                vi: 'Nam: Chúng ta đi bằng gì? — Nữ: Đi taxi đi.',
              },
              {
                audio: [
                  { s: 'F', zh: '你儿子呢？' },
                  { s: 'M', zh: '他在睡觉。' },
                ],
                answer: 1,
                vi: 'Nữ: Con trai anh đâu? — Nam: Nó đang ngủ.',
              },
              {
                audio: [
                  { s: 'M', zh: '明天你去哪儿？' },
                  { s: 'F', zh: '我去超市买东西。' },
                ],
                answer: 0,
                vi: 'Nam: Mai bạn đi đâu? — Nữ: Mình đi siêu thị mua đồ.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '我叫李月，我是老师。' },
                  { s: 'N', zh: '问：李月是做什么的？' },
                ],
                options: ['医生', '老师', '学生'],
                answer: 1,
                vi: 'Tôi tên là Lý Nguyệt, tôi là giáo viên. — Hỏi: Lý Nguyệt làm nghề gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '今天是星期三，我们明天去看电影。' },
                  { s: 'N', zh: '问：他们星期几去看电影？' },
                ],
                options: ['星期二', '星期三', '星期四'],
                answer: 2,
                vi: 'Hôm nay là thứ Tư, ngày mai chúng ta đi xem phim. — Hỏi: Họ đi xem phim vào thứ mấy?',
                explain:
                  'Hôm nay thứ Tư (星期三) nên "ngày mai" là thứ Năm (星期四).',
              },
              {
                audio: [
                  { s: 'F', zh: '这件衣服两百块，太贵了，我不买。' },
                  { s: 'N', zh: '问：那件衣服多少钱？' },
                ],
                options: ['二十块', '两百块', '两千块'],
                answer: 1,
                vi: 'Bộ quần áo này 200 đồng, đắt quá, tôi không mua. — Hỏi: Bộ quần áo đó bao nhiêu tiền?',
              },
              {
                audio: [
                  { s: 'M', zh: '我今天有点儿忙，晚上不回家吃饭了。' },
                  { s: 'N', zh: '问：他今天怎么样？' },
                ],
                options: ['很忙', '很高兴', '生病了'],
                answer: 0,
                vi: 'Hôm nay tôi hơi bận, buổi tối không về nhà ăn cơm. — Hỏi: Hôm nay anh ấy thế nào?',
              },
              {
                audio: [
                  { s: 'F', zh: '我女儿今年七岁，她在小学上学。' },
                  { s: 'N', zh: '问：她女儿多大了？' },
                ],
                options: ['六岁', '七岁', '十七岁'],
                answer: 1,
                vi: 'Con gái tôi năm nay 7 tuổi, cháu đang học tiểu học. — Hỏi: Con gái cô ấy bao nhiêu tuổi?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'judge',
            items: [
              {
                text: '出租车',
                picture: P('🚕', 'taxi'),
                answer: true,
                vi: 'taxi',
              },
              {
                text: '鸡蛋',
                picture: P('🍎', 'quả táo'),
                answer: false,
                vi: 'trứng gà',
              },
              {
                text: '电脑',
                picture: P('💻', 'máy tính'),
                answer: true,
                vi: 'máy tính',
              },
              {
                text: '下雨',
                picture: P('❄️', 'tuyết'),
                answer: false,
                vi: 'trời mưa',
              },
              {
                text: '医院',
                picture: P('🏥', 'bệnh viện'),
                answer: true,
                vi: 'bệnh viện',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🍚', 'cơm'),
              P('🎧', 'nghe nhạc'),
              P('🐶', 'chó con'),
              P('🛌', 'đi ngủ'),
              P('✍️', 'viết chữ'),
              P('🎬', 'phim'),
            ],
            items: [
              {
                text: '我很喜欢吃米饭。',
                answer: 0,
                vi: 'Tôi rất thích ăn cơm.',
              },
              {
                text: '她在写汉字。',
                answer: 4,
                vi: 'Cô ấy đang viết chữ Hán.',
              },
              {
                text: '这只小狗很漂亮。',
                answer: 2,
                vi: 'Chú chó con này rất đẹp.',
              },
              {
                text: '十一点了，我要睡觉了。',
                answer: 3,
                vi: 'Mười một giờ rồi, tôi phải đi ngủ đây.',
              },
              {
                text: '我在听中文歌。',
                answer: 1,
                vi: 'Tôi đang nghe bài hát tiếng Trung.',
              },
            ],
          },
          {
            type: 'match-text',
            options: [
              '不客气。',
              '我是越南人。',
              '三口人。',
              '在桌子上。',
              '好的，谢谢！',
              '七点。',
            ],
            items: [
              { text: '谢谢你！', answer: 0, vi: 'Cảm ơn bạn! — Không có gì.' },
              {
                text: '你是哪国人？',
                answer: 1,
                vi: 'Bạn là người nước nào? — Tôi là người Việt Nam.',
              },
              {
                text: '你家有几口人？',
                answer: 2,
                vi: 'Nhà bạn có mấy người? — Ba người.',
              },
              {
                text: '我的手机在哪儿？',
                answer: 3,
                vi: 'Điện thoại của tôi ở đâu? — Ở trên bàn.',
              },
              {
                text: '你几点起床？',
                answer: 5,
                vi: 'Bạn mấy giờ ngủ dậy? — Bảy giờ.',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['怎么', '开', '认识', '喝', '名字', '那儿'],
            items: [
              { text: '你叫什么（ ）？', answer: 4, vi: 'Bạn tên là gì?' },
              {
                text: '我（ ）王先生，他是我朋友。',
                answer: 2,
                vi: 'Tôi quen ông Vương, ông ấy là bạn tôi.',
              },
              {
                text: '你想（ ）水吗？',
                answer: 3,
                vi: 'Bạn có muốn uống nước không?',
              },
              {
                text: '这个汉字（ ）读？',
                answer: 0,
                vi: 'Chữ Hán này đọc thế nào?',
              },
              {
                text: '我爸爸会（ ）车。',
                answer: 1,
                vi: 'Bố tôi biết lái xe.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'hsk1-de-2',
    level: 1,
    title: 'HSK 1 — Đề 2',
    durationMin: 35,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'judge',
            items: [
              {
                audio: [{ s: 'F', zh: '睡觉' }],
                picture: P('🛌', 'đi ngủ'),
                answer: true,
                vi: 'đi ngủ',
              },
              {
                audio: [{ s: 'M', zh: '米饭' }],
                picture: P('🍜', 'mì sợi'),
                answer: false,
                vi: 'cơm',
              },
              {
                audio: [{ s: 'F', zh: '八点' }],
                picture: P('🕗', '8 giờ'),
                answer: true,
                vi: '8 giờ',
              },
              {
                audio: [{ s: 'M', zh: '火车' }],
                picture: P('🚆', 'tàu hoả'),
                answer: true,
                vi: 'tàu hoả',
              },
              {
                audio: [{ s: 'F', zh: '医生' }],
                picture: P('👩‍🏫', 'cô giáo'),
                answer: false,
                vi: 'bác sĩ',
              },
            ],
          },
          {
            type: 'choose-picture',
            items: [
              {
                audio: [{ s: 'F', zh: '我早上喝了一杯牛奶。' }],
                pictures: [P('🍵', 'trà'), P('🥛', 'sữa'), P('💧', 'nước')],
                answer: 1,
                vi: 'Buổi sáng tôi đã uống một cốc sữa.',
              },
              {
                audio: [{ s: 'M', zh: '今天很冷，外边在下雪。' }],
                pictures: [
                  P('🌧️', 'trời mưa'),
                  P('☀️', 'trời nắng'),
                  P('❄️', 'tuyết'),
                ],
                answer: 2,
                vi: 'Hôm nay rất lạnh, bên ngoài đang có tuyết rơi.',
              },
              {
                audio: [{ s: 'F', zh: '我们去商店买衣服吧。' }],
                pictures: [P('👕', 'quần áo'), P('📚', 'sách'), P('🍎', 'táo')],
                answer: 0,
                vi: 'Chúng ta đến cửa hàng mua quần áo đi.',
              },
              {
                audio: [{ s: 'M', zh: '他在开车。' }],
                pictures: [
                  P('🚲', 'xe đạp'),
                  P('🚗', 'lái ô tô'),
                  P('✈️', 'máy bay'),
                ],
                answer: 1,
                vi: 'Anh ấy đang lái xe.',
              },
              {
                audio: [{ s: 'F', zh: '我家有两只猫。' }],
                pictures: [
                  P('🐱', 'một con mèo'),
                  P('🐶🐶', 'hai con chó'),
                  P('🐱🐱', 'hai con mèo'),
                ],
                answer: 2,
                vi: 'Nhà tôi có hai con mèo.',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('📚', 'mua sách'),
              P('🍽️', 'ăn ở nhà hàng'),
              P('💻', 'máy tính'),
              P('🏫', 'trường học'),
              P('🐶', 'con chó'),
              P('📞', 'gọi điện thoại'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '喂，你在哪儿？' },
                  { s: 'F', zh: '我在学校。' },
                ],
                answer: 3,
                vi: 'Nam: A lô, em đang ở đâu? — Nữ: Em ở trường.',
              },
              {
                audio: [
                  { s: 'F', zh: '你们中午在哪儿吃饭？' },
                  { s: 'M', zh: '在饭店吃。' },
                ],
                answer: 1,
                vi: 'Nữ: Trưa các anh ăn cơm ở đâu? — Nam: Ăn ở nhà hàng.',
              },
              {
                audio: [
                  { s: 'M', zh: '这是你的电脑吗？' },
                  { s: 'F', zh: '是，是我的。' },
                ],
                answer: 2,
                vi: 'Nam: Đây là máy tính của bạn à? — Nữ: Vâng, của tôi.',
              },
              {
                audio: [
                  { s: 'F', zh: '你要去书店吗？' },
                  { s: 'M', zh: '对，我想买几本书。' },
                ],
                answer: 0,
                vi: 'Nữ: Anh định đi nhà sách à? — Nam: Ừ, anh muốn mua vài quyển sách.',
              },
              {
                audio: [
                  { s: 'M', zh: '你妈妈呢？' },
                  { s: 'F', zh: '她在打电话。' },
                ],
                answer: 5,
                vi: 'Nam: Mẹ em đâu? — Nữ: Mẹ đang gọi điện thoại.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '我今天下午不去学校，我去医院看病。' },
                  { s: 'N', zh: '问：她今天下午去哪儿？' },
                ],
                options: ['学校', '医院', '商店'],
                answer: 1,
                vi: 'Chiều nay tôi không đến trường, tôi đi bệnh viện khám bệnh. — Hỏi: Chiều nay cô ấy đi đâu?',
              },
              {
                audio: [
                  { s: 'M', zh: '这个杯子三块钱，那个杯子五块钱。' },
                  { s: 'N', zh: '问：那个杯子多少钱？' },
                ],
                options: ['三块', '八块', '五块'],
                answer: 2,
                vi: 'Cái cốc này 3 đồng, cái cốc kia 5 đồng. — Hỏi: Cái cốc kia bao nhiêu tiền?',
              },
              {
                audio: [
                  { s: 'F', zh: '我认识他，他是我同学。' },
                  { s: 'N', zh: '问：他是谁？' },
                ],
                options: ['她的同学', '她的老师', '她的哥哥'],
                answer: 0,
                vi: 'Tôi quen anh ấy, anh ấy là bạn học của tôi. — Hỏi: Anh ấy là ai?',
              },
              {
                audio: [
                  { s: 'M', zh: '昨天下雨了，我没去商店。' },
                  { s: 'N', zh: '问：昨天天气怎么样？' },
                ],
                options: ['很热', '下雨了', '下雪了'],
                answer: 1,
                vi: 'Hôm qua trời mưa, tôi không đi cửa hàng. — Hỏi: Thời tiết hôm qua thế nào?',
              },
              {
                audio: [
                  { s: 'F', zh: '我喜欢喝茶，我爸爸喜欢喝牛奶。' },
                  { s: 'N', zh: '问：她爸爸喜欢喝什么？' },
                ],
                options: ['茶', '水', '牛奶'],
                answer: 2,
                vi: 'Tôi thích uống trà, bố tôi thích uống sữa. — Hỏi: Bố cô ấy thích uống gì?',
                explain:
                  'Trà là thứ CÔ ẤY thích; câu hỏi hỏi về bố — đáp án là sữa (牛奶).',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'judge',
            items: [
              {
                text: '狗',
                picture: P('🐶', 'con chó'),
                answer: true,
                vi: 'con chó',
              },
              {
                text: '电脑',
                picture: P('📺', 'TV'),
                answer: false,
                vi: 'máy tính',
              },
              {
                text: '面包',
                picture: P('🍞', 'bánh mì'),
                answer: true,
                vi: 'bánh mì',
              },
              {
                text: '下雨',
                picture: P('☔', 'trời mưa'),
                answer: true,
                vi: 'trời mưa',
              },
              {
                text: '医院',
                picture: P('🏪', 'cửa hàng'),
                answer: false,
                vi: 'bệnh viện',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🚕', 'taxi'),
              P('🍵', 'mời trà'),
              P('👨‍👩‍👧', 'gia đình'),
              P('🐱', 'con mèo'),
              P('🕘', '9 giờ'),
              P('🏠', 'ngôi nhà'),
            ],
            items: [
              {
                text: '出租车来了，我们走吧。',
                answer: 0,
                vi: 'Taxi đến rồi, chúng ta đi thôi.',
              },
              {
                text: '王先生，请喝茶。',
                answer: 1,
                vi: 'Ông Vương, mời ông uống trà.',
              },
              {
                text: '这是我爸爸、妈妈和我。',
                answer: 2,
                vi: 'Đây là bố, mẹ và tôi.',
              },
              {
                text: '现在九点了，我们上课吧。',
                answer: 4,
                vi: 'Bây giờ chín giờ rồi, chúng ta vào học thôi.',
              },
              {
                text: '我家很大，有四个房间。',
                answer: 5,
                vi: 'Nhà tôi rất rộng, có bốn phòng.',
              },
            ],
          },
          {
            type: 'match-text',
            options: [
              '我二十岁。',
              '他是我的老师。',
              '坐火车去。',
              '没关系。',
              '我喜欢看电影。',
              '很好吃！',
            ],
            items: [
              { text: '对不起！', answer: 3, vi: 'Xin lỗi! — Không sao.' },
              {
                text: '你今年多大？',
                answer: 0,
                vi: 'Năm nay bạn bao nhiêu tuổi? — Tôi hai mươi tuổi.',
              },
              {
                text: '他是谁？',
                answer: 1,
                vi: 'Anh ấy là ai? — Anh ấy là thầy giáo của tôi.',
              },
              {
                text: '你们怎么去北京？',
                answer: 2,
                vi: 'Các bạn đi Bắc Kinh bằng gì? — Đi tàu hoả.',
              },
              {
                text: '这个菜怎么样？',
                answer: 5,
                vi: 'Món này thế nào? — Rất ngon!',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['岁', '本', '喜欢', '哪儿', '下', '吃'],
            items: [
              {
                text: '我的女儿今年三（ ）了。',
                answer: 0,
                vi: 'Con gái tôi năm nay ba tuổi rồi.',
              },
              {
                text: '你明天想去（ ）？',
                answer: 3,
                vi: 'Ngày mai bạn muốn đi đâu?',
              },
              {
                text: '桌子上有三（ ）书。',
                answer: 1,
                vi: 'Trên bàn có ba quyển sách.',
              },
              {
                text: '我很（ ）我的小猫。',
                answer: 2,
                vi: 'Tôi rất thích con mèo nhỏ của tôi.',
              },
              { text: '你（ ）饭了吗？', answer: 5, vi: 'Bạn ăn cơm chưa?' },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'hsk1-de-3',
    level: 1,
    title: 'HSK 1 — Đề 3',
    durationMin: 35,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'judge',
            items: [
              {
                audio: [{ s: 'M', zh: '唱歌' }],
                picture: P('🎤', 'hát'),
                answer: true,
                vi: 'hát',
              },
              {
                audio: [{ s: 'F', zh: '猫' }],
                picture: P('🐶', 'con chó'),
                answer: false,
                vi: 'con mèo',
              },
              {
                audio: [{ s: 'M', zh: '早上' }],
                picture: P('🌙', 'buổi tối'),
                answer: false,
                vi: 'buổi sáng',
              },
              {
                audio: [{ s: 'F', zh: '钱' }],
                picture: P('💴', 'tiền'),
                answer: true,
                vi: 'tiền',
              },
              {
                audio: [{ s: 'M', zh: '水果' }],
                picture: P('🍇', 'hoa quả'),
                answer: true,
                vi: 'hoa quả',
              },
            ],
          },
          {
            type: 'choose-picture',
            items: [
              {
                audio: [{ s: 'F', zh: '我坐火车去上海。' }],
                pictures: [
                  P('✈️', 'máy bay'),
                  P('🚆', 'tàu hoả'),
                  P('🚗', 'ô tô'),
                ],
                answer: 1,
                vi: 'Tôi đi tàu hoả đến Thượng Hải.',
              },
              {
                audio: [{ s: 'M', zh: '这些水果很便宜。' }],
                pictures: [
                  P('🍇', 'hoa quả'),
                  P('🍞', 'bánh mì'),
                  P('👕', 'quần áo'),
                ],
                answer: 0,
                vi: 'Những hoa quả này rất rẻ.',
              },
              {
                audio: [{ s: 'F', zh: '我想买一个新手机。' }],
                pictures: [
                  P('💻', 'máy tính'),
                  P('📺', 'TV'),
                  P('📱', 'điện thoại di động'),
                ],
                answer: 2,
                vi: 'Tôi muốn mua một chiếc điện thoại mới.',
              },
              {
                audio: [{ s: 'M', zh: '今天天气很好，不冷也不热。' }],
                pictures: [
                  P('🌧️', 'trời mưa'),
                  P('❄️', 'tuyết'),
                  P('☀️', 'trời đẹp'),
                ],
                answer: 2,
                vi: 'Hôm nay thời tiết rất đẹp, không lạnh cũng không nóng.',
              },
              {
                audio: [{ s: 'F', zh: '孩子们在外边玩。' }],
                pictures: [
                  P('📖', 'đọc sách'),
                  P('⚽', 'chơi bóng ngoài trời'),
                  P('🛌', 'đi ngủ'),
                ],
                answer: 1,
                vi: 'Bọn trẻ đang chơi ở bên ngoài.',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🍵', 'uống trà'),
              P('🏥', 'bệnh viện'),
              P('🐱', 'con mèo'),
              P('🎬', 'xem phim'),
              P('👕', 'quần áo'),
              P('🚗', 'lái xe'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你喜欢猫吗？' },
                  { s: 'F', zh: '喜欢，我家有一只。' },
                ],
                answer: 2,
                vi: 'Nam: Bạn có thích mèo không? — Nữ: Thích, nhà mình có một con.',
              },
              {
                audio: [
                  { s: 'F', zh: '明天我们去看电影，好吗？' },
                  { s: 'M', zh: '好的，几点？' },
                ],
                answer: 3,
                vi: 'Nữ: Mai chúng mình đi xem phim nhé? — Nam: Được, mấy giờ?',
              },
              {
                audio: [
                  { s: 'M', zh: '你的衣服真漂亮！' },
                  { s: 'F', zh: '谢谢，是昨天买的。' },
                ],
                answer: 4,
                vi: 'Nam: Quần áo của bạn đẹp thật! — Nữ: Cảm ơn, mình mới mua hôm qua.',
              },
              {
                audio: [
                  { s: 'F', zh: '你怎么了？' },
                  { s: 'M', zh: '我生病了，要去医院。' },
                ],
                answer: 1,
                vi: 'Nữ: Anh sao thế? — Nam: Anh bị ốm, phải đi bệnh viện.',
              },
              {
                audio: [
                  { s: 'M', zh: '你会开车吗？' },
                  { s: 'F', zh: '会，我开车去公司。' },
                ],
                answer: 5,
                vi: 'Nam: Bạn biết lái xe không? — Nữ: Biết, mình lái xe đến công ty.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'M', zh: '我中午十二点下课，下午两点上课。' },
                  { s: 'N', zh: '问：他几点下课？' },
                ],
                options: ['十点', '十二点', '两点'],
                answer: 1,
                vi: 'Tôi tan học lúc 12 giờ trưa, 2 giờ chiều vào học. — Hỏi: Anh ấy tan học lúc mấy giờ?',
                explain:
                  '2 giờ chiều (两点) là giờ VÀO học; tan học (下课) là 12 giờ trưa.',
              },
              {
                audio: [
                  { s: 'F', zh: '我有一个儿子，没有女儿。' },
                  { s: 'N', zh: '问：她有几个孩子？' },
                ],
                options: ['一个', '两个', '三个'],
                answer: 0,
                vi: 'Tôi có một con trai, không có con gái. — Hỏi: Cô ấy có mấy đứa con?',
              },
              {
                audio: [
                  { s: 'M', zh: '明天是星期天，我不上班，我想在家休息。' },
                  { s: 'N', zh: '问：他明天想做什么？' },
                ],
                options: ['上班', '在家休息', '去商店'],
                answer: 1,
                vi: 'Mai là Chủ nhật, tôi không đi làm, tôi muốn nghỉ ở nhà. — Hỏi: Ngày mai anh ấy muốn làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '我是去年来中国的，现在在大学学习汉语。' },
                  { s: 'N', zh: '问：她在大学做什么？' },
                ],
                options: ['工作', '看病', '学习汉语'],
                answer: 2,
                vi: 'Tôi sang Trung Quốc năm ngoái, bây giờ đang học tiếng Hán ở trường đại học. — Hỏi: Cô ấy làm gì ở trường đại học?',
              },
              {
                audio: [
                  { s: 'M', zh: '这个杯子是我的，那个是我妹妹的。' },
                  { s: 'N', zh: '问：那个杯子是谁的？' },
                ],
                options: ['他的', '他妹妹的', '他妈妈的'],
                answer: 1,
                vi: 'Cái cốc này là của tôi, cái kia là của em gái tôi. — Hỏi: Cái cốc kia là của ai?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'judge',
            items: [
              {
                text: '手机',
                picture: P('📱', 'điện thoại di động'),
                answer: true,
                vi: 'điện thoại di động',
              },
              {
                text: '狗',
                picture: P('🐱', 'con mèo'),
                answer: false,
                vi: 'con chó',
              },
              {
                text: '饺子',
                picture: P('🥟', 'bánh sủi cảo'),
                answer: true,
                vi: 'bánh sủi cảo',
              },
              {
                text: '飞机',
                picture: P('✈️', 'máy bay'),
                answer: true,
                vi: 'máy bay',
              },
              {
                text: '水',
                picture: P('🍵', 'trà'),
                answer: false,
                vi: 'nước',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🛒', 'đi siêu thị'),
              P('🎧', 'nghe nhạc'),
              P('🍎', 'quả táo'),
              P('🕖', '7 giờ'),
              P('🚶', 'đi bộ'),
              P('💼', 'đi làm'),
            ],
            items: [
              {
                text: '我七点起床。',
                answer: 3,
                vi: 'Tôi ngủ dậy lúc bảy giờ.',
              },
              {
                text: '我爸爸在公司工作。',
                answer: 5,
                vi: 'Bố tôi làm việc ở công ty.',
              },
              {
                text: '我们去超市买东西吧。',
                answer: 0,
                vi: 'Chúng ta đi siêu thị mua đồ đi.',
              },
              {
                text: '苹果很好吃，你吃一个吧。',
                answer: 2,
                vi: 'Táo rất ngon, bạn ăn một quả đi.',
              },
              { text: '我喜欢听歌。', answer: 1, vi: 'Tôi thích nghe nhạc.' },
            ],
          },
          {
            type: 'match-text',
            options: [
              '是，我是学生。',
              '在医院。',
              '我也很高兴认识你！',
              '四月八号。',
              '我想喝茶。',
              '不，我不会。',
            ],
            items: [
              {
                text: '我叫大卫，认识你很高兴。',
                answer: 2,
                vi: 'Tôi tên là David, rất vui được làm quen với bạn. — Tôi cũng rất vui được làm quen với bạn!',
              },
              {
                text: '你是学生吗？',
                answer: 0,
                vi: 'Bạn là học sinh à? — Vâng, tôi là học sinh.',
              },
              {
                text: '你想喝什么？',
                answer: 4,
                vi: 'Bạn muốn uống gì? — Tôi muốn uống trà.',
              },
              {
                text: '你会说汉语吗？',
                answer: 5,
                vi: 'Bạn biết nói tiếng Hán không? — Không, tôi không biết.',
              },
              {
                text: '今天几月几号？',
                answer: 3,
                vi: 'Hôm nay ngày mấy tháng mấy? — Ngày 8 tháng 4.',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['一点儿', '回', '再见', '会', '多少', '看'],
            items: [
              {
                text: '你明天几点（ ）家？',
                answer: 1,
                vi: 'Ngày mai mấy giờ bạn về nhà?',
              },
              {
                text: '这个苹果（ ）钱？',
                answer: 4,
                vi: 'Quả táo này bao nhiêu tiền?',
              },
              {
                text: '我（ ）写汉字。',
                answer: 3,
                vi: 'Tôi biết viết chữ Hán.',
              },
              {
                text: '女：我走了，明天见！男：（ ）！',
                answer: 2,
                vi: 'Nữ: Mình đi đây, mai gặp nhé! — Nam: Tạm biệt!',
              },
              { text: '我想（ ）电视。', answer: 5, vi: 'Tôi muốn xem TV.' },
            ],
          },
        ],
      },
    ],
  },
];
