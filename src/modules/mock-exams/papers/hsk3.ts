import type { MockPaper, Picture } from '../mock-exam.types';

/**
 * 3 đề thi thử HSK 3 — Hanni tự soạn (không chép đề thật), chỉ dùng chữ trong
 * từ vựng HSK 1–3 (HSK 3.0, ~1000 từ) cộng vài tên riêng — spec kiểm tra từng
 * chữ. Cấu trúc đề HSK 3 hiện hành (80 câu, 85 phút làm bài — đề thật ghi
 * "约90分钟" gồm 5 phút điền thông tin cá nhân):
 * - Nghe: 1–10 nghe hội thoại ghép tranh (1–5 bộ A–F thừa 1, 6–10 bộ A–E) ·
 *   11–20 nghe 1 đoạn, xét câu ★ in trên đề đúng/sai · 21–30 hội thoại 2 câu
 *   + câu hỏi chọn A/B/C · 31–40 hội thoại 4 câu + câu hỏi chọn A/B/C.
 * - Đọc: 41–50 ghép câu với câu đáp (41–45 bộ A–F, 46–50 bộ A–E) · 51–60 chọn
 *   từ điền chỗ trống (51–55 câu đơn, 56–60 hội thoại; mỗi bộ A–F thừa 1 —
 *   từ của câu ví dụ) · 61–70 đọc đoạn văn + câu hỏi ★ chọn A/B/C.
 * - Viết: 71–75 sắp xếp từ thành câu · 76–80 nhìn pinyin viết chữ (chọn trong
 *   6 chữ đồng âm, như gõ pinyin rồi chọn chữ khi thi trên máy).
 * Từ đề HSK 3 không in pinyin trên chữ (người học tự bật được).
 */
const P = (e: string, vi: string): Picture => ({ e, vi });

export const HSK3_PAPERS: MockPaper[] = [
  {
    slug: 'hsk3-de-1',
    level: 3,
    title: 'HSK 3 — Đề 1',
    durationMin: 85,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'match-picture',
            pictures: [
              P('🎂', 'bánh sinh nhật'),
              P('🚲', 'đạp xe'),
              P('🧳', 'vali hành lý'),
              P('🏸', 'cầu lông'),
              P('📷', 'máy ảnh'),
              P('🍦', 'kem'),
            ],
            items: [
              {
                audio: [
                  { s: 'F', zh: '你的箱子怎么这么重？' },
                  { s: 'M', zh: '里面有很多书，还有给朋友的礼物。' },
                ],
                answer: 2,
                vi: 'Nữ: Vali của anh sao nặng thế? — Nam: Trong đó có nhiều sách, còn có quà cho bạn nữa.',
              },
              {
                audio: [
                  { s: 'M', zh: '周末我们去公园骑自行车，怎么样？' },
                  { s: 'F', zh: '好啊，我很久没骑了。' },
                ],
                answer: 1,
                vi: 'Nam: Cuối tuần mình ra công viên đạp xe nhé? — Nữ: Được đấy, lâu lắm rồi em chưa đạp xe.',
              },
              {
                audio: [
                  { s: 'F', zh: '这是你拍的照片吗？真好看！' },
                  { s: 'M', zh: '是啊，我新买了一个相机。' },
                ],
                answer: 4,
                vi: 'Nữ: Đây là ảnh anh chụp à? Đẹp quá! — Nam: Ừ, anh mới mua một chiếc máy ảnh.',
              },
              {
                audio: [
                  { s: 'M', zh: '天气太热了，我们去买冰激凌吧。' },
                  { s: 'F', zh: '好，我要一个大的。' },
                ],
                answer: 5,
                vi: 'Nam: Trời nóng quá, mình đi mua kem đi. — Nữ: Được, em lấy một cái to.',
              },
              {
                audio: [
                  { s: 'F', zh: '你每天下班以后做什么运动？' },
                  { s: 'M', zh: '我常常和同事去打羽毛球。' },
                ],
                answer: 3,
                vi: 'Nữ: Ngày nào tan làm anh cũng chơi môn gì? — Nam: Anh hay đi đánh cầu lông với đồng nghiệp.',
              },
            ],
          },
          {
            type: 'match-picture',
            continues: true,
            pictures: [
              P('🌸', 'hoa nở'),
              P('🤒', 'bị sốt'),
              P('🍜', 'mì ăn liền'),
              P('🐼', 'gấu trúc'),
              P('🧹', 'quét dọn'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你怎么了？脸这么红。' },
                  { s: 'F', zh: '我好像发烧了，头也有点儿疼。' },
                ],
                answer: 1,
                vi: 'Nam: Em sao thế? Mặt đỏ thế kia. — Nữ: Hình như em bị sốt rồi, đầu cũng hơi đau.',
              },
              {
                audio: [
                  { s: 'F', zh: '动物园里的大熊猫真可爱！' },
                  { s: 'M', zh: '是啊，它一直在吃东西。' },
                ],
                answer: 3,
                vi: 'Nữ: Gấu trúc trong sở thú đáng yêu thật! — Nam: Ừ, nó cứ ăn suốt.',
              },
              {
                audio: [
                  { s: 'M', zh: '你的房间怎么这么干净？' },
                  { s: 'F', zh: '我上午打扫了两个小时。' },
                ],
                answer: 4,
                vi: 'Nam: Phòng em sao sạch thế? — Nữ: Sáng nay em dọn mất hai tiếng.',
              },
              {
                audio: [
                  { s: 'F', zh: '晚饭吃什么？' },
                  { s: 'M', zh: '家里只有方便面了，我们就吃这个吧。' },
                ],
                answer: 2,
                vi: 'Nữ: Tối nay ăn gì? — Nam: Nhà chỉ còn mì ăn liền thôi, mình ăn tạm cái này nhé.',
              },
              {
                audio: [
                  { s: 'M', zh: '你看，那边的树都开花了。' },
                  { s: 'F', zh: '春天来了，公园里真漂亮。' },
                ],
                answer: 0,
                vi: 'Nam: Em xem, cây bên kia nở hoa hết rồi. — Nữ: Mùa xuân đến rồi, công viên đẹp thật.',
              },
            ],
          },
          {
            type: 'judge-text',
            items: [
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我家离公司不太远，平时我都骑自行车去上班，只要二十分钟。可是今天下大雨，所以我坐出租车去了。',
                  },
                ],
                statement: '他今天骑自行车去上班。',
                answer: false,
                vi: 'Nhà tôi cách công ty không xa lắm, bình thường tôi đạp xe đi làm, chỉ mất hai mươi phút. Nhưng hôm nay mưa to nên tôi đi taxi. ★ Hôm nay anh ấy đạp xe đi làm.',
                explain:
                  'Bình thường (平时) mới đạp xe — hôm nay mưa nên đi taxi.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我的妹妹今年十八岁，她特别喜欢画画儿，每个周末都去公园画画儿。她说以后想当一个画家。',
                  },
                ],
                statement: '妹妹想当画家。',
                answer: true,
                vi: 'Em gái tôi năm nay mười tám tuổi, nó rất thích vẽ, cuối tuần nào cũng ra công viên vẽ tranh. Nó nói sau này muốn làm hoạ sĩ. ★ Em gái muốn làm hoạ sĩ.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '这个超市的水果又新鲜又便宜，所以每天来买东西的人都很多。但是晚上八点就关门了，你最好早点儿去。',
                  },
                ],
                statement: '那个超市晚上很晚才关门。',
                answer: false,
                vi: 'Hoa quả ở siêu thị này vừa tươi vừa rẻ nên ngày nào cũng đông người mua. Nhưng 8 giờ tối đã đóng cửa rồi, bạn nên đi sớm một chút. ★ Siêu thị đó tối rất muộn mới đóng cửa.',
                explain:
                  '八点就关门了 — "就" nhấn mạnh 8 giờ đã đóng, tức là đóng sớm.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我刚来北京的时候，一句汉语也不会说。后来我每天都和中国同学聊天儿，现在我的汉语水平提高了很多。',
                  },
                ],
                statement: '她现在的汉语还是不太好。',
                answer: false,
                vi: 'Hồi mới đến Bắc Kinh, tôi không nói được câu tiếng Trung nào. Sau đó ngày nào tôi cũng trò chuyện với bạn học Trung Quốc, giờ trình độ tiếng Trung của tôi đã tiến bộ nhiều. ★ Bây giờ tiếng Trung của cô ấy vẫn chưa tốt lắm.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '小王，明天的会议下午三点开始，在八层的会议室。你告诉其他同事一下，别让大家走错了。',
                  },
                ],
                statement: '明天的会议在下午。',
                answer: true,
                vi: 'Tiểu Vương, cuộc họp ngày mai bắt đầu lúc 3 giờ chiều, ở phòng họp tầng 8. Cậu báo các đồng nghiệp khác một tiếng, đừng để mọi người đi nhầm. ★ Cuộc họp ngày mai vào buổi chiều.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我的爱好是运动。春天爬山，夏天游泳，冬天跑步。我觉得多运动对身体很好。',
                  },
                ],
                statement: '她夏天常常去游泳。',
                answer: true,
                vi: 'Sở thích của tôi là thể thao. Mùa xuân leo núi, mùa hè bơi, mùa đông chạy bộ. Tôi thấy vận động nhiều rất tốt cho sức khoẻ. ★ Mùa hè cô ấy hay đi bơi.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我昨天在网上买了一件衬衫，今天就收到了。颜色我很喜欢，就是有点儿小，我想换一件大一点儿的。',
                  },
                ],
                statement: '他觉得衬衫的颜色不好看。',
                answer: false,
                vi: 'Hôm qua tôi mua một chiếc áo sơ mi trên mạng, hôm nay đã nhận được. Màu thì tôi rất thích, chỉ có điều hơi chật, tôi muốn đổi cái to hơn một chút. ★ Anh ấy thấy màu áo không đẹp.',
                explain:
                  '颜色我很喜欢 — thích màu; vấn đề là áo hơi nhỏ (就是有点儿小).',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我每天早上都喝一杯咖啡，不喝的话，上班的时候总是想睡觉。但是医生说咖啡不能喝得太多。',
                  },
                ],
                statement: '她早上习惯喝咖啡。',
                answer: true,
                vi: 'Sáng nào tôi cũng uống một cốc cà phê, không uống thì lúc làm việc lúc nào cũng buồn ngủ. Nhưng bác sĩ nói không được uống quá nhiều cà phê. ★ Buổi sáng cô ấy có thói quen uống cà phê.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我家楼下新开了一家饭馆，菜做得不错，就是人太多了，常常要等半个小时才能吃上饭。',
                  },
                ],
                statement: '那家饭馆的菜很好吃。',
                answer: true,
                vi: 'Dưới nhà tôi mới mở một quán ăn, nấu ăn khá ngon, chỉ có điều đông người quá, thường phải đợi nửa tiếng mới được ăn. ★ Đồ ăn của quán đó rất ngon.',
                explain: '菜做得不错 — món ăn nấu khá ngon, tức là ngon.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '这次考试我准备得不太好，很多题都不会做。我决定以后上课认真听，每天复习，下次一定要考好。',
                  },
                ],
                statement: '她这次考得很好。',
                answer: false,
                vi: 'Kỳ thi này tôi chuẩn bị không tốt lắm, nhiều câu không làm được. Tôi quyết định sau này lên lớp sẽ chăm chú nghe giảng, ngày nào cũng ôn bài, lần sau nhất định phải thi tốt. ★ Lần này cô ấy thi rất tốt.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '你怎么现在才来？电影已经开始十分钟了。' },
                  { s: 'M', zh: '对不起，路上车太多了。' },
                  { s: 'N', zh: '问：男的为什么来晚了？' },
                ],
                options: ['起床晚了', '路上车多', '忘记时间了'],
                answer: 1,
                vi: 'Nữ: Sao giờ anh mới đến? Phim bắt đầu mười phút rồi. — Nam: Xin lỗi, trên đường đông xe quá. Hỏi: Vì sao người nam đến muộn?',
              },
              {
                audio: [
                  { s: 'M', zh: '你好，我想换一个安静一点儿的房间。' },
                  { s: 'F', zh: '好的，十层有一个房间，那里很安静。' },
                  { s: 'N', zh: '问：他们最可能在哪儿？' },
                ],
                options: ['宾馆', '医院', '教室'],
                answer: 0,
                vi: 'Nam: Chào chị, tôi muốn đổi sang một phòng yên tĩnh hơn. — Nữ: Vâng, tầng mười có một phòng, ở đó rất yên tĩnh. Hỏi: Họ nhiều khả năng đang ở đâu?',
                explain: 'Đổi phòng (换房间) → khách sạn (宾馆).',
              },
              {
                audio: [
                  { s: 'F', zh: '这个西瓜多少钱？' },
                  { s: 'M', zh: '一斤两块五，这个西瓜八斤，一共二十块。' },
                  { s: 'N', zh: '问：这个西瓜多少钱？' },
                ],
                options: ['两块五', '八块', '二十块'],
                answer: 2,
                vi: 'Nữ: Quả dưa hấu này bao nhiêu tiền? — Nam: Hai tệ rưỡi một cân, quả này tám cân, tổng cộng hai mươi tệ. Hỏi: Quả dưa hấu này bao nhiêu tiền?',
                explain: 'Hai tệ rưỡi là giá MỘT cân — cả quả là 一共二十块.',
              },
              {
                audio: [
                  { s: 'M', zh: '你看见我的手机了吗？我找了半天也没找到。' },
                  { s: 'F', zh: '不是在沙发上吗？我刚才还看见了。' },
                  { s: 'N', zh: '问：手机可能在哪儿？' },
                ],
                options: ['沙发上', '桌子上', '包里'],
                answer: 0,
                vi: 'Nam: Em có thấy điện thoại của anh không? Anh tìm mãi không thấy. — Nữ: Chẳng phải ở trên ghế sofa à? Vừa nãy em còn thấy. Hỏi: Điện thoại có thể ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '明天就要考试了，你复习得怎么样了？' },
                  { s: 'M', zh: '差不多了，就是数学还有几个题不太懂。' },
                  { s: 'N', zh: '问：男的哪门课还有问题？' },
                ],
                options: ['汉语', '数学', '历史'],
                answer: 1,
                vi: 'Nữ: Mai thi rồi, anh ôn đến đâu rồi? — Nam: Gần xong rồi, chỉ có môn toán còn mấy bài chưa hiểu lắm. Hỏi: Người nam còn vướng môn nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '下个月我要去上海参加一个会议。' },
                  { s: 'F', zh: '去几天？要不要我帮你买机票？' },
                  { s: 'N', zh: '问：男的下个月去上海做什么？' },
                ],
                options: ['旅游', '看朋友', '参加会议'],
                answer: 2,
                vi: 'Nam: Tháng sau anh phải đi Thượng Hải dự một cuộc họp. — Nữ: Đi mấy ngày? Có cần em mua vé máy bay giúp không? Hỏi: Tháng sau người nam đến Thượng Hải làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你今天穿的衬衫真好看，是新买的吗？' },
                  { s: 'M', zh: '不是，是我妻子送给我的生日礼物。' },
                  { s: 'N', zh: '问：衬衫是谁送的？' },
                ],
                options: ['妻子', '妈妈', '同事'],
                answer: 0,
                vi: 'Nữ: Hôm nay anh mặc áo sơ mi đẹp thật, mới mua à? — Nam: Không, là quà sinh nhật vợ anh tặng. Hỏi: Áo sơ mi là ai tặng?',
              },
              {
                audio: [
                  { s: 'M', zh: '我们坐高铁去还是坐飞机去？' },
                  {
                    s: 'F',
                    zh: '坐高铁吧，虽然慢一点儿，但是便宜，也很舒服。',
                  },
                  { s: 'N', zh: '问：女的觉得高铁怎么样？' },
                ],
                options: ['很快', '很贵', '很便宜'],
                answer: 2,
                vi: 'Nam: Mình đi tàu cao tốc hay đi máy bay? — Nữ: Đi tàu cao tốc đi, tuy chậm hơn một chút nhưng rẻ, lại thoải mái. Hỏi: Người nữ thấy tàu cao tốc thế nào?',
              },
              {
                audio: [
                  { s: 'F', zh: '喂，你到哪儿了？' },
                  { s: 'M', zh: '我已经到公司门口了，马上就上楼。' },
                  { s: 'N', zh: '问：男的现在在哪儿？' },
                ],
                options: ['家里', '公司门口', '楼上'],
                answer: 1,
                vi: 'Nữ: A lô, anh đến đâu rồi? — Nam: Anh đến cổng công ty rồi, lên ngay đây. Hỏi: Bây giờ người nam đang ở đâu?',
                explain: '马上就上楼 — sắp lên lầu, tức là CHƯA ở trên lầu.',
              },
              {
                audio: [
                  { s: 'M', zh: '这件事你告诉你爸爸妈妈了吗？' },
                  { s: 'F', zh: '还没有，我怕他们担心。' },
                  { s: 'N', zh: '问：女的为什么还没告诉爸爸妈妈？' },
                ],
                options: ['怕他们担心', '他们很忙', '忘记了'],
                answer: 0,
                vi: 'Nam: Chuyện này em đã nói với bố mẹ chưa? — Nữ: Chưa, em sợ bố mẹ lo. Hỏi: Vì sao người nữ chưa nói với bố mẹ?',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'M', zh: '你好，我想买一张去上海的火车票。' },
                  { s: 'F', zh: '今天的票已经卖完了，明天上午的可以吗？' },
                  { s: 'M', zh: '明天上午几点的？' },
                  { s: 'F', zh: '九点半的，还有很多票。' },
                  { s: 'N', zh: '问：男的最可能买哪天的票？' },
                ],
                options: ['今天', '明天', '后天'],
                answer: 1,
                vi: 'Nam: Chào chị, tôi muốn mua một vé tàu đi Thượng Hải. — Nữ: Vé hôm nay bán hết rồi, sáng mai được không? — Nam: Sáng mai mấy giờ? — Nữ: 9 giờ rưỡi, vẫn còn nhiều vé. Hỏi: Người nam nhiều khả năng mua vé ngày nào?',
              },
              {
                audio: [
                  { s: 'F', zh: '你看起来很累，昨天晚上没睡好吗？' },
                  { s: 'M', zh: '楼上的邻居一直在唱歌，我两点才睡着。' },
                  { s: 'F', zh: '那你中午休息一会儿吧。' },
                  { s: 'M', zh: '好，吃完饭我就去睡一会儿。' },
                  { s: 'N', zh: '问：男的为什么没睡好？' },
                ],
                options: ['邻居唱歌', '工作太多', '身体不舒服'],
                answer: 0,
                vi: 'Nữ: Trông anh mệt quá, tối qua ngủ không ngon à? — Nam: Hàng xóm tầng trên hát suốt, hai giờ anh mới ngủ được. — Nữ: Vậy trưa anh nghỉ một lát đi. — Nam: Ừ, ăn xong anh đi ngủ một lát. Hỏi: Vì sao người nam ngủ không ngon?',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '下个星期天是我妈妈的生日，我想送她一件礼物。',
                  },
                  { s: 'M', zh: '你打算送什么？' },
                  { s: 'F', zh: '我还没想好，你觉得送花怎么样？' },
                  { s: 'M', zh: '送花不错，你还可以给她做一个蛋糕。' },
                  { s: 'N', zh: '问：女的想给谁送礼物？' },
                ],
                options: ['老师', '朋友', '妈妈'],
                answer: 2,
                vi: 'Nữ: Chủ nhật tuần sau là sinh nhật mẹ em, em muốn tặng mẹ một món quà. — Nam: Em định tặng gì? — Nữ: Em chưa nghĩ ra, anh thấy tặng hoa thế nào? — Nam: Tặng hoa được đấy, em còn có thể làm cho mẹ một chiếc bánh ngọt. Hỏi: Người nữ muốn tặng quà cho ai?',
              },
              {
                audio: [
                  { s: 'M', zh: '这个周末你有什么打算？' },
                  { s: 'F', zh: '我想去看一个电影，听说很有意思。' },
                  { s: 'M', zh: '是那个新的中国电影吗？我也想看。' },
                  { s: 'F', zh: '那我们一起去吧。' },
                  { s: 'N', zh: '问：他们周末打算做什么？' },
                ],
                options: ['看电影', '去爬山', '去朋友家'],
                answer: 0,
                vi: 'Nam: Cuối tuần này em định làm gì? — Nữ: Em muốn đi xem một bộ phim, nghe nói hay lắm. — Nam: Có phải bộ phim Trung Quốc mới không? Anh cũng muốn xem. — Nữ: Vậy mình cùng đi nhé. Hỏi: Cuối tuần họ định làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你的汉语说得真好，学了多长时间了？' },
                  { s: 'M', zh: '学了两年了。' },
                  { s: 'F', zh: '你是在哪儿学的？' },
                  { s: 'M', zh: '我在越南学了一年，又来中国留学了一年。' },
                  { s: 'N', zh: '问：男的在中国学了多长时间汉语？' },
                ],
                options: ['半年', '一年', '两年'],
                answer: 1,
                vi: 'Nữ: Anh nói tiếng Trung giỏi thật, học bao lâu rồi? — Nam: Học hai năm rồi. — Nữ: Anh học ở đâu? — Nam: Tôi học ở Việt Nam một năm, rồi sang Trung Quốc du học thêm một năm. Hỏi: Người nam học tiếng Trung ở Trung Quốc bao lâu?',
                explain:
                  'Tổng cộng 2 năm, nhưng ở Trung Quốc chỉ 1 năm — câu hỏi hỏi riêng phần ở Trung Quốc.',
              },
              {
                audio: [
                  { s: 'M', zh: '服务员，我们的菜怎么还没来？' },
                  { s: 'F', zh: '对不起，今天客人太多了，请再等五分钟。' },
                  { s: 'M', zh: '好吧，先给我们来两瓶啤酒。' },
                  { s: 'F', zh: '好的，马上就来。' },
                  { s: 'N', zh: '问：他们最可能在哪儿？' },
                ],
                options: ['商店', '银行', '饭馆'],
                answer: 2,
                vi: 'Nam: Phục vụ ơi, món của chúng tôi sao vẫn chưa lên? — Nữ: Xin lỗi, hôm nay đông khách quá, xin đợi thêm năm phút. — Nam: Thôi được, cho chúng tôi hai chai bia trước. — Nữ: Vâng, có ngay ạ. Hỏi: Họ nhiều khả năng đang ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '我的电脑突然不能上网了，你能帮我看一下吗？' },
                  { s: 'M', zh: '你先关机，再开机试试。' },
                  { s: 'F', zh: '试过了，还是不行。' },
                  { s: 'M', zh: '那我下班以后去你那儿看看吧。' },
                  { s: 'N', zh: '问：电脑怎么了？' },
                ],
                options: ['太旧了', '不能上网', '打不开了'],
                answer: 1,
                vi: 'Nữ: Máy tính của em tự nhiên không vào mạng được, anh xem giúp em được không? — Nam: Em tắt máy đi rồi bật lại thử xem. — Nữ: Thử rồi, vẫn không được. — Nam: Vậy tan làm anh qua chỗ em xem. Hỏi: Máy tính bị làm sao?',
              },
              {
                audio: [
                  { s: 'M', zh: '外面刮大风了，你出门的时候多穿点儿衣服。' },
                  { s: 'F', zh: '知道了，我穿那件大衣。' },
                  { s: 'M', zh: '带上伞吧，可能会下雨。' },
                  { s: 'F', zh: '好的，谢谢你。' },
                  { s: 'N', zh: '问：男的让女的带什么？' },
                ],
                options: ['大衣', '雨衣', '伞'],
                answer: 2,
                vi: 'Nam: Ngoài trời gió to rồi, lúc ra ngoài em mặc thêm áo vào. — Nữ: Em biết rồi, em mặc chiếc áo khoác dài kia. — Nam: Mang theo ô nhé, có thể sẽ mưa. — Nữ: Vâng, cảm ơn anh. Hỏi: Người nam bảo người nữ mang theo gì?',
                explain:
                  'Áo khoác (大衣) là thứ cô ấy MẶC; thứ được dặn MANG THEO (带上) là ô.',
              },
              {
                audio: [
                  { s: 'F', zh: '你知道小李为什么不高兴吗？' },
                  { s: 'M', zh: '听说他的自行车丢了。' },
                  { s: 'F', zh: '是新买的那辆吗？' },
                  { s: 'M', zh: '对，才买了一个星期。' },
                  { s: 'N', zh: '问：小李为什么不高兴？' },
                ],
                options: ['自行车丢了', '考试没考好', '生病了'],
                answer: 0,
                vi: 'Nữ: Anh có biết vì sao Tiểu Lý không vui không? — Nam: Nghe nói xe đạp của cậu ấy bị mất. — Nữ: Có phải chiếc mới mua không? — Nam: Đúng, mới mua được một tuần. Hỏi: Vì sao Tiểu Lý không vui?',
              },
              {
                audio: [
                  { s: 'M', zh: '我们班明天要去动物园，你去吗？' },
                  { s: 'F', zh: '我很想去，但是我要在家照顾我的奶奶。' },
                  { s: 'M', zh: '你奶奶身体不好吗？' },
                  { s: 'F', zh: '是啊，她上个星期住院了，昨天才出院。' },
                  { s: 'N', zh: '问：女的为什么不去动物园？' },
                ],
                options: ['要上课', '要照顾奶奶', '身体不舒服'],
                answer: 1,
                vi: 'Nam: Ngày mai lớp mình đi sở thú, cậu có đi không? — Nữ: Mình rất muốn đi, nhưng mình phải ở nhà chăm bà. — Nam: Bà cậu không khoẻ à? — Nữ: Ừ, tuần trước bà nằm viện, hôm qua mới ra viện. Hỏi: Vì sao người nữ không đi sở thú?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'match-text',
            options: [
              '别着急，你再好好想想放在哪儿了。',
              '早上七点，飞机九点半起飞。',
              '你最好先去医院检查一下。',
              '是啊，新家在学校附近，上课方便多了。',
              '没关系，我每天都骑自行车。',
              '真的吗？这是今年冬天的第一场雪。',
            ],
            items: [
              {
                text: '你明天几点出发去机场？',
                answer: 1,
                vi: 'Mai mấy giờ bạn ra sân bay? → Bảy giờ sáng, máy bay cất cánh lúc chín rưỡi.',
              },
              {
                text: '这个房间又大又干净，就是离地铁站有点儿远。',
                answer: 4,
                vi: 'Phòng này vừa rộng vừa sạch, chỉ có điều hơi xa ga tàu điện ngầm. → Không sao, ngày nào tôi cũng đạp xe.',
              },
              {
                text: '你看，外面下雪了！',
                answer: 5,
                vi: 'Bạn xem, ngoài trời có tuyết rồi! → Thật à? Đây là trận tuyết đầu tiên của mùa đông năm nay.',
              },
              {
                text: '我的护照找不到了，怎么办？',
                answer: 0,
                vi: 'Tôi không tìm thấy hộ chiếu, làm sao bây giờ? → Đừng vội, bạn nghĩ kỹ lại xem để ở đâu.',
              },
              {
                text: '听说你搬家了？',
                answer: 3,
                vi: 'Nghe nói bạn chuyển nhà rồi à? → Ừ, nhà mới gần trường, đi học tiện hơn nhiều.',
              },
            ],
          },
          {
            type: 'match-text',
            continues: true,
            options: [
              '今天不行，我感冒了，下次吧。',
              '你喜欢就好，生日快乐！',
              '好的，我不知道，真不好意思。',
              '我也不会，我们去问问老师吧。',
              '是我的汉语老师，她说这个名字很好听。',
            ],
            items: [
              {
                text: '这道数学题太难了，我做了半天也没做出来。',
                answer: 3,
                vi: 'Bài toán này khó quá, tôi làm mãi không ra. → Tôi cũng không biết làm, mình đi hỏi thầy cô đi.',
              },
              {
                text: '谢谢你送我的礼物，我非常喜欢。',
                answer: 1,
                vi: 'Cảm ơn món quà bạn tặng, tôi rất thích. → Bạn thích là được rồi, sinh nhật vui vẻ!',
              },
              {
                text: '你的中文名字是谁给你起的？',
                answer: 4,
                vi: 'Tên tiếng Trung của bạn là ai đặt cho? → Là cô giáo tiếng Trung của tôi, cô nói tên này rất hay.',
              },
              {
                text: '对不起，这里不能拍照。',
                answer: 2,
                vi: 'Xin lỗi, ở đây không được chụp ảnh. → Vâng, tôi không biết, thật ngại quá.',
              },
              {
                text: '我们一起去打网球吧？',
                answer: 0,
                vi: 'Mình cùng đi đánh quần vợt nhé? → Hôm nay không được, tôi bị cảm rồi, lần sau nhé.',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['突然', '选择', '声音', '检查', '关心', '环境'],
            items: [
              {
                text: '这个小区的（ ）很好，有很多树和草地。',
                answer: 5,
                vi: 'Môi trường của khu dân cư này rất tốt, có nhiều cây và bãi cỏ.',
              },
              {
                text: '我正在看书，外面（ ）下起了大雨。',
                answer: 0,
                vi: 'Tôi đang đọc sách thì bên ngoài đột nhiên đổ mưa to.',
              },
              {
                text: '考试的时候要认真，做完以后再（ ）一遍。',
                answer: 3,
                vi: 'Lúc làm bài thi phải cẩn thận, làm xong thì kiểm tra lại một lượt.',
              },
              {
                text: '这两件衬衫都很漂亮，我不知道应该（ ）哪一件。',
                answer: 1,
                vi: 'Hai chiếc áo sơ mi này đều đẹp, tôi không biết nên chọn chiếc nào.',
              },
              {
                text: '妈妈总是很（ ）我的学习和身体。',
                answer: 4,
                vi: 'Mẹ lúc nào cũng rất quan tâm đến việc học và sức khoẻ của tôi.',
              },
            ],
          },
          {
            type: 'fill-blank',
            continues: true,
            options: ['刻', '一直', '终于', '被', '节', '爱好'],
            items: [
              {
                text: 'A：你的（ ）是什么？\nB：我喜欢踢足球和听音乐。',
                answer: 5,
                vi: 'A: Sở thích của bạn là gì? — B: Tôi thích đá bóng và nghe nhạc.',
              },
              {
                text: 'A：现在几点了？\nB：差一（ ）十点，我们快走吧。',
                answer: 0,
                vi: 'A: Bây giờ mấy giờ rồi? — B: Mười giờ kém mười lăm, mình đi nhanh lên.',
                explain:
                  '一刻 = 15 phút; 差一刻十点 = còn 15 phút nữa mới 10 giờ, tức 9:45.',
              },
              {
                text: 'A：我的蛋糕呢？\nB：对不起，（ ）弟弟吃了。',
                answer: 3,
                vi: 'A: Bánh ngọt của em đâu? — B: Xin lỗi, bị em trai ăn mất rồi.',
                explain:
                  '被 + người làm + động từ: câu bị động — bánh "bị" em trai ăn.',
              },
              {
                text: 'A：你等了很长时间了吧？\nB：是啊，我（ ）在这儿等你，等了一个小时。',
                answer: 1,
                vi: 'A: Bạn đợi lâu lắm rồi nhỉ? — B: Đúng vậy, tôi cứ đứng đây đợi bạn suốt, đợi một tiếng rồi.',
              },
              {
                text: 'A：你的作业做完了吗？\nB：做完了，我（ ）可以休息了。',
                answer: 2,
                vi: 'A: Bạn làm xong bài tập chưa? — B: Xong rồi, cuối cùng tôi cũng được nghỉ.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                text: '我每天晚上睡觉前都要看半个小时的书，这个习惯已经坚持了十年了。我觉得看书能让我更了解这个世界。',
                question: '关于他，可以知道什么？',
                options: ['每天早上看书', '有看书的习惯', '不喜欢看书'],
                answer: 1,
                vi: 'Tối nào trước khi ngủ tôi cũng đọc sách nửa tiếng, thói quen này đã duy trì mười năm rồi. Tôi thấy đọc sách giúp tôi hiểu thế giới này hơn. ★ Về anh ấy, có thể biết điều gì?',
              },
              {
                text: '今天是星期六，公园里的人特别多。有的人在跑步，有的人在打羽毛球，还有很多孩子在草地上玩儿。',
                question: '公园里的人为什么特别多？',
                options: ['今天是周末', '天气很好', '有比赛'],
                answer: 0,
                vi: 'Hôm nay là thứ Bảy, công viên rất đông người. Người thì chạy bộ, người thì đánh cầu lông, còn nhiều trẻ con chơi trên bãi cỏ. ★ Vì sao công viên đông người?',
                explain:
                  '星期六 (thứ Bảy) là cuối tuần — đoạn văn không nhắc thời tiết hay cuộc thi.',
              },
              {
                text: '小张，我下午要去银行办点儿事，可能回来得比较晚。如果有人找我，你就让他明天上午再来，或者给我打电话。',
                question: '说话人下午要去哪儿？',
                options: ['银行', '公司', '学校'],
                answer: 0,
                vi: 'Tiểu Trương, chiều nay tôi phải ra ngân hàng làm chút việc, có thể về khá muộn. Nếu có ai tìm tôi thì bảo họ sáng mai quay lại, hoặc gọi điện cho tôi. ★ Chiều nay người nói đi đâu?',
              },
              {
                text: '这家店的饺子非常有名，很多外地的游客都来这里吃。我第一次吃的时候就觉得特别好吃，后来又带朋友来过好几次。',
                question: '根据这段话，可以知道：',
                options: ['饺子不太好吃', '他只来过一次', '这家店很有名'],
                answer: 2,
                vi: 'Sủi cảo của quán này rất nổi tiếng, nhiều khách du lịch từ nơi khác đều đến đây ăn. Lần đầu ăn tôi đã thấy cực kỳ ngon, sau đó còn dẫn bạn bè đến mấy lần. ★ Theo đoạn văn, có thể biết:',
              },
              {
                text: '我的弟弟今年上初中二年级，他个子很高，已经一米八了，比我爸爸还高。他最喜欢的运动是打篮球。',
                question: '关于弟弟，下面哪个是对的？',
                options: ['是小学生', '不喜欢运动', '个子很高'],
                answer: 2,
                vi: 'Em trai tôi năm nay học lớp 8 (năm hai trung học cơ sở), em ấy rất cao, đã 1m80 rồi, còn cao hơn cả bố tôi. Môn thể thao em ấy thích nhất là bóng rổ. ★ Về em trai, câu nào đúng?',
              },
              {
                text: '这次去旅游，我们先坐飞机到了上海，在那里玩儿了三天，然后又坐高铁去了北京。在北京我们去了很多有名的地方。',
                question: '他们是怎么去北京的？',
                options: ['坐高铁', '坐飞机', '开车'],
                answer: 0,
                vi: 'Chuyến du lịch lần này, chúng tôi đi máy bay tới Thượng Hải trước, chơi ở đó ba ngày, rồi đi tàu cao tốc tới Bắc Kinh. Ở Bắc Kinh chúng tôi đã đến nhiều nơi nổi tiếng. ★ Họ đến Bắc Kinh bằng gì?',
                explain:
                  'Máy bay là để tới Thượng Hải; từ Thượng Hải tới Bắc Kinh mới đi tàu cao tốc (然后又坐高铁).',
              },
              {
                text: '冬天的时候，很多人早上不想起床，因为外面太冷了。但是医生说，冬天也要坚持锻炼身体，这样才不容易感冒。',
                question: '医生认为冬天应该：',
                options: ['多睡觉', '少出门', '锻炼身体'],
                answer: 2,
                vi: 'Mùa đông, nhiều người buổi sáng không muốn dậy vì ngoài trời lạnh quá. Nhưng bác sĩ nói mùa đông cũng phải kiên trì rèn luyện sức khoẻ, như vậy mới khó bị cảm. ★ Bác sĩ cho rằng mùa đông nên:',
              },
              {
                text: '张阿姨是我家的邻居，她的儿子在国外留学，丈夫工作很忙，所以她常常一个人在家。我有空儿的时候常去和她聊天儿。',
                question: '张阿姨为什么常常一个人在家？',
                options: ['不喜欢出门', '家人不在身边', '身体不好'],
                answer: 1,
                vi: 'Dì Trương là hàng xóm nhà tôi, con trai dì đang du học ở nước ngoài, chồng dì thì bận công việc, nên dì thường ở nhà một mình. Lúc rảnh tôi hay sang trò chuyện với dì. ★ Vì sao dì Trương thường ở nhà một mình?',
              },
              {
                text: '我以前觉得学汉语很难，特别是汉字，又多又不好记。后来老师告诉我，很多汉字的意思和它的样子有关系，我记汉字就容易多了。',
                question: '他现在觉得记汉字：',
                options: ['容易多了', '很难', '没有意思'],
                answer: 0,
                vi: 'Trước đây tôi thấy học tiếng Trung rất khó, nhất là chữ Hán, vừa nhiều vừa khó nhớ. Sau đó thầy giáo bảo tôi rằng nghĩa của nhiều chữ Hán có liên quan đến hình dạng của nó, thế là tôi nhớ chữ Hán dễ hơn nhiều. ★ Bây giờ anh ấy thấy nhớ chữ Hán:',
                explain:
                  '"Khó" là cảm nhận TRƯỚC ĐÂY (以前); câu hỏi hỏi bây giờ (现在).',
              },
              {
                text: '现在很多年轻人喜欢在网上买东西，因为又方便又便宜，不用出门就能买到。但是在网上买衣服，有时候收到以后才发现不合适。',
                question: '在网上买衣服可能有什么问题？',
                options: ['太贵了', '不合适', '不方便'],
                answer: 1,
                vi: 'Bây giờ nhiều người trẻ thích mua đồ trên mạng vì vừa tiện vừa rẻ, không cần ra khỏi nhà cũng mua được. Nhưng mua quần áo trên mạng thì có lúc nhận hàng rồi mới thấy không vừa. ★ Mua quần áo trên mạng có thể gặp vấn đề gì?',
              },
            ],
          },
        ],
      },
      {
        kind: 'writing',
        parts: [
          {
            type: 'order',
            items: [
              {
                pieces: ['蛋糕', '吃完了', '他', '把'],
                answer: '他把蛋糕吃完了。',
                vi: 'Anh ấy ăn hết chiếc bánh ngọt rồi.',
                explain:
                  'Câu chữ 把: chủ ngữ + 把 + tân ngữ + động từ + thành phần khác (吃完了).',
              },
              {
                pieces: ['越来越', '冷了', '天气'],
                answer: '天气越来越冷了。',
                vi: 'Trời càng ngày càng lạnh.',
                explain:
                  '越来越 + tính từ: "càng ngày càng…", đứng ngay trước tính từ.',
              },
              {
                pieces: ['一本词典', '放着', '桌子上'],
                answer: '桌子上放着一本词典。',
                vi: 'Trên bàn có đặt một quyển từ điển.',
                explain:
                  'Câu tồn tại: nơi chốn + động từ + 着 + người/vật (桌子上放着…).',
              },
              {
                pieces: ['被', '我的自行车', '骑走了', '弟弟'],
                answer: '我的自行车被弟弟骑走了。',
                vi: 'Xe đạp của tôi bị em trai đạp đi mất rồi.',
                explain:
                  'Câu bị động: vật chịu tác động + 被 + người làm + động từ + kết quả.',
              },
              {
                pieces: ['八点', '我们', '出发', '明天早上'],
                answer: '我们明天早上八点出发。',
                alternatives: ['明天早上八点我们出发。'],
                vi: 'Tám giờ sáng mai chúng ta xuất phát.',
                explain:
                  'Thời gian đứng trước động từ — trước hoặc sau chủ ngữ đều đúng, giờ cụ thể (八点) đứng sau buổi (明天早上).',
              },
            ],
          },
          {
            type: 'pinyin-char',
            items: [
              {
                text: '我们坐（ ）租车去机场吧。',
                pinyin: 'chū',
                choices: ['初', '处', '出', '除', '厨', '楚'],
                answer: 2,
                vi: 'Chúng ta đi taxi ra sân bay nhé.',
                explain: '出租车 = taxi (出 xuất: "xe cho thuê đi ra").',
              },
              {
                text: '这本词典三十八（ ）。',
                pinyin: 'yuán',
                choices: ['院', '员', '远', '元', '原', '园'],
                answer: 3,
                vi: 'Quyển từ điển này ba mươi tám tệ.',
                explain:
                  '元 (nguyên) = đồng tệ, đơn vị tiền; 园 là vườn, 员 là nhân viên.',
              },
              {
                text: '你的中文名字（ ）什么？',
                pinyin: 'jiào',
                choices: ['较', '叫', '觉', '角', '教', '脚'],
                answer: 1,
                vi: 'Tên tiếng Trung của bạn là gì?',
                explain:
                  '叫 (khiếu) = gọi là, tên là; 觉 trong 睡觉, 较 trong 比较.',
              },
              {
                text: '我们（ ）于做完作业了。',
                pinyin: 'zhōng',
                choices: ['钟', '重', '中', '众', '种', '终'],
                answer: 5,
                vi: 'Cuối cùng chúng tôi cũng làm xong bài tập.',
                explain:
                  '终于 (chung vu) = cuối cùng; 终 là "kết thúc", khác 中 (giữa) và 钟 (đồng hồ).',
              },
              {
                text: '他每天早上七点（ ）床。',
                pinyin: 'qǐ',
                choices: ['期', '其', '气', '汽', '起', '七'],
                answer: 4,
                vi: 'Sáng nào anh ấy cũng dậy lúc bảy giờ.',
                explain: '起床 (khởi sàng) = thức dậy, rời giường.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'hsk3-de-2',
    level: 3,
    title: 'HSK 3 — Đề 2',
    durationMin: 85,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'match-picture',
            pictures: [
              P('📦', 'thùng đồ chuyển nhà'),
              P('🎤', 'đi hát'),
              P('🍉', 'dưa hấu'),
              P('🏊', 'bơi'),
              P('🏥', 'bệnh viện'),
              P('🚕', 'taxi'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你搬家搬完了吗？' },
                  { s: 'F', zh: '还没有，东西太多了，明天还要搬。' },
                ],
                answer: 0,
                vi: 'Nam: Em chuyển nhà xong chưa? — Nữ: Chưa, đồ nhiều quá, mai còn phải chuyển tiếp.',
              },
              {
                audio: [
                  { s: 'F', zh: '你脸色不太好，去医院看看吧。' },
                  { s: 'M', zh: '好，我下午就去检查一下。' },
                ],
                answer: 4,
                vi: 'Nữ: Sắc mặt anh không tốt lắm, đi bệnh viện khám xem. — Nam: Ừ, chiều nay anh đi kiểm tra.',
              },
              {
                audio: [
                  { s: 'M', zh: '这个西瓜真甜！' },
                  { s: 'F', zh: '是啊，夏天吃西瓜最舒服了。' },
                ],
                answer: 2,
                vi: 'Nam: Quả dưa hấu này ngọt thật! — Nữ: Đúng vậy, mùa hè ăn dưa hấu là đã nhất.',
              },
              {
                audio: [
                  { s: 'F', zh: '周末我们去唱歌吧？' },
                  { s: 'M', zh: '好啊，我也很久没唱了。' },
                ],
                answer: 1,
                vi: 'Nữ: Cuối tuần mình đi hát nhé? — Nam: Được, anh cũng lâu rồi chưa hát.',
              },
              {
                audio: [
                  { s: 'M', zh: '我们打车去火车站吧，快一点儿。' },
                  { s: 'F', zh: '好，我现在就叫车。' },
                ],
                answer: 5,
                vi: 'Nam: Mình bắt taxi ra ga tàu đi, cho nhanh. — Nữ: Được, em gọi xe ngay.',
              },
            ],
          },
          {
            type: 'match-picture',
            continues: true,
            pictures: [
              P('🐱', 'mèo'),
              P('📚', 'sách, thư viện'),
              P('✈️', 'máy bay'),
              P('🎁', 'quà'),
              P('☔', 'ô che mưa'),
            ],
            items: [
              {
                audio: [
                  { s: 'F', zh: '外面下雨了，你带伞了吗？' },
                  { s: 'M', zh: '带了，在我的包里。' },
                ],
                answer: 4,
                vi: 'Nữ: Ngoài trời mưa rồi, anh mang ô chưa? — Nam: Mang rồi, ở trong túi anh.',
              },
              {
                audio: [
                  { s: 'M', zh: '你的小猫真可爱，它几岁了？' },
                  { s: 'F', zh: '两岁了，它最喜欢在沙发上睡觉。' },
                ],
                answer: 0,
                vi: 'Nam: Con mèo của em đáng yêu thật, nó mấy tuổi rồi? — Nữ: Hai tuổi rồi, nó thích nhất là ngủ trên ghế sofa.',
              },
              {
                audio: [
                  { s: 'F', zh: '飞机几点起飞？' },
                  { s: 'M', zh: '十点二十，我们还有一个小时。' },
                ],
                answer: 2,
                vi: 'Nữ: Máy bay mấy giờ cất cánh? — Nam: Mười giờ hai mươi, mình còn một tiếng nữa.',
              },
              {
                audio: [
                  { s: 'M', zh: '这是给你的生日礼物，希望你喜欢。' },
                  { s: 'F', zh: '谢谢，我可以现在打开吗？' },
                ],
                answer: 3,
                vi: 'Nam: Đây là quà sinh nhật cho em, mong em thích. — Nữ: Cảm ơn anh, em mở ra bây giờ được không?',
              },
              {
                audio: [
                  { s: 'F', zh: '你常常来图书馆吗？' },
                  { s: 'M', zh: '是啊，这里很安静，我每个周末都来看书。' },
                ],
                answer: 1,
                vi: 'Nữ: Anh hay đến thư viện à? — Nam: Ừ, ở đây rất yên tĩnh, cuối tuần nào anh cũng đến đọc sách.',
              },
            ],
          },
          {
            type: 'judge-text',
            items: [
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我每天早上六点半起床，先在小区里跑步，然后洗澡、吃早饭，八点到公司。这个习惯我已经坚持了三年。',
                  },
                ],
                statement: '她每天早上都去跑步。',
                answer: true,
                vi: 'Sáng nào tôi cũng dậy lúc 6 rưỡi, chạy bộ trong khu dân cư trước, rồi tắm, ăn sáng, 8 giờ có mặt ở công ty. Thói quen này tôi đã duy trì ba năm. ★ Sáng nào cô ấy cũng đi chạy bộ.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我们公司离地铁站很近，走路只要五分钟，所以大家都坐地铁上班，开车的人很少。',
                  },
                ],
                statement: '他们公司很多人开车上班。',
                answer: false,
                vi: 'Công ty chúng tôi rất gần ga tàu điện ngầm, đi bộ chỉ năm phút, nên mọi người đều đi làm bằng tàu điện ngầm, rất ít người lái xe. ★ Ở công ty họ nhiều người lái xe đi làm.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '这家宾馆的房间不大，但是很干净，服务员也很热情。最重要的是，它就在火车站旁边，非常方便。',
                  },
                ],
                statement: '那家宾馆离火车站很近。',
                answer: true,
                vi: 'Phòng của khách sạn này không rộng nhưng rất sạch, nhân viên cũng rất nhiệt tình. Quan trọng nhất là nó ở ngay cạnh ga tàu, rất tiện. ★ Khách sạn đó gần ga tàu.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '今天是我和妻子结婚十年的日子。我想给她买一件礼物，但是不知道买什么好，所以我去问了女儿。',
                  },
                ],
                statement: '他想给妻子买礼物。',
                answer: true,
                vi: 'Hôm nay là tròn mười năm ngày cưới của tôi và vợ. Tôi muốn mua cho cô ấy một món quà, nhưng không biết mua gì cho hợp, nên tôi đi hỏi con gái. ★ Anh ấy muốn mua quà cho vợ.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我的电脑用了七八年了，又旧又慢，常常突然关机。我打算这个月换一个新的。',
                  },
                ],
                statement: '她的电脑是新买的。',
                answer: false,
                vi: 'Máy tính của tôi dùng bảy tám năm rồi, vừa cũ vừa chậm, hay tự nhiên tắt máy. Tôi định tháng này đổi cái mới. ★ Máy tính của cô ấy mới mua.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '小李的汉语说得非常好，但是汉字写得不太好。老师让他每天写一页汉字，他已经写了两个月了。',
                  },
                ],
                statement: '小李的汉字写得很好。',
                answer: false,
                vi: 'Tiểu Lý nói tiếng Trung rất giỏi, nhưng viết chữ Hán chưa tốt lắm. Thầy giáo bảo cậu ấy mỗi ngày viết một trang chữ Hán, cậu ấy đã viết được hai tháng rồi. ★ Tiểu Lý viết chữ Hán rất đẹp.',
                explain:
                  'Nói (说) thì giỏi, còn viết chữ (汉字写得) thì 不太好 — câu ★ nhầm hai kỹ năng.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '昨天我去看了一个画家的画儿，那里人不多，很安静。我在那里看了一个下午，觉得非常有意思。',
                  },
                ],
                statement: '她觉得那些画儿很有意思。',
                answer: true,
                vi: 'Hôm qua tôi đi xem tranh của một hoạ sĩ, ở đó không đông người, rất yên tĩnh. Tôi xem ở đó cả buổi chiều, thấy rất thú vị. ★ Cô ấy thấy những bức tranh đó rất thú vị.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '夏天到了，天气越来越热，很多人喜欢去海边游泳。可是我更喜欢去山上，那里比城市凉快多了。',
                  },
                ],
                statement: '他夏天喜欢去海边。',
                answer: false,
                vi: 'Mùa hè đến rồi, trời càng ngày càng nóng, nhiều người thích ra biển bơi. Nhưng tôi thích lên núi hơn, ở đó mát hơn thành phố nhiều. ★ Mùa hè anh ấy thích ra biển.',
                explain:
                  'Ra biển là "nhiều người"; còn anh ấy 更喜欢去山上 — thích lên núi hơn.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我女儿今年上小学一年级。她每天放学回家，第一件事就是看电视，所以作业常常做到很晚。',
                  },
                ],
                statement: '女儿回家后先做作业。',
                answer: false,
                vi: 'Con gái tôi năm nay học lớp một. Ngày nào tan học về, việc đầu tiên nó làm là xem ti vi, nên bài tập thường làm đến rất khuya. ★ Con gái về nhà làm bài tập trước.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '这件衬衫是我上个月在网上买的，才一百块钱，比商店里便宜多了，穿着也很舒服。',
                  },
                ],
                statement: '这件衬衫不贵。',
                answer: true,
                vi: 'Chiếc áo sơ mi này tôi mua trên mạng tháng trước, chỉ một trăm tệ, rẻ hơn trong cửa hàng nhiều, mặc lại rất thoải mái. ★ Chiếc áo sơ mi này không đắt.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'M', zh: '你明天几点出发？' },
                  { s: 'F', zh: '我打算早上七点出发，八点前到学校。' },
                  { s: 'N', zh: '问：女的打算几点出发？' },
                ],
                options: ['七点', '八点', '九点'],
                answer: 0,
                vi: 'Nam: Mai mấy giờ em xuất phát? — Nữ: Em định 7 giờ sáng xuất phát, trước 8 giờ tới trường. Hỏi: Người nữ định mấy giờ xuất phát?',
                explain: '8 giờ là giờ tới trường; giờ xuất phát là 7 giờ.',
              },
              {
                audio: [
                  { s: 'F', zh: '先生，您要喝点儿什么？' },
                  { s: 'M', zh: '给我一杯绿茶吧，不要放糖。' },
                  { s: 'N', zh: '问：他们最可能在哪儿？' },
                ],
                options: ['医院', '饭馆', '银行'],
                answer: 1,
                vi: 'Nữ: Thưa anh, anh muốn uống gì ạ? — Nam: Cho tôi một cốc trà xanh, đừng cho đường. Hỏi: Họ nhiều khả năng đang ở đâu?',
              },
              {
                audio: [
                  { s: 'M', zh: '这个周末你去哪儿玩儿了？' },
                  {
                    s: 'F',
                    zh: '我去爬山了，山上很凉快，我们还拍了很多照片。',
                  },
                  { s: 'N', zh: '问：女的周末做什么了？' },
                ],
                options: ['游泳', '看电影', '爬山'],
                answer: 2,
                vi: 'Nam: Cuối tuần này em đi chơi đâu? — Nữ: Em đi leo núi, trên núi rất mát, bọn em còn chụp nhiều ảnh. Hỏi: Cuối tuần người nữ đã làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你怎么这么高兴？' },
                  { s: 'M', zh: '我的数学考了一百分！' },
                  { s: 'N', zh: '问：男的为什么很高兴？' },
                ],
                options: ['生日到了', '考得很好', '买了新手机'],
                answer: 1,
                vi: 'Nữ: Sao anh vui thế? — Nam: Môn toán của anh được một trăm điểm! Hỏi: Vì sao người nam rất vui?',
              },
              {
                audio: [
                  { s: 'M', zh: '我们是坐地铁去还是打车去？' },
                  { s: 'F', zh: '现在路上车太多，还是坐地铁吧，比较快。' },
                  { s: 'N', zh: '问：他们最可能怎么去？' },
                ],
                options: ['打车', '走路', '坐地铁'],
                answer: 2,
                vi: 'Nam: Mình đi tàu điện ngầm hay bắt taxi? — Nữ: Giờ đường đông xe quá, đi tàu điện ngầm thôi, nhanh hơn. Hỏi: Họ nhiều khả năng đi bằng gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '这条裙子有大一点儿的吗？' },
                  { s: 'M', zh: '对不起，大的已经卖完了，明天才有。' },
                  { s: 'N', zh: '问：女的想要什么样的裙子？' },
                ],
                options: ['大一点儿的', '便宜的', '红色的'],
                answer: 0,
                vi: 'Nữ: Chiếc váy này có cỡ to hơn không? — Nam: Xin lỗi, cỡ to bán hết rồi, mai mới có. Hỏi: Người nữ muốn chiếc váy như thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你哥哥现在在哪儿工作？' },
                  { s: 'F', zh: '他在一家银行工作，已经三年了。' },
                  { s: 'N', zh: '问：她哥哥在哪儿工作？' },
                ],
                options: ['学校', '银行', '医院'],
                answer: 1,
                vi: 'Nam: Anh trai em giờ làm ở đâu? — Nữ: Anh ấy làm ở một ngân hàng, được ba năm rồi. Hỏi: Anh trai cô ấy làm việc ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '我感冒了，明天的会议我可能不能参加了。' },
                  { s: 'M', zh: '没关系，你好好休息，我会告诉经理的。' },
                  { s: 'N', zh: '问：女的明天可能怎么样？' },
                ],
                options: ['去开会', '去旅游', '不参加会议'],
                answer: 2,
                vi: 'Nữ: Em bị cảm rồi, cuộc họp ngày mai có lẽ em không dự được. — Nam: Không sao, em nghỉ ngơi cho khoẻ, anh sẽ báo với quản lý. Hỏi: Ngày mai người nữ có thể sẽ thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你知道附近哪儿有银行吗？' },
                  { s: 'F', zh: '往前走，到第二个路口往左，就在超市旁边。' },
                  { s: 'N', zh: '问：银行在哪儿？' },
                ],
                options: ['超市旁边', '学校对面', '医院后面'],
                answer: 0,
                vi: 'Nam: Chị có biết gần đây chỗ nào có ngân hàng không? — Nữ: Đi thẳng, đến ngã tư thứ hai rẽ trái, ngay cạnh siêu thị. Hỏi: Ngân hàng ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '你每天几点睡觉？' },
                  { s: 'M', zh: '一般十一点，但是最近工作忙，常常一点才睡。' },
                  { s: 'N', zh: '问：男的最近为什么睡得晚？' },
                ],
                options: ['看电视', '工作忙', '玩儿游戏'],
                answer: 1,
                vi: 'Nữ: Mỗi ngày anh mấy giờ đi ngủ? — Nam: Thường là 11 giờ, nhưng dạo này công việc bận, hay 1 giờ mới ngủ. Hỏi: Dạo này vì sao người nam ngủ muộn?',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '你下个月去中国旅游，准备好了吗？' },
                  { s: 'M', zh: '护照办好了，机票也买了。' },
                  { s: 'F', zh: '宾馆呢？' },
                  { s: 'M', zh: '我朋友帮我找了一家，就在公园旁边。' },
                  { s: 'N', zh: '问：谁帮男的找的宾馆？' },
                ],
                options: ['妻子', '同事', '朋友'],
                answer: 2,
                vi: 'Nữ: Tháng sau anh đi du lịch Trung Quốc, chuẩn bị xong chưa? — Nam: Hộ chiếu làm xong rồi, vé máy bay cũng mua rồi. — Nữ: Còn khách sạn? — Nam: Bạn anh tìm giúp một chỗ, ngay cạnh công viên. Hỏi: Ai tìm khách sạn giúp người nam?',
              },
              {
                audio: [
                  { s: 'M', zh: '喂，小王，你在哪儿呢？' },
                  { s: 'F', zh: '我在超市买东西，你有什么事吗？' },
                  { s: 'M', zh: '你能帮我买两瓶牛奶吗？' },
                  { s: 'F', zh: '没问题，还要别的吗？' },
                  { s: 'N', zh: '问：男的让女的买什么？' },
                ],
                options: ['牛奶', '水果', '面包'],
                answer: 0,
                vi: 'Nam: A lô, Tiểu Vương, em đang ở đâu? — Nữ: Em đang mua đồ ở siêu thị, anh có việc gì không? — Nam: Em mua giúp anh hai chai sữa được không? — Nữ: Được, còn cần gì nữa không? Hỏi: Người nam nhờ người nữ mua gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '这个房间又大又亮，你觉得怎么样？' },
                  { s: 'M', zh: '很好，就是离公司有点儿远。' },
                  { s: 'F', zh: '坐地铁的话，要多长时间？' },
                  { s: 'M', zh: '差不多一个小时。' },
                  { s: 'N', zh: '问：男的觉得这个房间怎么样？' },
                ],
                options: ['太小了', '不太干净', '离公司远'],
                answer: 2,
                vi: 'Nữ: Căn phòng này vừa rộng vừa sáng, anh thấy thế nào? — Nam: Rất tốt, chỉ có điều hơi xa công ty. — Nữ: Đi tàu điện ngầm thì mất bao lâu? — Nam: Khoảng một tiếng. Hỏi: Người nam thấy căn phòng này thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你学汉语多长时间了？' },
                  { s: 'F', zh: '快两年了。' },
                  { s: 'M', zh: '你觉得学汉语什么最难？' },
                  { s: 'F', zh: '我觉得汉字最难，又多又不好写。' },
                  { s: 'N', zh: '问：女的觉得什么最难？' },
                ],
                options: ['汉字', '说话', '听力'],
                answer: 0,
                vi: 'Nam: Em học tiếng Trung bao lâu rồi? — Nữ: Gần hai năm rồi. — Nam: Em thấy học tiếng Trung cái gì khó nhất? — Nữ: Em thấy chữ Hán khó nhất, vừa nhiều vừa khó viết. Hỏi: Người nữ thấy cái gì khó nhất?',
              },
              {
                audio: [
                  { s: 'F', zh: '你怎么还不睡觉？已经十二点了。' },
                  { s: 'M', zh: '我的作业还没写完。' },
                  { s: 'F', zh: '明天再写吧，太晚了。' },
                  { s: 'M', zh: '不行，明天上午就要交了。' },
                  { s: 'N', zh: '问：男的为什么还不睡觉？' },
                ],
                options: ['在看电视', '作业没写完', '不想睡'],
                answer: 1,
                vi: 'Nữ: Sao anh vẫn chưa ngủ? Mười hai giờ rồi. — Nam: Bài tập của anh chưa làm xong. — Nữ: Mai làm tiếp đi, muộn quá rồi. — Nam: Không được, sáng mai phải nộp rồi. Hỏi: Vì sao người nam vẫn chưa ngủ?',
              },
              {
                audio: [
                  { s: 'M', zh: '听说你要搬家了？' },
                  { s: 'F', zh: '是啊，新房子离我的公司很近。' },
                  { s: 'M', zh: '需要帮忙吗？' },
                  { s: 'F', zh: '太好了，这个星期六你有空儿吗？' },
                  { s: 'N', zh: '问：女的为什么搬家？' },
                ],
                options: ['离公司近', '房子太旧', '房间太小'],
                answer: 0,
                vi: 'Nam: Nghe nói em sắp chuyển nhà à? — Nữ: Vâng, nhà mới gần công ty em. — Nam: Có cần giúp không? — Nữ: Tốt quá, thứ Bảy này anh có rảnh không? Hỏi: Vì sao người nữ chuyển nhà?',
              },
              {
                audio: [
                  { s: 'F', zh: '你好，我想换一下这双鞋。' },
                  { s: 'M', zh: '有什么问题吗？' },
                  { s: 'F', zh: '鞋有点儿小，有没有大一号的？' },
                  { s: 'M', zh: '有，您等一下，我去拿。' },
                  { s: 'N', zh: '问：女的为什么要换鞋？' },
                ],
                options: ['颜色不好看', '有点儿小', '太贵了'],
                answer: 1,
                vi: 'Nữ: Chào anh, tôi muốn đổi đôi giày này. — Nam: Có vấn đề gì ạ? — Nữ: Giày hơi chật, có cỡ to hơn một số không? — Nam: Có, chị đợi một chút, tôi đi lấy. Hỏi: Vì sao người nữ muốn đổi giày?',
              },
              {
                audio: [
                  { s: 'M', zh: '你的中文名字真好听，是谁给你起的？' },
                  { s: 'F', zh: '是我的中国朋友。' },
                  { s: 'M', zh: '有什么意思吗？' },
                  { s: 'F', zh: '她说意思是像月亮一样漂亮。' },
                  { s: 'N', zh: '问：这个名字是谁起的？' },
                ],
                options: ['中国朋友', '老师', '爸爸'],
                answer: 0,
                vi: 'Nam: Tên tiếng Trung của em hay thật, ai đặt cho em vậy? — Nữ: Là bạn người Trung Quốc của em. — Nam: Có ý nghĩa gì không? — Nữ: Bạn ấy nói nghĩa là đẹp như trăng. Hỏi: Cái tên này ai đặt?',
              },
              {
                audio: [
                  { s: 'F', zh: '我们周末去动物园看大熊猫吧？' },
                  { s: 'M', zh: '这个周末不行，我要去参加朋友的生日晚会。' },
                  { s: 'F', zh: '那下个周末呢？' },
                  { s: 'M', zh: '下个周末没问题。' },
                  { s: 'N', zh: '问：男的这个周末要做什么？' },
                ],
                options: ['去动物园', '参加晚会', '在家休息'],
                answer: 1,
                vi: 'Nữ: Cuối tuần mình đi sở thú xem gấu trúc nhé? — Nam: Cuối tuần này không được, anh phải đi dự tiệc sinh nhật của bạn. — Nữ: Vậy cuối tuần sau? — Nam: Cuối tuần sau thì được. Hỏi: Cuối tuần này người nam sẽ làm gì?',
                explain:
                  'Đi sở thú là cuối tuần SAU; cuối tuần này anh ấy đi dự tiệc.',
              },
              {
                audio: [
                  { s: 'M', zh: '你最近怎么瘦了？' },
                  {
                    s: 'F',
                    zh: '我每天晚上都去锻炼身体，而且少吃了很多甜的东西。',
                  },
                  { s: 'M', zh: '坚持多长时间了？' },
                  { s: 'F', zh: '快三个月了。' },
                  { s: 'N', zh: '问：女的为什么瘦了？' },
                ],
                options: ['生病了', '工作太忙', '锻炼身体'],
                answer: 2,
                vi: 'Nam: Dạo này sao em gầy đi thế? — Nữ: Tối nào em cũng đi tập thể dục, lại bớt ăn đồ ngọt nhiều. — Nam: Kiên trì được bao lâu rồi? — Nữ: Gần ba tháng rồi. Hỏi: Vì sao người nữ gầy đi?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'match-text',
            options: [
              '在桌子上，和你的机票放在一起。',
              '好啊，听说山上的花都开了。',
              '我也觉得，我们换一家吧。',
              '没电了，我可以用一下你的吗？',
              '对不起，我坐错车了。',
              '还可以，就是有几个句子不太懂。',
            ],
            items: [
              {
                text: '你的手机怎么关机了？',
                answer: 3,
                vi: 'Sao điện thoại của bạn tắt máy rồi? → Hết pin rồi, tôi dùng nhờ của bạn một chút được không?',
              },
              {
                text: '这次考试你准备得怎么样？',
                answer: 5,
                vi: 'Kỳ thi lần này bạn chuẩn bị thế nào rồi? → Cũng tạm, chỉ có mấy câu chưa hiểu lắm.',
              },
              {
                text: '这个周末我们去爬山吧！',
                answer: 1,
                vi: 'Cuối tuần này mình đi leo núi nhé! → Được đấy, nghe nói hoa trên núi nở hết rồi.',
              },
              {
                text: '你怎么来得这么晚？',
                answer: 4,
                vi: 'Sao bạn đến muộn thế? → Xin lỗi, tôi lên nhầm xe.',
              },
              {
                text: '你看见我的护照了吗？',
                answer: 0,
                vi: 'Bạn có thấy hộ chiếu của tôi không? → Ở trên bàn, để cùng chỗ với vé máy bay của bạn.',
              },
            ],
          },
          {
            type: 'match-text',
            continues: true,
            options: [
              '我已经很饱了，谢谢。',
              '那你出门的时候多穿点儿衣服。',
              '好的，八层还有一个，您看可以吗？',
              '是我妈妈做的，我只会做面条儿。',
              '她很喜欢看书，每天都要我给她讲故事。',
            ],
            items: [
              {
                text: '外面刮大风了。',
                answer: 1,
                vi: 'Ngoài trời gió to rồi. → Vậy lúc ra ngoài bạn mặc thêm áo vào.',
              },
              {
                text: '这个菜是你做的吗？真好吃！',
                answer: 3,
                vi: 'Món này bạn nấu à? Ngon thật! → Mẹ tôi nấu đấy, tôi chỉ biết nấu mì thôi.',
              },
              {
                text: '你女儿真聪明，才五岁就认识这么多字。',
                answer: 4,
                vi: 'Con gái bạn thông minh thật, mới năm tuổi đã biết nhiều chữ thế. → Con bé rất thích đọc sách, ngày nào cũng đòi tôi kể chuyện.',
              },
              {
                text: '我想换一个大一点儿的房间。',
                answer: 2,
                vi: 'Tôi muốn đổi sang phòng rộng hơn một chút. → Vâng, tầng tám còn một phòng, anh xem được không ạ?',
              },
              {
                text: '你怎么不吃了？',
                answer: 0,
                vi: 'Sao bạn không ăn nữa? → Tôi no lắm rồi, cảm ơn.',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['认真', '季节', '历史', '担心', '一共', '而且'],
            items: [
              {
                text: '秋天是北京最好的（ ），不冷也不热。',
                answer: 1,
                vi: 'Mùa thu là mùa đẹp nhất ở Bắc Kinh, không lạnh cũng không nóng.',
              },
              {
                text: '这个饭馆的菜很好吃，（ ）也不贵。',
                answer: 5,
                vi: 'Đồ ăn của quán này rất ngon, mà lại không đắt.',
              },
              {
                text: '我买了三本书，（ ）花了一百二十块。',
                answer: 4,
                vi: 'Tôi mua ba quyển sách, tổng cộng hết một trăm hai mươi tệ.',
              },
              {
                text: '他上课的时候听得很（ ），所以成绩很好。',
                answer: 0,
                vi: 'Lúc lên lớp cậu ấy nghe giảng rất chăm chú, nên thành tích rất tốt.',
              },
              {
                text: '我对中国的（ ）很感兴趣，读了很多这方面的书。',
                answer: 2,
                vi: 'Tôi rất hứng thú với lịch sử Trung Quốc, đã đọc nhiều sách về mảng này.',
              },
            ],
          },
          {
            type: 'fill-blank',
            continues: true,
            options: ['刚才', '害怕', '极', '越', '放心', '换'],
            items: [
              {
                text: 'A：你妈妈身体怎么样了？\nB：好多了，医生说下个星期就能出院，你（ ）吧。',
                answer: 4,
                vi: 'A: Mẹ bạn sức khoẻ thế nào rồi? — B: Đỡ nhiều rồi, bác sĩ nói tuần sau là ra viện được, bạn yên tâm nhé.',
              },
              {
                text: 'A：你见到小王了吗？\nB：见到了，他（ ）还在这儿，现在可能回家了。',
                answer: 0,
                vi: 'A: Bạn có gặp Tiểu Vương không? — B: Gặp rồi, vừa nãy cậu ấy còn ở đây, giờ chắc về nhà rồi.',
              },
              {
                text: 'A：这个电影怎么样？\nB：好看（ ）了，你一定要去看。',
                answer: 2,
                vi: 'A: Bộ phim này thế nào? — B: Hay cực kỳ, bạn nhất định phải đi xem.',
                explain: 'Tính từ + 极了 = "… cực kỳ" (好看极了).',
              },
              {
                text: 'A：你的孩子晚上一个人睡觉吗？\nB：不，他（ ）黑，晚上要开着灯睡。',
                answer: 1,
                vi: 'A: Buổi tối con bạn ngủ một mình à? — B: Không, nó sợ tối, buổi tối phải bật đèn mới ngủ.',
              },
              {
                text: 'A：雨下得（ ）来越大了。\nB：那我们等一会儿再走吧。',
                answer: 3,
                vi: 'A: Mưa càng lúc càng to rồi. — B: Vậy mình đợi một lát rồi hãy đi.',
                explain:
                  '越来越 + tính từ: càng lúc càng… — chỗ trống là chữ 越 đầu tiên.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                text: '我的爷爷今年八十岁了，但是身体很好。他每天早上都去公园走路，还和朋友们一起唱歌、跳舞。',
                question: '关于爷爷，可以知道什么？',
                options: ['身体很好', '不喜欢唱歌', '每天在家休息'],
                answer: 0,
                vi: 'Ông tôi năm nay tám mươi tuổi nhưng sức khoẻ rất tốt. Sáng nào ông cũng ra công viên đi bộ, còn cùng bạn bè hát, nhảy múa. ★ Về ông, có thể biết điều gì?',
              },
              {
                text: '这个手机是我去年买的，用起来很方便，但是最近常常突然关机，可能要换一个新的了。',
                question: '那个手机有什么问题？',
                options: ['太贵了', '常常关机', '不好看'],
                answer: 1,
                vi: 'Chiếc điện thoại này tôi mua năm ngoái, dùng rất tiện, nhưng dạo này hay tự nhiên tắt máy, có lẽ phải đổi cái mới rồi. ★ Chiếc điện thoại đó có vấn đề gì?',
              },
              {
                text: '很多人觉得早上起床很难，特别是冬天。有一个好办法：晚上早点儿睡觉，把手机放在离床远一点儿的地方。',
                question: '这段话主要是说：',
                options: ['怎么早点儿起床', '冬天很冷', '手机很重要'],
                answer: 0,
                vi: 'Nhiều người thấy buổi sáng dậy rất khó, nhất là mùa đông. Có một cách hay: tối đi ngủ sớm một chút, để điện thoại ở chỗ xa giường một chút. ★ Đoạn văn này chủ yếu nói về:',
              },
              {
                text: '小周是我的大学同学，现在在一家公司当经理。他工作很忙，但是每个月都会回来看看我们这些老同学。',
                question: '小周现在做什么工作？',
                options: ['老师', '经理', '医生'],
                answer: 1,
                vi: 'Tiểu Chu là bạn đại học của tôi, giờ làm quản lý ở một công ty. Cậu ấy rất bận nhưng tháng nào cũng về thăm đám bạn học cũ chúng tôi. ★ Bây giờ Tiểu Chu làm nghề gì?',
              },
              {
                text: '我家附近新开了一个超市，东西又多又便宜，而且晚上十一点才关门。下班以后去买东西非常方便。',
                question: '那个超市：',
                options: ['东西很贵', '关门很早', '下班后去很方便'],
                answer: 2,
                vi: 'Gần nhà tôi mới mở một siêu thị, đồ vừa nhiều vừa rẻ, mà 11 giờ đêm mới đóng cửa. Tan làm đi mua đồ rất tiện. ★ Siêu thị đó:',
              },
              {
                text: '今天的天气很奇怪，上午还是大太阳，下午突然刮起了大风，晚上又下起了雨。',
                question: '今天下午的天气怎么样？',
                options: ['刮风', '下雪', '很热'],
                answer: 0,
                vi: 'Thời tiết hôm nay lạ thật, buổi sáng còn nắng to, chiều tự nhiên nổi gió lớn, tối lại đổ mưa. ★ Thời tiết chiều nay thế nào?',
              },
              {
                text: '我妹妹特别喜欢小动物。她养了两只猫和一只狗，每天放学回家都要先和它们玩儿一会儿。',
                question: '妹妹养了几只猫？',
                options: ['一只', '三只', '两只'],
                answer: 2,
                vi: 'Em gái tôi rất thích động vật nhỏ. Nó nuôi hai con mèo và một con chó, ngày nào tan học về cũng chơi với chúng một lúc. ★ Em gái nuôi mấy con mèo?',
                explain:
                  '两只猫和一只狗 — 2 con mèo, 1 con chó (tổng 3 con vật).',
              },
              {
                text: '现在很多人都用手机看新闻、听音乐、买东西，有的人一天看手机的时间比睡觉的时间还长。',
                question: '根据这段话，可以知道：',
                options: ['很多人不用手机', '手机能做很多事', '大家睡得很多'],
                answer: 1,
                vi: 'Bây giờ nhiều người dùng điện thoại để đọc tin, nghe nhạc, mua đồ; có người mỗi ngày xem điện thoại còn lâu hơn thời gian ngủ. ★ Theo đoạn văn, có thể biết:',
              },
              {
                text: '上个周末我和朋友去看了一场篮球比赛。比赛非常好看，我们都特别高兴，回家的时候已经十一点了。',
                question: '他们周末做什么了？',
                options: ['打篮球', '参加比赛', '看比赛'],
                answer: 2,
                vi: 'Cuối tuần trước tôi và bạn đi xem một trận bóng rổ. Trận đấu rất hay, chúng tôi đều rất vui, lúc về nhà đã 11 giờ rồi. ★ Cuối tuần họ đã làm gì?',
                explain:
                  '看了一场比赛 = đi XEM trận đấu, không phải chơi hay thi đấu.',
              },
              {
                text: '学习一门外语，最重要的是多听多说。不要怕说错，说错了也没关系，只要每天坚持，你的水平一定会提高。',
                question: '说话人认为学外语：',
                options: ['不能说错', '要多听多说', '很容易'],
                answer: 1,
                vi: 'Học một ngoại ngữ, quan trọng nhất là nghe nhiều nói nhiều. Đừng sợ nói sai, nói sai cũng không sao, chỉ cần kiên trì mỗi ngày, trình độ của bạn nhất định sẽ tiến bộ. ★ Người nói cho rằng học ngoại ngữ:',
              },
            ],
          },
        ],
      },
      {
        kind: 'writing',
        parts: [
          {
            type: 'order',
            items: [
              {
                pieces: ['北京', '我', '一次', '去过'],
                answer: '我去过一次北京。',
                alternatives: ['我去过北京一次。'],
                vi: 'Tôi đã đến Bắc Kinh một lần.',
                explain:
                  'Động từ + 过 = đã từng; số lần (一次) đứng sau 过 — trước hay sau tên nơi chốn đều được.',
              },
              {
                pieces: ['很快', '跑', '他', '得'],
                answer: '他跑得很快。',
                vi: 'Anh ấy chạy rất nhanh.',
                explain:
                  'Bổ ngữ trạng thái: động từ + 得 + 很 + tính từ (跑得很快).',
              },
              {
                pieces: ['关上', '请你', '门', '把'],
                answer: '请你把门关上。',
                vi: 'Bạn đóng cửa lại giúp nhé.',
                explain: '把 + tân ngữ (门) + động từ + kết quả (关上).',
              },
              {
                pieces: ['开会', '会议室里', '他们', '正在'],
                answer: '他们正在会议室里开会。',
                alternatives: ['会议室里他们正在开会。'],
                vi: 'Họ đang họp trong phòng họp.',
                explain:
                  '正在 + nơi chốn + động từ: đang làm gì ở đâu; nơi chốn cũng có thể đứng đầu câu.',
              },
              {
                pieces: ['来的', '坐地铁', '我', '是'],
                answer: '我是坐地铁来的。',
                vi: 'Tôi đến bằng tàu điện ngầm.',
                explain:
                  'Cấu trúc 是…的 nhấn mạnh cách thức (坐地铁) của việc đã xảy ra.',
              },
            ],
          },
          {
            type: 'pinyin-char',
            items: [
              {
                text: '我（ ）天去了超市。',
                pinyin: 'zuó',
                choices: ['坐', '左', '昨', '做', '座', '作'],
                answer: 2,
                vi: 'Hôm qua tôi đã đi siêu thị.',
                explain:
                  '昨天 (tạc thiên) = hôm qua; 做/作 đọc zuò, 坐 là ngồi, 左 là bên trái.',
              },
              {
                text: '我妹妹在（ ）院工作，她是医生。',
                pinyin: 'yī',
                choices: ['衣', '以', '意', '一', '已', '医'],
                answer: 5,
                vi: 'Em gái tôi làm ở bệnh viện, nó là bác sĩ.',
                explain:
                  '医院 (y viện) = bệnh viện, 医生 = bác sĩ — cùng chữ 医 (y).',
              },
              {
                text: '这个问题很简（ ），我会做。',
                pinyin: 'dān',
                choices: ['担', '蛋', '淡', '但', '单', '胆'],
                answer: 4,
                vi: 'Câu hỏi này rất đơn giản, tôi làm được.',
                explain:
                  '简单 (giản đơn) = đơn giản; 担 trong 担心, 但 trong 但是.',
              },
              {
                text: '我（ ）天早上都喝牛奶。',
                pinyin: 'měi',
                choices: ['每', '没', '美', '妹', '媒', '眉'],
                answer: 0,
                vi: 'Sáng nào tôi cũng uống sữa.',
                explain:
                  '每天 (mỗi thiên) = mỗi ngày; 没 là "không có", 美 là đẹp.',
              },
              {
                text: '他（ ）在睡觉，别叫他。',
                pinyin: 'zhèng',
                choices: ['证', '整', '争', '正', '政', '挣'],
                answer: 3,
                vi: 'Anh ấy đang ngủ, đừng gọi.',
                explain: '正在 (chính tại) + động từ = đang làm gì.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'hsk3-de-3',
    level: 3,
    title: 'HSK 3 — Đề 3',
    durationMin: 85,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'match-picture',
            pictures: [
              P('🍳', 'nấu ăn'),
              P('🎨', 'vẽ tranh'),
              P('💻', 'máy tính'),
              P('🚌', 'xe buýt'),
              P('🐟', 'cá'),
              P('⚽', 'bóng đá'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你在做什么呢？这么香。' },
                  { s: 'F', zh: '我在做饭，马上就好了。' },
                ],
                answer: 0,
                vi: 'Nam: Em đang làm gì thế? Thơm quá. — Nữ: Em đang nấu cơm, xong ngay đây.',
              },
              {
                audio: [
                  { s: 'F', zh: '你每天怎么去上班？' },
                  { s: 'M', zh: '坐公交车，大概半个小时。' },
                ],
                answer: 3,
                vi: 'Nữ: Hằng ngày anh đi làm bằng gì? — Nam: Đi xe buýt, khoảng nửa tiếng.',
              },
              {
                audio: [
                  { s: 'M', zh: '你画的这只小猫真像！' },
                  { s: 'F', zh: '谢谢，我学画画儿已经三年了。' },
                ],
                answer: 1,
                vi: 'Nam: Con mèo em vẽ giống thật đấy! — Nữ: Cảm ơn anh, em học vẽ ba năm rồi.',
              },
              {
                audio: [
                  { s: 'F', zh: '你的电脑又不能上网了？' },
                  { s: 'M', zh: '是啊，我想明天去买个新的。' },
                ],
                answer: 2,
                vi: 'Nữ: Máy tính của anh lại không vào mạng được à? — Nam: Ừ, anh định mai đi mua cái mới.',
              },
              {
                audio: [
                  { s: 'M', zh: '明天下午的足球比赛你去看吗？' },
                  { s: 'F', zh: '当然去，我最喜欢看足球了。' },
                ],
                answer: 5,
                vi: 'Nam: Trận bóng đá chiều mai em có đi xem không? — Nữ: Tất nhiên rồi, em thích xem bóng đá nhất.',
              },
            ],
          },
          {
            type: 'match-picture',
            continues: true,
            pictures: [
              P('🚿', 'tắm'),
              P('🌙', 'mặt trăng'),
              P('🦷', 'răng, đánh răng'),
              P('🛏️', 'giường ngủ'),
              P('🧥', 'áo khoác'),
            ],
            items: [
              {
                audio: [
                  { s: 'F', zh: '你看，今天晚上的月亮真亮啊！' },
                  { s: 'M', zh: '是啊，我们出去走走吧。' },
                ],
                answer: 1,
                vi: 'Nữ: Anh xem, trăng tối nay sáng quá! — Nam: Ừ, mình ra ngoài đi dạo đi.',
              },
              {
                audio: [
                  { s: 'M', zh: '外面冷，你穿上大衣再出去。' },
                  { s: 'F', zh: '好的，我马上穿。' },
                ],
                answer: 4,
                vi: 'Nam: Ngoài trời lạnh, em mặc áo khoác vào rồi hãy ra. — Nữ: Vâng, em mặc ngay.',
              },
              {
                audio: [
                  { s: 'F', zh: '你怎么还不睡觉？都十二点了。' },
                  { s: 'M', zh: '我马上就睡，看完这页就睡。' },
                ],
                answer: 3,
                vi: 'Nữ: Sao anh còn chưa ngủ? Mười hai giờ rồi. — Nam: Anh ngủ ngay đây, đọc xong trang này là ngủ.',
              },
              {
                audio: [
                  { s: 'M', zh: '刚踢完足球，我先去洗个澡。' },
                  { s: 'F', zh: '好，洗完澡我们一起吃饭。' },
                ],
                answer: 0,
                vi: 'Nam: Vừa đá bóng xong, anh đi tắm trước đã. — Nữ: Được, tắm xong mình cùng ăn cơm.',
              },
              {
                audio: [
                  { s: 'F', zh: '你每天刷几次牙？' },
                  { s: 'M', zh: '早上一次，晚上一次。' },
                ],
                answer: 2,
                vi: 'Nữ: Mỗi ngày anh đánh răng mấy lần? — Nam: Sáng một lần, tối một lần.',
              },
            ],
          },
          {
            type: 'judge-text',
            items: [
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我昨天晚上看了一个电影，名字叫《我的爸爸》。电影很好看，可是太长了，看了三个多小时。',
                  },
                ],
                statement: '那个电影很短。',
                answer: false,
                vi: 'Tối qua tôi xem một bộ phim tên là "Bố tôi". Phim rất hay nhưng dài quá, xem hơn ba tiếng. ★ Bộ phim đó rất ngắn.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我家有四口人：爸爸、妈妈、哥哥和我。哥哥在上海工作，所以平时家里只有我们三个人。',
                  },
                ],
                statement: '她哥哥在上海工作。',
                answer: true,
                vi: 'Nhà tôi có bốn người: bố, mẹ, anh trai và tôi. Anh trai làm việc ở Thượng Hải nên bình thường ở nhà chỉ có ba người chúng tôi. ★ Anh trai cô ấy làm việc ở Thượng Hải.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '这家商店的东西都很便宜，所以周末来买东西的人特别多。我一般都是周一下午来，那个时候人很少。',
                  },
                ],
                statement: '他一般不在周末去那家商店。',
                answer: true,
                vi: 'Đồ ở cửa hàng này đều rẻ nên cuối tuần rất đông người mua. Tôi thường đến vào chiều thứ Hai, lúc đó rất vắng. ★ Anh ấy thường không đến cửa hàng đó vào cuối tuần.',
                explain:
                  'Anh ấy hay đến chiều thứ Hai (周一) — tức là thường KHÔNG đi cuối tuần.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我是去年九月来中国留学的，现在已经一年多了。刚来的时候我很不习惯，现在已经习惯了这里的生活。',
                  },
                ],
                statement: '她现在还不习惯中国的生活。',
                answer: false,
                vi: 'Tôi sang Trung Quốc du học từ tháng Chín năm ngoái, đến nay đã hơn một năm. Hồi mới sang tôi rất không quen, giờ đã quen với cuộc sống ở đây rồi. ★ Bây giờ cô ấy vẫn chưa quen cuộc sống ở Trung Quốc.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '今天早上我起晚了，没吃早饭就去上班了。到了公司，同事给了我一个面包和一杯牛奶，我真高兴。',
                  },
                ],
                statement: '同事给他带了早饭。',
                answer: true,
                vi: 'Sáng nay tôi dậy muộn, chưa ăn sáng đã đi làm. Đến công ty, đồng nghiệp đưa tôi một cái bánh mì và một cốc sữa, tôi vui thật. ★ Đồng nghiệp mang bữa sáng cho anh ấy.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我的手机丢了，里面有很多朋友的电话号码。我现在只能用电脑给他们发邮件，告诉他们我的新号码。',
                  },
                ],
                statement: '她的手机找到了。',
                answer: false,
                vi: 'Điện thoại của tôi bị mất, trong đó có số của nhiều bạn bè. Giờ tôi chỉ có thể dùng máy tính gửi thư điện tử cho họ, báo số mới của tôi. ★ Cô ấy đã tìm thấy điện thoại.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我们学校的图书馆很大，有很多书，而且环境很好，很安静。可是周末下午五点就关门了。',
                  },
                ],
                statement: '图书馆周末很晚才关门。',
                answer: false,
                vi: 'Thư viện trường tôi rất rộng, có nhiều sách, môi trường lại tốt, rất yên tĩnh. Nhưng cuối tuần 5 giờ chiều đã đóng cửa. ★ Cuối tuần thư viện rất muộn mới đóng cửa.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '小王很喜欢运动，特别是打篮球。他个子不高，但是篮球打得非常好，是我们班打得最好的。',
                  },
                ],
                statement: '小王篮球打得很好。',
                answer: true,
                vi: 'Tiểu Vương rất thích thể thao, nhất là bóng rổ. Cậu ấy không cao nhưng chơi bóng rổ rất giỏi, giỏi nhất lớp chúng tôi. ★ Tiểu Vương chơi bóng rổ rất giỏi.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '为了身体健康，我妈妈每天晚饭后都要出去走一个小时。就是下雨，她也会带上伞出去走。',
                  },
                ],
                statement: '下雨的时候妈妈不出去走。',
                answer: false,
                vi: 'Để giữ sức khoẻ, ngày nào mẹ tôi cũng ra ngoài đi bộ một tiếng sau bữa tối. Dù trời mưa, mẹ cũng mang ô ra ngoài đi. ★ Lúc trời mưa mẹ không ra ngoài đi bộ.',
                explain: '就是…也… = dù … cũng … — trời mưa mẹ VẪN đi.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我对这个新房子很满意。房间不太大，但是很干净，离公司也很近，走路十分钟就到了。',
                  },
                ],
                statement: '她对新房子很满意。',
                answer: true,
                vi: 'Tôi rất hài lòng với căn nhà mới này. Phòng không rộng lắm nhưng rất sạch, lại gần công ty, đi bộ mười phút là tới. ★ Cô ấy hài lòng với căn nhà mới.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '你要的那本书，我帮你买到了。' },
                  { s: 'M', zh: '太好了，多少钱？我给你。' },
                  { s: 'N', zh: '问：女的帮男的做什么了？' },
                ],
                options: ['买书', '借书', '看书'],
                answer: 0,
                vi: 'Nữ: Quyển sách anh cần, em mua được giúp anh rồi. — Nam: Tốt quá, bao nhiêu tiền? Anh gửi em. Hỏi: Người nữ đã giúp người nam làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '我们晚上去看电影吧？' },
                  { s: 'F', zh: '今天不行，我还有很多工作没做完。' },
                  { s: 'N', zh: '问：女的今天晚上可能做什么？' },
                ],
                options: ['看电影', '工作', '休息'],
                answer: 1,
                vi: 'Nam: Tối nay mình đi xem phim nhé? — Nữ: Hôm nay không được, em còn nhiều việc chưa làm xong. Hỏi: Tối nay người nữ có thể sẽ làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '这件衣服你穿着有点儿大，换一件吧。' },
                  { s: 'M', zh: '好，有小一点儿的吗？' },
                  { s: 'N', zh: '问：这件衣服怎么样？' },
                ],
                options: ['有点儿大', '太贵了', '颜色不好'],
                answer: 0,
                vi: 'Nữ: Chiếc áo này anh mặc hơi rộng, đổi chiếc khác đi. — Nam: Được, có cỡ nhỏ hơn không? Hỏi: Chiếc áo này thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你女儿学习怎么样？' },
                  {
                    s: 'F',
                    zh: '还不错，就是数学不太好，我想给她找一个老师。',
                  },
                  { s: 'N', zh: '问：女儿哪门课不太好？' },
                ],
                options: ['汉语', '历史', '数学'],
                answer: 2,
                vi: 'Nam: Con gái chị học hành thế nào? — Nữ: Cũng khá, chỉ có môn toán chưa tốt lắm, tôi định tìm thầy cho con. Hỏi: Con gái học môn nào chưa tốt?',
              },
              {
                audio: [
                  { s: 'F', zh: '请问，去火车站坐几路公交车？' },
                  { s: 'M', zh: '坐八路就可以，车站就在前面。' },
                  { s: 'N', zh: '问：去火车站要坐几路车？' },
                ],
                options: ['六路', '十路', '八路'],
                answer: 2,
                vi: 'Nữ: Xin hỏi, đi ga tàu thì bắt xe buýt số mấy? — Nam: Đi số 8 là được, bến xe ở ngay phía trước. Hỏi: Đi ga tàu phải bắt xe số mấy?',
              },
              {
                audio: [
                  { s: 'M', zh: '你看起来很高兴，有什么好事？' },
                  { s: 'F', zh: '我找到了一个新工作，下个月就去上班。' },
                  { s: 'N', zh: '问：女的为什么很高兴？' },
                ],
                options: ['要去旅游', '找到了工作', '考试考得好'],
                answer: 1,
                vi: 'Nam: Trông em vui thế, có chuyện gì hay à? — Nữ: Em tìm được việc mới rồi, tháng sau đi làm luôn. Hỏi: Vì sao người nữ rất vui?',
              },
              {
                audio: [
                  { s: 'F', zh: '你的感冒好了吗？' },
                  { s: 'M', zh: '好多了，不发烧了，就是还有点儿累。' },
                  { s: 'N', zh: '问：男的现在怎么样？' },
                ],
                options: ['还在发烧', '有点儿累', '已经好了'],
                answer: 1,
                vi: 'Nữ: Anh khỏi cảm chưa? — Nam: Đỡ nhiều rồi, hết sốt rồi, chỉ là vẫn hơi mệt. Hỏi: Bây giờ người nam thế nào?',
                explain:
                  '好多了 = đỡ nhiều rồi, chưa phải đã khỏi hẳn — vẫn còn 有点儿累.',
              },
              {
                audio: [
                  { s: 'M', zh: '这个周末你回家吗？' },
                  {
                    s: 'F',
                    zh: '不回了，下个星期就要考试了，我要在学校复习。',
                  },
                  { s: 'N', zh: '问：女的为什么不回家？' },
                ],
                options: ['要复习', '没有车票', '家里没人'],
                answer: 0,
                vi: 'Nam: Cuối tuần này em có về nhà không? — Nữ: Không về đâu, tuần sau thi rồi, em phải ở trường ôn bài. Hỏi: Vì sao người nữ không về nhà?',
              },
              {
                audio: [
                  { s: 'F', zh: '你会骑自行车吗？' },
                  { s: 'M', zh: '会，小时候爸爸教我的。' },
                  { s: 'N', zh: '问：谁教男的骑自行车？' },
                ],
                options: ['妈妈', '爸爸', '哥哥'],
                answer: 1,
                vi: 'Nữ: Anh biết đi xe đạp không? — Nam: Biết, hồi nhỏ bố dạy anh. Hỏi: Ai dạy người nam đi xe đạp?',
              },
              {
                audio: [
                  { s: 'M', zh: '你喝点儿什么？咖啡还是茶？' },
                  { s: 'F', zh: '我晚上不喝咖啡，喝了睡不着，给我一杯水吧。' },
                  { s: 'N', zh: '问：女的要喝什么？' },
                ],
                options: ['咖啡', '茶', '水'],
                answer: 2,
                vi: 'Nam: Em uống gì? Cà phê hay trà? — Nữ: Buổi tối em không uống cà phê, uống vào là không ngủ được, cho em một cốc nước. Hỏi: Người nữ muốn uống gì?',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'M', zh: '你这次去上海玩儿了几天？' },
                  {
                    s: 'F',
                    zh: '我打算玩儿五天，但是公司有事，三天就回来了。',
                  },
                  { s: 'M', zh: '那下次再去吧。' },
                  { s: 'F', zh: '好啊，下次我们一起去。' },
                  { s: 'N', zh: '问：女的在上海玩儿了几天？' },
                ],
                options: ['三天', '五天', '八天'],
                answer: 0,
                vi: 'Nam: Lần này em đi Thượng Hải chơi mấy ngày? — Nữ: Em định chơi năm ngày, nhưng công ty có việc nên ba ngày đã về. — Nam: Vậy lần sau đi tiếp. — Nữ: Được, lần sau mình cùng đi. Hỏi: Người nữ chơi ở Thượng Hải mấy ngày?',
                explain:
                  'Năm ngày là dự định (打算); thực tế ba ngày đã về (三天就回来了).',
              },
              {
                audio: [
                  { s: 'F', zh: '你的汉语老师是哪国人？' },
                  { s: 'M', zh: '是中国人，她来越南已经十年了。' },
                  { s: 'F', zh: '她会说越南语吗？' },
                  { s: 'M', zh: '会，而且说得非常好。' },
                  { s: 'N', zh: '问：关于那位老师，可以知道什么？' },
                ],
                options: ['是越南人', '会说越南语', '来越南两年了'],
                answer: 1,
                vi: 'Nữ: Thầy cô dạy tiếng Trung của anh là người nước nào? — Nam: Người Trung Quốc, cô ấy sang Việt Nam được mười năm rồi. — Nữ: Cô ấy biết nói tiếng Việt không? — Nam: Biết, lại nói rất giỏi. Hỏi: Về cô giáo đó, có thể biết điều gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '今天的作业你写完了吗？' },
                  { s: 'F', zh: '还没有，有几个题我不会做。' },
                  { s: 'M', zh: '我可以帮你看看。' },
                  { s: 'F', zh: '太好了，谢谢你！' },
                  { s: 'N', zh: '问：男的要做什么？' },
                ],
                options: ['去写作业', '帮女的看题', '去问老师'],
                answer: 1,
                vi: 'Nam: Bài tập hôm nay em làm xong chưa? — Nữ: Chưa, có mấy câu em không biết làm. — Nam: Anh xem giúp em nhé. — Nữ: Tốt quá, cảm ơn anh! Hỏi: Người nam sẽ làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你家附近有超市吗？' },
                  { s: 'M', zh: '有，走路五分钟就到了。' },
                  { s: 'F', zh: '大不大？东西多吗？' },
                  { s: 'M', zh: '不太大，但是买东西很方便。' },
                  { s: 'N', zh: '问：男的家附近的超市怎么样？' },
                ],
                options: ['很大', '很远', '很方便'],
                answer: 2,
                vi: 'Nữ: Gần nhà anh có siêu thị không? — Nam: Có, đi bộ năm phút là tới. — Nữ: Có to không? Nhiều đồ không? — Nam: Không to lắm, nhưng mua đồ rất tiện. Hỏi: Siêu thị gần nhà người nam thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你怎么买了这么多水果？' },
                  { s: 'F', zh: '明天我的几个同事要来我家做客。' },
                  { s: 'M', zh: '要我帮你做饭吗？' },
                  { s: 'F', zh: '不用了，我已经准备好了。' },
                  { s: 'N', zh: '问：女的为什么买很多水果？' },
                ],
                options: ['有客人要来', '水果很便宜', '自己喜欢吃'],
                answer: 0,
                vi: 'Nam: Sao em mua nhiều hoa quả thế? — Nữ: Mai mấy đồng nghiệp của em đến nhà chơi. — Nam: Có cần anh nấu cơm giúp không? — Nữ: Không cần đâu, em chuẩn bị xong rồi. Hỏi: Vì sao người nữ mua nhiều hoa quả?',
              },
              {
                audio: [
                  { s: 'F', zh: '喂，你好，我的房间空调坏了。' },
                  { s: 'M', zh: '对不起，您住几号房间？' },
                  { s: 'F', zh: '八零六。' },
                  { s: 'M', zh: '好的，我们马上让人去看看。' },
                  { s: 'N', zh: '问：女的最可能在哪儿？' },
                ],
                options: ['公司', '宾馆', '学校'],
                answer: 1,
                vi: 'Nữ: A lô, chào anh, điều hoà phòng tôi hỏng rồi. — Nam: Xin lỗi, chị ở phòng số mấy ạ? — Nữ: 806. — Nam: Vâng, chúng tôi cho người lên xem ngay. Hỏi: Người nữ nhiều khả năng đang ở đâu?',
              },
              {
                audio: [
                  { s: 'M', zh: '你每天都来这个公园吗？' },
                  { s: 'F', zh: '是啊，我每天早上都来这儿锻炼身体。' },
                  { s: 'M', zh: '一般锻炼多长时间？' },
                  { s: 'F', zh: '一个小时左右。' },
                  { s: 'N', zh: '问：女的每天早上来公园做什么？' },
                ],
                options: ['看花', '见朋友', '锻炼身体'],
                answer: 2,
                vi: 'Nam: Ngày nào chị cũng đến công viên này à? — Nữ: Vâng, sáng nào tôi cũng đến đây tập thể dục. — Nam: Thường tập bao lâu? — Nữ: Khoảng một tiếng. Hỏi: Sáng nào người nữ cũng đến công viên làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你的新同事怎么样？' },
                  { s: 'M', zh: '她人很好，工作也很认真。' },
                  { s: 'F', zh: '是哪国人？' },
                  { s: 'M', zh: '是越南人，汉语说得非常好。' },
                  { s: 'N', zh: '问：男的觉得新同事怎么样？' },
                ],
                options: ['工作很认真', '不太热情', '汉语不好'],
                answer: 0,
                vi: 'Nữ: Đồng nghiệp mới của anh thế nào? — Nam: Cô ấy rất tốt, làm việc cũng rất chăm chỉ. — Nữ: Người nước nào? — Nam: Người Việt Nam, nói tiếng Trung rất giỏi. Hỏi: Người nam thấy đồng nghiệp mới thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你好，这件衬衫多少钱？' },
                  { s: 'F', zh: '三百五十块。' },
                  { s: 'M', zh: '有点儿贵，能便宜一点儿吗？' },
                  { s: 'F', zh: '三百吧，不能再少了。' },
                  { s: 'N', zh: '问：衬衫最后可能卖多少钱？' },
                ],
                options: ['二百五十', '三百', '三百五十'],
                answer: 1,
                vi: 'Nam: Chào chị, chiếc áo sơ mi này bao nhiêu tiền? — Nữ: Ba trăm năm mươi tệ. — Nam: Hơi đắt, bớt một chút được không? — Nữ: Ba trăm thôi, không bớt hơn được nữa. Hỏi: Cuối cùng chiếc áo có thể bán bao nhiêu tiền?',
              },
              {
                audio: [
                  { s: 'F', zh: '你下个月去旅游的地方决定了吗？' },
                  { s: 'M', zh: '还没有，我想去海边，我妻子想去山上。' },
                  { s: 'F', zh: '那怎么办？' },
                  { s: 'M', zh: '我们打算先去海边，再去山上。' },
                  { s: 'N', zh: '问：他们打算先去哪儿？' },
                ],
                options: ['山上', '朋友家', '海边'],
                answer: 2,
                vi: 'Nữ: Chỗ đi du lịch tháng sau anh quyết định chưa? — Nam: Chưa, anh muốn ra biển, vợ anh muốn lên núi. — Nữ: Vậy làm sao? — Nam: Bọn anh định ra biển trước, rồi lên núi. Hỏi: Họ định đi đâu trước?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'match-text',
            options: [
              '我也不认识，你查一下词典吧。',
              '不客气，这是我应该做的。',
              '很喜欢，这里的冬天不太冷，夏天也很凉快。',
              '别着急，是不是放在车上了？',
              '我很想去，但是我的腿还在疼。',
              '晚上我要去参加朋友的生日晚会。',
            ],
            items: [
              {
                text: '我的钱包找不到了。',
                answer: 3,
                vi: 'Tôi không tìm thấy ví đâu cả. → Đừng vội, có phải để quên trên xe không?',
              },
              {
                text: '你今天怎么穿得这么漂亮？',
                answer: 5,
                vi: 'Sao hôm nay bạn mặc đẹp thế? → Tối nay tôi đi dự tiệc sinh nhật của bạn.',
              },
              {
                text: '我们下个星期去爬山，你去吗？',
                answer: 4,
                vi: 'Tuần sau bọn mình đi leo núi, bạn có đi không? → Tôi rất muốn đi, nhưng chân tôi vẫn còn đau.',
              },
              {
                text: '这个汉字怎么读？',
                answer: 0,
                vi: 'Chữ Hán này đọc thế nào? → Tôi cũng không biết, bạn tra từ điển xem.',
              },
              {
                text: '你喜欢这个城市吗？',
                answer: 2,
                vi: 'Bạn có thích thành phố này không? → Rất thích, mùa đông ở đây không lạnh lắm, mùa hè cũng mát.',
              },
            ],
          },
          {
            type: 'match-text',
            continues: true,
            options: [
              '那我们走楼梯上去吧。',
              '谢谢，我每天都和中国朋友聊天儿。',
              '不客气，有事你就给我打电话。',
              '在你的书包里吧？我看见你放进去了。',
              '差不多了，我已经复习了一个星期。',
            ],
            items: [
              {
                text: '谢谢你昨天帮我搬家。',
                answer: 2,
                vi: 'Cảm ơn bạn hôm qua đã giúp tôi chuyển nhà. → Không có gì, có việc gì cứ gọi điện cho tôi.',
              },
              {
                text: '明天的考试你准备好了吗？',
                answer: 4,
                vi: 'Bài thi ngày mai bạn chuẩn bị xong chưa? → Gần xong rồi, tôi đã ôn một tuần.',
              },
              {
                text: '这个电梯坏了。',
                answer: 0,
                vi: 'Thang máy này hỏng rồi. → Vậy mình đi thang bộ lên nhé.',
              },
              {
                text: '你看见我的耳机了吗？',
                answer: 3,
                vi: 'Bạn có thấy tai nghe của tôi không? → Trong cặp sách của bạn ấy? Tôi thấy bạn cho vào rồi.',
              },
              {
                text: '你的汉语说得越来越好了！',
                answer: 1,
                vi: 'Tiếng Trung của bạn càng ngày càng giỏi! → Cảm ơn, ngày nào tôi cũng trò chuyện với bạn người Trung Quốc.',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['发现', '新鲜', '机会', '离开', '其实', '习惯'],
            items: [
              {
                text: '这次去北京学习是一个很好的（ ），你一定要去。',
                answer: 2,
                vi: 'Lần đi Bắc Kinh học này là một cơ hội rất tốt, bạn nhất định phải đi.',
              },
              {
                text: '我回到家才（ ）手机忘在公司了。',
                answer: 0,
                vi: 'Về đến nhà tôi mới phát hiện để quên điện thoại ở công ty.',
              },
              {
                text: '他看起来很年轻，（ ）已经五十岁了。',
                answer: 4,
                vi: 'Trông anh ấy rất trẻ, thực ra đã năm mươi tuổi rồi.',
              },
              {
                text: '我在中国住了两年，已经（ ）了这里的天气。',
                answer: 5,
                vi: 'Tôi sống ở Trung Quốc hai năm, đã quen với thời tiết ở đây rồi.',
              },
              {
                text: '这些水果都很（ ），是今天早上刚到的。',
                answer: 1,
                vi: 'Chỗ hoa quả này đều rất tươi, sáng nay mới về.',
              },
            ],
          },
          {
            type: 'fill-blank',
            continues: true,
            options: ['必须', '遇到', '打算', '一定', '照顾', '注意'],
            items: [
              {
                text: 'A：放假以后你有什么（ ）？\nB：我想去南方旅游。',
                answer: 2,
                vi: 'A: Nghỉ lễ rồi bạn có dự định gì? — B: Tôi muốn đi du lịch miền Nam.',
              },
              {
                text: 'A：我明天要去外地，我的小狗你能帮我（ ）几天吗？\nB：没问题，你放心吧。',
                answer: 4,
                vi: 'A: Mai tôi phải đi xa, bạn chăm giúp tôi con chó mấy hôm được không? — B: Không vấn đề gì, bạn yên tâm.',
              },
              {
                text: 'A：开车的时候要（ ）安全。\nB：知道了，我会开得慢一点儿。',
                answer: 5,
                vi: 'A: Lúc lái xe phải chú ý an toàn. — B: Biết rồi, tôi sẽ lái chậm một chút.',
              },
              {
                text: 'A：我昨天在超市（ ）了我们的老同学。\nB：真的吗？他现在怎么样？',
                answer: 1,
                vi: 'A: Hôm qua tôi gặp bạn học cũ của chúng mình ở siêu thị. — B: Thật à? Giờ cậu ấy thế nào?',
              },
              {
                text: 'A：这个药一天吃几次？\nB：一天三次，你（ ）饭后吃。',
                answer: 0,
                vi: 'A: Thuốc này một ngày uống mấy lần? — B: Một ngày ba lần, bạn phải uống sau bữa ăn.',
                explain:
                  '必须 + động từ = bắt buộc phải; 一定 phải đi với 要 (一定要) mới dùng được ở đây.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                text: '我的同事小王非常喜欢旅游，每年放假他都会去一个新的地方。他说，旅游不但能让人开心，而且能了解不同的文化。',
                question: '小王认为旅游能让人：',
                options: ['很累', '了解文化', '花很多钱'],
                answer: 1,
                vi: 'Đồng nghiệp Tiểu Vương của tôi rất thích du lịch, năm nào nghỉ lễ cũng đi một nơi mới. Cậu ấy nói du lịch không chỉ làm người ta vui mà còn giúp hiểu những nền văn hoá khác nhau. ★ Tiểu Vương cho rằng du lịch giúp người ta:',
              },
              {
                text: '现在越来越多的人选择坐高铁去旅游。高铁不但快，而且很少晚点，坐着也很舒服。',
                question: '根据这段话，高铁：',
                options: ['很少晚点', '很便宜', '很慢'],
                answer: 0,
                vi: 'Bây giờ ngày càng nhiều người chọn đi tàu cao tốc khi du lịch. Tàu cao tốc không chỉ nhanh mà còn ít khi trễ giờ, ngồi cũng rất thoải mái. ★ Theo đoạn văn, tàu cao tốc:',
              },
              {
                text: '我奶奶今年七十多岁了，她每天都看新闻，还学会了用手机上网，有时候她知道的事情比我还多。',
                question: '关于奶奶，可以知道：',
                options: ['不会用手机', '不看新闻', '会上网'],
                answer: 2,
                vi: 'Bà tôi năm nay hơn bảy mươi tuổi, ngày nào bà cũng xem thời sự, còn học được cách dùng điện thoại lên mạng, có lúc bà biết chuyện còn nhiều hơn tôi. ★ Về bà, có thể biết:',
              },
              {
                text: '中国人吃饭一般用筷子，可是我刚来中国的时候不会用，只能用勺子。后来我的中国朋友教我，现在我已经用得很好了。',
                question: '他现在吃饭：',
                options: ['只用勺子', '不吃中国菜', '会用筷子'],
                answer: 2,
                vi: 'Người Trung Quốc ăn cơm thường dùng đũa, nhưng hồi mới sang Trung Quốc tôi không biết dùng, chỉ dùng được thìa. Sau đó bạn Trung Quốc dạy tôi, giờ tôi dùng thạo rồi. ★ Bây giờ anh ấy ăn cơm:',
                explain:
                  'Chỉ dùng thìa là lúc MỚI sang (刚来的时候); bây giờ đã dùng đũa thạo.',
              },
              {
                text: '这个小区的环境非常好，有很多树和花，还有一个小公园。很多老人早上都在这里锻炼身体。',
                question: '这个小区：',
                options: ['环境很好', '没有公园', '老人很少'],
                answer: 0,
                vi: 'Môi trường của khu dân cư này rất tốt, có nhiều cây và hoa, còn có một công viên nhỏ. Sáng sáng nhiều người già tập thể dục ở đây. ★ Khu dân cư này:',
              },
              {
                text: '我上个星期感冒了，一直发烧，头也很疼。医生让我多喝水，多休息，现在我已经好多了。',
                question: '医生让他：',
                options: ['多运动', '多休息', '多吃药'],
                answer: 1,
                vi: 'Tuần trước tôi bị cảm, sốt suốt, đầu cũng rất đau. Bác sĩ bảo tôi uống nhiều nước, nghỉ ngơi nhiều, giờ tôi đã đỡ nhiều rồi. ★ Bác sĩ bảo anh ấy:',
              },
              {
                text: '我的邻居是一位老师，她教小学二年级。她对学生要求很高，但是也很关心他们，所以学生们都很喜欢她。',
                question: '学生们为什么喜欢这位老师？',
                options: ['她很关心学生', '她很年轻', '她要求不高'],
                answer: 0,
                vi: 'Hàng xóm của tôi là một cô giáo, dạy lớp hai tiểu học. Cô yêu cầu học sinh rất cao nhưng cũng rất quan tâm đến các em, nên học sinh đều rất quý cô. ★ Vì sao học sinh quý cô giáo này?',
              },
              {
                text: '今天是周末，我想在家睡一个上午。可是朋友一大早就打电话来，让我和他一起去买电脑，我只好起床了。',
                question: '他今天上午做什么了？',
                options: ['在家睡觉', '去公司上班', '和朋友买电脑'],
                answer: 2,
                vi: 'Hôm nay là cuối tuần, tôi muốn ở nhà ngủ cả buổi sáng. Nhưng sáng sớm bạn đã gọi điện bảo tôi cùng đi mua máy tính, tôi đành phải dậy. ★ Sáng nay anh ấy đã làm gì?',
                explain:
                  'Ngủ cả sáng chỉ là điều anh ấy MUỐN (想); thực tế phải dậy đi mua máy tính với bạn.',
              },
              {
                text: '学校旁边新开了一家咖啡馆，里面很安静，咖啡也好喝。很多学生下课以后都喜欢去那里看书、写作业。',
                question: '很多学生下课后去咖啡馆：',
                options: ['看书、写作业', '见朋友', '唱歌'],
                answer: 0,
                vi: 'Cạnh trường mới mở một quán cà phê, bên trong rất yên tĩnh, cà phê cũng ngon. Nhiều học sinh tan học thích đến đó đọc sách, làm bài tập. ★ Nhiều học sinh tan học đến quán cà phê để:',
              },
              {
                text: '去年冬天我第一次去北方，那里特别冷，下了很大的雪。虽然很冷，但是我觉得雪非常漂亮，还拍了很多照片。',
                question: '他觉得北方的雪：',
                options: ['不好看', '很漂亮', '很少'],
                answer: 1,
                vi: 'Mùa đông năm ngoái lần đầu tiên tôi ra miền Bắc, ở đó rất lạnh, tuyết rơi rất dày. Tuy lạnh nhưng tôi thấy tuyết rất đẹp, còn chụp rất nhiều ảnh. ★ Anh ấy thấy tuyết ở miền Bắc:',
              },
            ],
          },
        ],
      },
      {
        kind: 'writing',
        parts: [
          {
            type: 'order',
            items: [
              {
                pieces: ['妈妈', '这本书', '送给我的', '是'],
                answer: '这本书是妈妈送给我的。',
                vi: 'Quyển sách này là mẹ tặng tôi.',
                explain:
                  'Cấu trúc 是…的 nhấn mạnh người làm (妈妈) của việc đã xảy ra.',
              },
              {
                pieces: ['一点儿', '请', '说', '慢'],
                answer: '请说慢一点儿。',
                alternatives: ['请慢一点儿说。'],
                vi: 'Xin nói chậm một chút.',
                explain:
                  '慢一点儿 đứng sau động từ (说慢一点儿) hoặc trước động từ (慢一点儿说) — khi nhờ ai đó, cả hai đều dùng được.',
              },
              {
                pieces: ['被', '吃了', '小猫', '鱼'],
                answer: '鱼被小猫吃了。',
                vi: 'Con cá bị mèo con ăn mất rồi.',
                explain:
                  'Câu bị động: vật chịu tác động (鱼) + 被 + người/vật gây ra (小猫) + động từ.',
              },
              {
                pieces: ['都去了', '除了小王', '以外', '大家'],
                answer: '除了小王以外，大家都去了。',
                vi: 'Ngoài Tiểu Vương ra, mọi người đều đi rồi.',
                explain: '除了…以外，…都…: trừ … ra thì đều ….',
              },
              {
                pieces: ['我们', '一边', '一边', '聊天儿', '喝咖啡'],
                answer: '我们一边喝咖啡一边聊天儿。',
                alternatives: ['我们一边聊天儿一边喝咖啡。'],
                vi: 'Chúng tôi vừa uống cà phê vừa trò chuyện.',
                explain:
                  '一边 A 一边 B: vừa làm A vừa làm B — đổi chỗ hai việc vẫn đúng.',
              },
            ],
          },
          {
            type: 'pinyin-char',
            items: [
              {
                text: '我很（ ）欢吃中国菜。',
                pinyin: 'xǐ',
                choices: ['西', '洗', '习', '喜', '希', '戏'],
                answer: 3,
                vi: 'Tôi rất thích ăn món Trung Quốc.',
                explain:
                  '喜欢 (hỉ hoan) = thích; 洗 là rửa/giặt, 西 là phía tây.',
              },
              {
                text: '你的电（ ）号码是多少？',
                pinyin: 'huà',
                choices: ['花', '化', '画', '华', '划', '话'],
                answer: 5,
                vi: 'Số điện thoại của bạn là bao nhiêu?',
                explain:
                  '电话 (điện thoại) — chữ 话 có bộ 讠 (lời nói); 画 là vẽ, 花 là hoa.',
              },
              {
                text: '我（ ）天上午去图书馆。',
                pinyin: 'jīn',
                choices: ['进', '今', '近', '金', '斤', '紧'],
                answer: 1,
                vi: 'Sáng nay tôi đi thư viện.',
                explain: '今天 (kim thiên) = hôm nay; 进 là vào, 近 là gần.',
              },
              {
                text: '我很（ ）心他的身体。',
                pinyin: 'guān',
                choices: ['关', '馆', '观', '惯', '管', '官'],
                answer: 0,
                vi: 'Tôi rất quan tâm đến sức khoẻ của anh ấy.',
                explain:
                  '关心 (quan tâm) — đúng chữ 关 của "quan tâm"; 馆 là quán, 惯 trong 习惯.',
              },
              {
                text: '这条路很（ ）。',
                pinyin: 'cháng',
                choices: ['常', '唱', '场', '尝', '长', '厂'],
                answer: 4,
                vi: 'Con đường này rất dài.',
                explain:
                  '长 (trường) = dài, đọc cháng; đọc zhǎng thì là "lớn lên, trưởng".',
              },
            ],
          },
        ],
      },
    ],
  },
];
