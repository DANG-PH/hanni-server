import type { MockPaper, Picture } from '../mock-exam.types';

/**
 * 3 đề thi thử HSK 2 — Hanni tự soạn (không chép đề thật), chỉ dùng chữ trong
 * từ vựng HSK 1–2 (HSK 3.0, ~500 từ) cộng vài tên riêng (北京, 上海, 越南, họ
 * 王/张/李) — spec kiểm tra từng chữ. Cấu trúc đề HSK 2 hiện hành (60 câu,
 * 50 phút làm bài):
 * - Nghe: 1–10 nghe câu, đối chiếu tranh ✓/✗ · 11–20 nghe hội thoại ghép tranh
 *   (11–15 bộ A–F thừa 1, 16–20 bộ A–E riêng) · 21–30 hội thoại ngắn + câu hỏi
 *   chọn A/B/C · 31–35 hội thoại dài + câu hỏi chọn A/B/C.
 * - Đọc: 36–40 đọc câu ghép tranh · 41–45 điền từ · 46–50 đọc đoạn, xét câu ★
 *   đúng/sai · 51–60 ghép câu hỏi – câu trả lời (51–55 bộ A–F, 56–60 bộ A–E).
 * Tránh các từ hay gặp trong đề HSK 2 CŨ nhưng không thuộc HSK 3.0 cấp 1–2
 * (伞, 刚, 才, 更, 难, 礼物, 自行车…) để người học không gặp từ chưa học.
 */
const P = (e: string, vi: string): Picture => ({ e, vi });

export const HSK2_PAPERS: MockPaper[] = [
  {
    slug: 'hsk2-de-1',
    level: 2,
    title: 'HSK 2 — Đề 1',
    durationMin: 50,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'judge',
            items: [
              {
                audio: [{ s: 'F', zh: '我每天早上跑步。' }],
                picture: P('🏃', 'chạy bộ'),
                answer: true,
                vi: 'Sáng nào tôi cũng chạy bộ.',
              },
              {
                audio: [{ s: 'M', zh: '他正在打篮球。' }],
                picture: P('⚽', 'đá bóng'),
                answer: false,
                vi: 'Anh ấy đang chơi bóng rổ.',
              },
              {
                audio: [{ s: 'F', zh: '今天外面下雨了。' }],
                picture: P('🌧️', 'trời mưa'),
                answer: true,
                vi: 'Hôm nay bên ngoài mưa rồi.',
              },
              {
                audio: [{ s: 'M', zh: '我很喜欢喝咖啡。' }],
                picture: P('☕', 'cà phê'),
                answer: true,
                vi: 'Tôi rất thích uống cà phê.',
              },
              {
                audio: [{ s: 'F', zh: '这是我新买的手表。' }],
                picture: P('📱', 'điện thoại'),
                answer: false,
                vi: 'Đây là chiếc đồng hồ tôi mới mua.',
              },
              {
                audio: [{ s: 'M', zh: '我妹妹在画画儿。' }],
                picture: P('💃', 'nhảy múa'),
                answer: false,
                vi: 'Em gái tôi đang vẽ tranh.',
              },
              {
                audio: [{ s: 'F', zh: '她坐飞机去北京。' }],
                picture: P('✈️', 'máy bay'),
                answer: true,
                vi: 'Cô ấy đi máy bay tới Bắc Kinh.',
              },
              {
                audio: [{ s: 'M', zh: '我头疼，想休息一会儿。' }],
                picture: P('🤕', 'đau đầu'),
                answer: true,
                vi: 'Tôi đau đầu, muốn nghỉ một lát.',
              },
              {
                audio: [{ s: 'F', zh: '他们在教室里考试。' }],
                picture: P('🏊', 'bơi lội'),
                answer: false,
                vi: 'Họ đang làm bài thi trong lớp học.',
              },
              {
                audio: [{ s: 'M', zh: '我买了三条鱼。' }],
                picture: P('🐦🐦🐦', 'ba con chim'),
                answer: false,
                vi: 'Tôi đã mua ba con cá.',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🎂', 'sinh nhật'),
              P('🏊', 'đi bơi'),
              P('📚', 'đọc sách'),
              P('💊', 'uống thuốc'),
              P('🛍️', 'đi trung tâm thương mại'),
              P('🚇', 'tàu điện ngầm'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你身体不舒服吗？' },
                  { s: 'F', zh: '我头疼，已经吃药了。' },
                ],
                answer: 3,
                vi: 'Nam: Em thấy không khoẻ à? — Nữ: Em đau đầu, đã uống thuốc rồi.',
              },
              {
                audio: [
                  { s: 'F', zh: '明天是你的生日吧？' },
                  { s: 'M', zh: '是啊，我们一起吃饭吧。' },
                ],
                answer: 0,
                vi: 'Nữ: Mai là sinh nhật anh phải không? — Nam: Đúng rồi, mình cùng đi ăn nhé.',
              },
              {
                audio: [
                  { s: 'M', zh: '你怎么去机场？' },
                  { s: 'F', zh: '坐地铁去，地铁很快。' },
                ],
                answer: 5,
                vi: 'Nam: Em ra sân bay bằng gì? — Nữ: Đi tàu điện ngầm, tàu điện ngầm rất nhanh.',
              },
              {
                audio: [
                  { s: 'F', zh: '你喜欢什么运动？' },
                  { s: 'M', zh: '我最喜欢游泳。' },
                ],
                answer: 1,
                vi: 'Nữ: Anh thích môn thể thao nào? — Nam: Anh thích bơi nhất.',
              },
              {
                audio: [
                  { s: 'M', zh: '下午你想去哪儿？' },
                  { s: 'F', zh: '我想去商场买衣服。' },
                ],
                answer: 4,
                vi: 'Nam: Chiều nay em muốn đi đâu? — Nữ: Em muốn đi trung tâm thương mại mua quần áo.',
              },
            ],
          },
          {
            type: 'match-picture',
            continues: true,
            pictures: [
              P('🐶', 'con chó'),
              P('🎨', 'vẽ tranh'),
              P('🚕', 'taxi'),
              P('🍜', 'mì'),
              P('🧋', 'trà sữa'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你想喝点儿什么？' },
                  { s: 'F', zh: '给我一杯奶茶吧。' },
                ],
                answer: 4,
                vi: 'Nam: Em muốn uống gì? — Nữ: Cho em một cốc trà sữa nhé.',
              },
              {
                audio: [
                  { s: 'F', zh: '你的爱好是什么？' },
                  { s: 'M', zh: '我很喜欢画画儿。' },
                ],
                answer: 1,
                vi: 'Nữ: Sở thích của anh là gì? — Nam: Anh rất thích vẽ.',
              },
              {
                audio: [
                  { s: 'M', zh: '时间不早了，我们打车回去吧。' },
                  { s: 'F', zh: '好，我来叫车。' },
                ],
                answer: 2,
                vi: 'Nam: Muộn rồi, mình bắt taxi về đi. — Nữ: Được, để em gọi xe.',
              },
              {
                audio: [
                  { s: 'F', zh: '这是谁的狗？' },
                  { s: 'M', zh: '是我奶奶的，它叫小白。' },
                ],
                answer: 0,
                vi: 'Nữ: Đây là chó của ai? — Nam: Của bà nội anh, nó tên là Tiểu Bạch.',
              },
              {
                audio: [
                  { s: 'M', zh: '中午吃什么？' },
                  { s: 'F', zh: '我们去吃面条儿吧。' },
                ],
                answer: 3,
                vi: 'Nam: Trưa nay ăn gì? — Nữ: Mình đi ăn mì đi.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '你今天怎么这么高兴？' },
                  { s: 'M', zh: '我考试考得很好。' },
                  { s: 'N', zh: '问：男的为什么高兴？' },
                ],
                options: ['考试考得好', '要去旅游', '买了手机'],
                answer: 0,
                vi: 'Nữ: Hôm nay sao anh vui thế? — Nam: Anh thi được điểm cao. — Hỏi: Vì sao người nam vui?',
              },
              {
                audio: [
                  { s: 'M', zh: '你家离学校远吗？' },
                  { s: 'F', zh: '不远，走路十分钟就到了。' },
                  { s: 'N', zh: '问：女的家离学校怎么样？' },
                ],
                options: ['很远', '很近', '要坐车'],
                answer: 1,
                vi: 'Nam: Nhà em cách trường có xa không? — Nữ: Không xa, đi bộ mười phút là tới. — Hỏi: Nhà người nữ cách trường thế nào?',
              },
              {
                audio: [
                  { s: 'F', zh: '这件衣服多少钱？' },
                  { s: 'M', zh: '三百块，现在便宜，只要两百。' },
                  { s: 'N', zh: '问：这件衣服现在多少钱？' },
                ],
                options: ['五百块', '三百块', '两百块'],
                answer: 2,
                vi: 'Nữ: Bộ quần áo này bao nhiêu tiền? — Nam: Ba trăm tệ, bây giờ đang rẻ, chỉ còn hai trăm. — Hỏi: Bộ quần áo này bây giờ bao nhiêu tiền?',
                explain:
                  '"三百块" là giá cũ; "现在……只要两百" — bây giờ chỉ còn 200.',
              },
              {
                audio: [
                  { s: 'M', zh: '你看见我的手机了吗？' },
                  { s: 'F', zh: '在桌子上，电脑旁边。' },
                  { s: 'N', zh: '问：手机在哪儿？' },
                ],
                options: ['床上', '桌子上', '书包里'],
                answer: 1,
                vi: 'Nam: Em có thấy điện thoại của anh không? — Nữ: Ở trên bàn, bên cạnh máy tính. — Hỏi: Điện thoại ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '你每天几点起床？' },
                  { s: 'M', zh: '六点半，我七点要出门。' },
                  { s: 'N', zh: '问：男的几点起床？' },
                ],
                options: ['七点', '六点', '六点半'],
                answer: 2,
                vi: 'Nữ: Mỗi ngày anh dậy lúc mấy giờ? — Nam: Sáu rưỡi, bảy giờ anh phải ra khỏi nhà. — Hỏi: Người nam dậy lúc mấy giờ?',
              },
              {
                audio: [
                  { s: 'M', zh: '你哥哥是做什么工作的？' },
                  { s: 'F', zh: '他是医生，在医院工作。' },
                  { s: 'N', zh: '问：女的哥哥做什么工作？' },
                ],
                options: ['学生', '老师', '医生'],
                answer: 2,
                vi: 'Nam: Anh trai em làm nghề gì? — Nữ: Anh ấy là bác sĩ, làm ở bệnh viện. — Hỏi: Anh trai người nữ làm nghề gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '我们坐公交车去吧？' },
                  { s: 'M', zh: '公交车太慢了，打车去吧。' },
                  { s: 'N', zh: '问：他们可能怎么去？' },
                ],
                options: ['打车', '走路', '坐公交车'],
                answer: 0,
                vi: 'Nữ: Mình đi xe buýt nhé? — Nam: Xe buýt chậm quá, bắt taxi đi. — Hỏi: Họ có thể đi bằng gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '你喜欢喝红茶还是绿茶？' },
                  { s: 'F', zh: '都不喜欢，我喜欢喝咖啡。' },
                  { s: 'N', zh: '问：女的喜欢喝什么？' },
                ],
                options: ['红茶', '绿茶', '咖啡'],
                answer: 2,
                vi: 'Nam: Em thích uống hồng trà hay trà xanh? — Nữ: Đều không thích, em thích uống cà phê. — Hỏi: Người nữ thích uống gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你怎么了？' },
                  { s: 'M', zh: '昨天晚上没睡好，现在很累。' },
                  { s: 'N', zh: '问：男的怎么了？' },
                ],
                options: ['很累', '生病了', '很忙'],
                answer: 0,
                vi: 'Nữ: Anh sao thế? — Nam: Tối qua anh ngủ không ngon, giờ rất mệt. — Hỏi: Người nam bị làm sao?',
              },
              {
                audio: [
                  { s: 'M', zh: '你去过中国吗？' },
                  { s: 'F', zh: '去过两次，我很喜欢北京。' },
                  { s: 'N', zh: '问：女的去过几次中国？' },
                ],
                options: ['一次', '两次', '三次'],
                answer: 1,
                vi: 'Nam: Em đã từng đến Trung Quốc chưa? — Nữ: Đến hai lần rồi, em rất thích Bắc Kinh. — Hỏi: Người nữ đã đến Trung Quốc mấy lần?',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '明天是星期六，你有什么事吗？' },
                  { s: 'M', zh: '没有，怎么了？' },
                  { s: 'F', zh: '我们去看电影吧。' },
                  { s: 'M', zh: '好啊，几点？' },
                  { s: 'F', zh: '下午两点。' },
                  { s: 'N', zh: '问：他们明天下午要做什么？' },
                ],
                options: ['看电影', '去旅游', '打篮球'],
                answer: 0,
                vi: 'Nữ: Mai là thứ Bảy, anh có bận gì không? — Nam: Không, sao thế? — Nữ: Mình đi xem phim đi. — Nam: Được, mấy giờ? — Nữ: Hai giờ chiều. — Hỏi: Chiều mai họ định làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '你好，请问洗手间在哪儿？' },
                  { s: 'F', zh: '在二楼。' },
                  { s: 'M', zh: '从这儿怎么走？' },
                  { s: 'F', zh: '上楼往前走，就在右边。' },
                  { s: 'N', zh: '问：洗手间在哪儿？' },
                ],
                options: ['一楼左边', '二楼右边', '二楼左边'],
                answer: 1,
                vi: 'Nam: Xin chào, cho hỏi nhà vệ sinh ở đâu? — Nữ: Ở tầng hai. — Nam: Từ đây đi thế nào? — Nữ: Lên tầng rồi đi thẳng, ở ngay bên phải. — Hỏi: Nhà vệ sinh ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '你今天怎么没去上班？' },
                  { s: 'M', zh: '我生病了，头很疼。' },
                  { s: 'F', zh: '去医院看看吧。' },
                  { s: 'M', zh: '已经去过了，医生让我在家休息两天。' },
                  { s: 'N', zh: '问：男的为什么没去上班？' },
                ],
                options: ['他要考试', '他去旅游了', '他生病了'],
                answer: 2,
                vi: 'Nữ: Sao hôm nay anh không đi làm? — Nam: Anh bị ốm, đau đầu lắm. — Nữ: Đi bệnh viện khám đi. — Nam: Đi rồi, bác sĩ bảo anh ở nhà nghỉ hai ngày. — Hỏi: Vì sao người nam không đi làm?',
              },
              {
                audio: [
                  { s: 'M', zh: '星期天我想去买一个新电脑。' },
                  { s: 'F', zh: '你的电脑坏了吗？' },
                  { s: 'M', zh: '没坏，但是太慢了。' },
                  { s: 'F', zh: '我跟你一起去吧，我也想买手机。' },
                  { s: 'N', zh: '问：女的想买什么？' },
                ],
                options: ['电脑', '手机', '手表'],
                answer: 1,
                vi: 'Nam: Chủ nhật anh muốn đi mua máy tính mới. — Nữ: Máy tính của anh hỏng à? — Nam: Không hỏng, nhưng chậm quá. — Nữ: Em đi cùng anh nhé, em cũng muốn mua điện thoại. — Hỏi: Người nữ muốn mua gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你的汉语说得真好！' },
                  { s: 'M', zh: '谢谢，我在中国学了两年。' },
                  { s: 'F', zh: '你觉得学汉语有意思吗？' },
                  { s: 'M', zh: '很有意思，我每天都看中国电影。' },
                  { s: 'N', zh: '问：男的学了多长时间汉语？' },
                ],
                options: ['两年', '一年', '三年'],
                answer: 0,
                vi: 'Nữ: Anh nói tiếng Trung giỏi thật! — Nam: Cảm ơn, anh học ở Trung Quốc hai năm. — Nữ: Anh thấy học tiếng Trung có thú vị không? — Nam: Rất thú vị, ngày nào anh cũng xem phim Trung Quốc. — Hỏi: Người nam học tiếng Trung bao lâu?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'match-picture',
            pictures: [
              P('👀', 'đôi mắt'),
              P('🐟', 'con cá'),
              P('🏀', 'chơi bóng rổ'),
              P('🧳', 'đi du lịch'),
              P('☕', 'cà phê'),
              P('🎂', 'sinh nhật'),
            ],
            items: [
              {
                text: '我们明天去中国旅游，你准备好了吗？',
                answer: 3,
                vi: 'Ngày mai chúng ta đi du lịch Trung Quốc, bạn chuẩn bị xong chưa?',
              },
              {
                text: '她的眼睛很大，很漂亮。',
                answer: 0,
                vi: 'Mắt cô ấy rất to, rất đẹp.',
              },
              {
                text: '今天是我的生日，朋友们都来了。',
                answer: 5,
                vi: 'Hôm nay là sinh nhật tôi, các bạn đều đến cả.',
              },
              {
                text: '我不喝咖啡，喝了晚上睡不好。',
                answer: 4,
                vi: 'Tôi không uống cà phê, uống vào tối ngủ không ngon.',
              },
              {
                text: '下课了，我们去打篮球吧！',
                answer: 2,
                vi: 'Tan học rồi, chúng mình đi chơi bóng rổ đi!',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['准备', '离', '颜色', '一起', '已经', '最'],
            items: [
              {
                text: '我（ ）吃过饭了，你吃吧。',
                answer: 4,
                vi: 'Tôi đã ăn cơm rồi, bạn ăn đi.',
              },
              {
                text: '你喜欢什么（ ）的衣服？',
                answer: 2,
                vi: 'Bạn thích quần áo màu gì?',
              },
              {
                text: '我家（ ）公司很近。',
                answer: 1,
                vi: 'Nhà tôi cách công ty rất gần.',
              },
              {
                text: '明天要考试，你（ ）得怎么样了？',
                answer: 0,
                vi: 'Mai thi rồi, bạn chuẩn bị đến đâu rồi?',
              },
              {
                text: '他是我们班（ ）高的学生。',
                answer: 5,
                vi: 'Cậu ấy là học sinh cao nhất lớp chúng tôi.',
              },
            ],
          },
          {
            type: 'judge-text',
            items: [
              {
                text: '我们下午三点去机场，飞机是四点的，现在已经两点了。',
                statement: '飞机是四点的。',
                answer: true,
                vi: 'Chúng tôi 3 giờ chiều ra sân bay, máy bay lúc 4 giờ, bây giờ đã 2 giờ rồi. — ★ Máy bay lúc 4 giờ.',
              },
              {
                text: '我很喜欢运动，但是我不会游泳，我想让哥哥教我。',
                statement: '他会游泳。',
                answer: false,
                vi: 'Tôi rất thích thể thao, nhưng tôi không biết bơi, tôi muốn nhờ anh trai dạy. — ★ Anh ấy biết bơi.',
              },
              {
                text: '妹妹今年九岁，她比我小三岁。',
                statement: '我今年十一岁。',
                answer: false,
                vi: 'Em gái năm nay 9 tuổi, em kém tôi 3 tuổi. — ★ Năm nay tôi 11 tuổi.',
                explain: 'Em 9 tuổi, kém "tôi" 3 tuổi → "tôi" 12 tuổi.',
              },
              {
                text: '这个饭馆的菜很好吃，也不贵，所以每天都有很多人来吃饭。',
                statement: '这个饭馆的菜很便宜。',
                answer: true,
                vi: 'Món ăn ở quán này rất ngon, cũng không đắt, nên ngày nào cũng có rất nhiều người đến ăn. — ★ Món ăn ở quán này rẻ.',
              },
              {
                text: '外面下雪了，非常冷，你出门的时候多穿点儿衣服。',
                statement: '今天天气很冷。',
                answer: true,
                vi: 'Bên ngoài tuyết rơi rồi, rất lạnh, lúc ra ngoài bạn mặc thêm quần áo nhé. — ★ Hôm nay trời rất lạnh.',
              },
            ],
          },
          {
            type: 'match-text',
            options: [
              '好啊，你想吃什么？',
              '在三楼左边。',
              '星期六晚上。',
              '我坐地铁来的。',
              '她是我的汉语老师。',
              '不好意思，我忘了。',
            ],
            items: [
              { text: '你怎么来的？', answer: 3, vi: 'Bạn đến bằng gì?' },
              {
                text: '我让你给我买的本子呢？',
                answer: 5,
                vi: 'Cuốn vở anh nhờ em mua cho anh đâu rồi?',
              },
              {
                text: '请问，你们的教室在几楼？',
                answer: 1,
                vi: 'Cho hỏi, lớp học của các bạn ở tầng mấy?',
              },
              {
                text: '那位女士是谁？',
                answer: 4,
                vi: 'Người phụ nữ kia là ai?',
              },
              {
                text: '我们一起去吃饭吧！',
                answer: 0,
                vi: 'Chúng mình cùng đi ăn cơm nhé!',
              },
            ],
          },
          {
            type: 'match-text',
            continues: true,
            options: [
              '我想去游泳。',
              '还没有，我在等他。',
              '很好看，在哪儿买的？',
              '我也不知道，你问问老师吧。',
              '对，我是去年来的。',
            ],
            items: [
              {
                text: '你看我的新手表怎么样？',
                answer: 2,
                vi: 'Bạn xem đồng hồ mới của tôi thế nào?',
              },
              {
                text: '你是去年来北京的吗？',
                answer: 4,
                vi: 'Bạn đến Bắc Kinh từ năm ngoái à?',
              },
              {
                text: '你哥哥回来了吗？',
                answer: 1,
                vi: 'Anh trai bạn về chưa?',
              },
              {
                text: '这个字是什么意思？',
                answer: 3,
                vi: 'Chữ này nghĩa là gì?',
              },
              {
                text: '天气这么热，下午你想做什么？',
                answer: 0,
                vi: 'Trời nóng thế này, chiều nay bạn muốn làm gì?',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'hsk2-de-2',
    level: 2,
    title: 'HSK 2 — Đề 2',
    durationMin: 50,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'judge',
            items: [
              {
                audio: [{ s: 'M', zh: '我女儿很喜欢跳舞。' }],
                picture: P('🏊', 'bơi lội'),
                answer: false,
                vi: 'Con gái tôi rất thích nhảy múa.',
              },
              {
                audio: [{ s: 'F', zh: '今天是晴天，天气很好。' }],
                picture: P('☀️', 'trời nắng đẹp'),
                answer: true,
                vi: 'Hôm nay trời quang, thời tiết rất đẹp.',
              },
              {
                audio: [{ s: 'M', zh: '我们坐公交车去公司。' }],
                picture: P('🚌', 'xe buýt'),
                answer: true,
                vi: 'Chúng tôi đi xe buýt đến công ty.',
              },
              {
                audio: [{ s: 'F', zh: '爷爷在家里睡觉。' }],
                picture: P('🚶', 'đi bộ'),
                answer: false,
                vi: 'Ông nội đang ngủ ở nhà.',
              },
              {
                audio: [{ s: 'M', zh: '他在洗衣服。' }],
                picture: P('🧺', 'giặt quần áo'),
                answer: true,
                vi: 'Anh ấy đang giặt quần áo.',
              },
              {
                audio: [{ s: 'F', zh: '这些鸡蛋是我早上买的。' }],
                picture: P('🍞', 'bánh mì'),
                answer: false,
                vi: 'Chỗ trứng gà này tôi mua sáng nay.',
              },
              {
                audio: [{ s: 'M', zh: '她笑得很高兴。' }],
                picture: P('😄', 'cười vui vẻ'),
                answer: true,
                vi: 'Cô ấy cười rất vui.',
              },
              {
                audio: [{ s: 'F', zh: '我丈夫每天开车上班。' }],
                picture: P('🚆', 'tàu hoả'),
                answer: false,
                vi: 'Chồng tôi ngày nào cũng lái xe đi làm.',
              },
              {
                audio: [{ s: 'M', zh: '小狗在床上休息。' }],
                picture: P('🐱', 'con mèo'),
                answer: false,
                vi: 'Chú chó con đang nghỉ trên giường.',
              },
              {
                audio: [{ s: 'F', zh: '我给妈妈送了一些花。' }],
                picture: P('💐', 'bó hoa'),
                answer: true,
                vi: 'Tôi tặng mẹ một ít hoa.',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🎬', 'xem phim'),
              P('🧑‍🏫', 'thầy giáo giảng bài'),
              P('🏥', 'bệnh viện'),
              P('✈️', 'máy bay'),
              P('🍽️', 'ăn ở nhà hàng'),
              P('🎤', 'hát'),
            ],
            items: [
              {
                audio: [
                  { s: 'F', zh: '你爸爸在家吗？' },
                  { s: 'M', zh: '不在，他去医院看病了。' },
                ],
                answer: 2,
                vi: 'Nữ: Bố anh có nhà không? — Nam: Không, bố đi bệnh viện khám bệnh rồi.',
              },
              {
                audio: [
                  { s: 'M', zh: '晚上我们去看电影，好吗？' },
                  { s: 'F', zh: '好啊，看几点的？' },
                ],
                answer: 0,
                vi: 'Nam: Tối nay mình đi xem phim nhé? — Nữ: Được đó, xem suất mấy giờ?',
              },
              {
                audio: [
                  { s: 'F', zh: '你的飞机几点到？' },
                  { s: 'M', zh: '晚上八点到北京。' },
                ],
                answer: 3,
                vi: 'Nữ: Máy bay của anh mấy giờ tới? — Nam: Tám giờ tối tới Bắc Kinh.',
              },
              {
                audio: [
                  { s: 'M', zh: '这个饭馆的鱼很好吃。' },
                  { s: 'F', zh: '是吗？那我们多吃点儿。' },
                ],
                answer: 4,
                vi: 'Nam: Cá ở quán này rất ngon. — Nữ: Thật à? Vậy mình ăn nhiều chút.',
              },
              {
                audio: [
                  { s: 'F', zh: '王老师在教室吗？' },
                  { s: 'M', zh: '在，他正在给学生上课。' },
                ],
                answer: 1,
                vi: 'Nữ: Thầy Vương có ở lớp không? — Nam: Có, thầy đang dạy học sinh.',
              },
            ],
          },
          {
            type: 'match-picture',
            continues: true,
            pictures: [
              P('💻', 'máy tính'),
              P('🎒', 'cặp sách'),
              P('🚇', 'tàu điện ngầm'),
              P('⌚', 'đồng hồ đeo tay'),
              P('🏃', 'chạy bộ'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你每天几点跑步？' },
                  { s: 'F', zh: '早上六点，跑半个小时。' },
                ],
                answer: 4,
                vi: 'Nam: Mỗi ngày em chạy bộ lúc mấy giờ? — Nữ: Sáu giờ sáng, chạy nửa tiếng.',
              },
              {
                audio: [
                  { s: 'F', zh: '我的书包呢？' },
                  { s: 'M', zh: '在椅子上，你看。' },
                ],
                answer: 1,
                vi: 'Nữ: Cặp sách của em đâu? — Nam: Ở trên ghế kìa, em xem.',
              },
              {
                audio: [
                  { s: 'M', zh: '现在几点了？' },
                  { s: 'F', zh: '我看看手表，十点二十。' },
                ],
                answer: 3,
                vi: 'Nam: Bây giờ mấy giờ rồi? — Nữ: Để em xem đồng hồ, mười giờ hai mươi.',
              },
              {
                audio: [
                  { s: 'F', zh: '你的电脑怎么了？' },
                  { s: 'M', zh: '坏了，不能上网了。' },
                ],
                answer: 0,
                vi: 'Nữ: Máy tính của anh làm sao vậy? — Nam: Hỏng rồi, không lên mạng được nữa.',
              },
              {
                audio: [
                  { s: 'M', zh: '去商场怎么走？' },
                  { s: 'F', zh: '坐地铁，两站就到。' },
                ],
                answer: 2,
                vi: 'Nam: Đi trung tâm thương mại thế nào? — Nữ: Đi tàu điện ngầm, hai ga là tới.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'M', zh: '你明天几点去机场？' },
                  { s: 'F', zh: '上午十点，飞机是十二点的。' },
                  { s: 'N', zh: '问：飞机几点？' },
                ],
                options: ['十点', '十二点', '十一点'],
                answer: 1,
                vi: 'Nam: Mai mấy giờ em ra sân bay? — Nữ: Mười giờ sáng, máy bay lúc mười hai giờ. — Hỏi: Máy bay lúc mấy giờ?',
              },
              {
                audio: [
                  { s: 'F', zh: '这个题你会做吗？' },
                  { s: 'M', zh: '会，我教你吧。' },
                  { s: 'N', zh: '问：男的要做什么？' },
                ],
                options: ['教女的做题', '考试', '看书'],
                answer: 0,
                vi: 'Nữ: Câu này anh có biết làm không? — Nam: Biết, để anh chỉ em. — Hỏi: Người nam định làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你妻子是哪国人？' },
                  { s: 'M', zh: '她是越南人，现在在北京工作。' },
                  { s: 'N', zh: '问：男的妻子是哪国人？' },
                ],
                options: ['越南人', '中国人', '日本人'],
                answer: 0,
                vi: 'Nữ: Vợ anh là người nước nào? — Nam: Cô ấy là người Việt Nam, giờ đang làm việc ở Bắc Kinh. — Hỏi: Vợ người nam là người nước nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你要红色的还是白色的？' },
                  { s: 'F', zh: '都不要，我要黑色的。' },
                  { s: 'N', zh: '问：女的要什么颜色的？' },
                ],
                options: ['红色', '白色', '黑色'],
                answer: 2,
                vi: 'Nam: Em lấy cái màu đỏ hay màu trắng? — Nữ: Đều không lấy, em lấy cái màu đen. — Hỏi: Người nữ lấy màu gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你怎么来晚了？' },
                  { s: 'M', zh: '路上车太多了。' },
                  { s: 'N', zh: '问：男的为什么来晚了？' },
                ],
                options: ['起床晚了', '路上车多', '生病了'],
                answer: 1,
                vi: 'Nữ: Sao anh đến muộn? — Nam: Trên đường xe nhiều quá. — Hỏi: Vì sao người nam đến muộn?',
              },
              {
                audio: [
                  { s: 'M', zh: '喂，你在哪儿呢？' },
                  { s: 'F', zh: '我在药店买药，一会儿就回去。' },
                  { s: 'N', zh: '问：女的在哪儿？' },
                ],
                options: ['医院', '商店', '药店'],
                answer: 2,
                vi: 'Nam: A lô, em đang ở đâu đấy? — Nữ: Em đang mua thuốc ở hiệu thuốc, lát nữa về ngay. — Hỏi: Người nữ đang ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '你学汉语多长时间了？' },
                  { s: 'M', zh: '快两年了。' },
                  { s: 'N', zh: '问：男的学汉语多长时间了？' },
                ],
                options: ['快两年了', '一年', '三年多'],
                answer: 0,
                vi: 'Nữ: Anh học tiếng Trung bao lâu rồi? — Nam: Sắp được hai năm rồi. — Hỏi: Người nam học tiếng Trung bao lâu rồi?',
              },
              {
                audio: [
                  { s: 'M', zh: '明天的考试你准备得怎么样了？' },
                  { s: 'F', zh: '还没准备好，今天晚上不睡觉了。' },
                  { s: 'N', zh: '问：女的今天晚上要做什么？' },
                ],
                options: ['准备考试', '睡觉', '看电影'],
                answer: 0,
                vi: 'Nam: Bài thi ngày mai em chuẩn bị đến đâu rồi? — Nữ: Vẫn chưa xong, tối nay em không ngủ nữa. — Hỏi: Tối nay người nữ sẽ làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '我们几点出门？' },
                  { s: 'M', zh: '七点吧，电影七点半开始。' },
                  { s: 'N', zh: '问：电影几点开始？' },
                ],
                options: ['七点', '八点', '七点半'],
                answer: 2,
                vi: 'Nữ: Mấy giờ mình ra khỏi nhà? — Nam: Bảy giờ nhé, phim bắt đầu lúc bảy rưỡi. — Hỏi: Phim bắt đầu lúc mấy giờ?',
              },
              {
                audio: [
                  { s: 'M', zh: '这件衣服你穿着很漂亮。' },
                  { s: 'F', zh: '真的吗？但是有点儿贵。' },
                  { s: 'N', zh: '问：女的觉得衣服怎么样？' },
                ],
                options: ['不漂亮', '有点儿贵', '很便宜'],
                answer: 1,
                vi: 'Nam: Em mặc bộ này đẹp lắm. — Nữ: Thật không? Nhưng hơi đắt. — Hỏi: Người nữ thấy bộ quần áo thế nào?',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'M', zh: '你好，我想买去上海的火车票。' },
                  { s: 'F', zh: '几点的？' },
                  { s: 'M', zh: '明天上午的。' },
                  { s: 'F', zh: '上午的票没有了，下午三点的可以吗？' },
                  { s: 'M', zh: '可以。' },
                  { s: 'N', zh: '问：男的要买几点的票？' },
                ],
                options: ['上午', '下午三点', '晚上'],
                answer: 1,
                vi: 'Nam: Chào chị, tôi muốn mua vé tàu đi Thượng Hải. — Nữ: Chuyến mấy giờ? — Nam: Sáng mai. — Nữ: Vé buổi sáng hết rồi, chuyến 3 giờ chiều được không? — Nam: Được. — Hỏi: Người nam sẽ mua vé chuyến mấy giờ?',
                explain:
                  'Anh ấy muốn đi buổi sáng nhưng hết vé, cuối cùng đồng ý chuyến 3 giờ chiều.',
              },
              {
                audio: [
                  { s: 'F', zh: '你看，外面下雨了。' },
                  { s: 'M', zh: '是啊，我们别去跑步了。' },
                  { s: 'F', zh: '那我们在家做什么？' },
                  { s: 'M', zh: '一起看电视吧。' },
                  { s: 'N', zh: '问：他们可能要做什么？' },
                ],
                options: ['看电视', '去跑步', '去商场'],
                answer: 0,
                vi: 'Nữ: Anh xem, bên ngoài mưa rồi. — Nam: Ừ, mình đừng đi chạy bộ nữa. — Nữ: Vậy ở nhà mình làm gì? — Nam: Cùng xem TV đi. — Hỏi: Họ có thể sẽ làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '你认识那个女孩儿吗？' },
                  { s: 'F', zh: '认识，她是我同学。' },
                  { s: 'M', zh: '她叫什么名字？' },
                  { s: 'F', zh: '她姓张，叫张小红。' },
                  { s: 'N', zh: '问：那个女孩儿是女的什么人？' },
                ],
                options: ['姐姐', '同学', '老师'],
                answer: 1,
                vi: 'Nam: Em có quen cô gái kia không? — Nữ: Có, bạn ấy là bạn học của em. — Nam: Bạn ấy tên gì? — Nữ: Bạn ấy họ Trương, tên là Trương Tiểu Hồng. — Hỏi: Cô gái kia là gì của người nữ?',
              },
              {
                audio: [
                  { s: 'F', zh: '你身体好点儿了吗？' },
                  { s: 'M', zh: '好多了，谢谢你。' },
                  { s: 'F', zh: '明天能去上班吗？' },
                  { s: 'M', zh: '医生说还要再休息一天。' },
                  { s: 'N', zh: '问：男的明天做什么？' },
                ],
                options: ['上班', '去医院', '在家休息'],
                answer: 2,
                vi: 'Nữ: Anh khoẻ hơn chút nào chưa? — Nam: Khoẻ hơn nhiều rồi, cảm ơn em. — Nữ: Mai đi làm được không? — Nam: Bác sĩ bảo phải nghỉ thêm một ngày nữa. — Hỏi: Ngày mai người nam làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '你喜欢吃鱼吗？' },
                  { s: 'F', zh: '喜欢，但是我最喜欢吃肉。' },
                  { s: 'M', zh: '那今天晚上我们去吃肉吧。' },
                  { s: 'F', zh: '好啊。' },
                  { s: 'N', zh: '问：女的最喜欢吃什么？' },
                ],
                options: ['肉', '鱼', '米饭'],
                answer: 0,
                vi: 'Nam: Em có thích ăn cá không? — Nữ: Thích, nhưng em thích ăn thịt nhất. — Nam: Vậy tối nay mình đi ăn thịt nhé. — Nữ: Được đó. — Hỏi: Người nữ thích ăn gì nhất?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'match-picture',
            pictures: [
              P('📖', 'đọc sách'),
              P('🍵', 'trà'),
              P('🚶', 'đi bộ'),
              P('💃', 'nhảy múa'),
              P('🎁', 'tặng quà'),
              P('🌧️', 'trời mưa'),
            ],
            items: [
              {
                text: '我家离公司不远，我每天走路去上班。',
                answer: 2,
                vi: 'Nhà tôi cách công ty không xa, ngày nào tôi cũng đi bộ đi làm.',
              },
              {
                text: '今天下雨了，我们不出去了。',
                answer: 5,
                vi: 'Hôm nay trời mưa, chúng ta không ra ngoài nữa.',
              },
              {
                text: '她跳舞跳得非常好，大家都很喜欢看。',
                answer: 3,
                vi: 'Cô ấy nhảy rất giỏi, mọi người đều rất thích xem.',
              },
              {
                text: '这是我送你的，生日快乐！',
                answer: 4,
                vi: 'Đây là quà mình tặng bạn, chúc mừng sinh nhật!',
              },
              {
                text: '你喝红茶还是绿茶？',
                answer: 1,
                vi: 'Bạn uống hồng trà hay trà xanh?',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['经常', '告诉', '为什么', '完', '游泳', '介绍'],
            items: [
              {
                text: '我来（ ）一下，这是我的朋友小王。',
                answer: 5,
                vi: 'Để tôi giới thiệu một chút, đây là bạn tôi, Tiểu Vương.',
              },
              {
                text: '你（ ）不去上课？',
                answer: 2,
                vi: 'Vì sao bạn không đi học?',
              },
              {
                text: '我（ ）去那个饭馆吃饭，那儿的菜很好吃。',
                answer: 0,
                vi: 'Tôi thường đến quán đó ăn cơm, món ăn ở đó rất ngon.',
              },
              {
                text: '请你（ ）他，明天上午九点考试。',
                answer: 1,
                vi: 'Bạn hãy nói với cậu ấy, 9 giờ sáng mai thi.',
              },
              {
                text: '我看（ ）这本书了，很有意思。',
                answer: 3,
                vi: 'Tôi đọc xong cuốn sách này rồi, rất hay.',
              },
            ],
          },
          {
            type: 'judge-text',
            items: [
              {
                text: '我家离学校很远，坐公交车要一个小时。',
                statement: '他家离学校很近。',
                answer: false,
                vi: 'Nhà tôi cách trường rất xa, đi xe buýt mất một tiếng. — ★ Nhà anh ấy cách trường rất gần.',
              },
              {
                text: '今天是星期五，明天和后天我们不上课。',
                statement: '星期六不上课。',
                answer: true,
                vi: 'Hôm nay là thứ Sáu, ngày mai và ngày kia chúng tôi không phải đi học. — ★ Thứ Bảy không phải đi học.',
                explain: 'Hôm nay thứ Sáu → "ngày mai" là thứ Bảy.',
              },
              {
                text: '小王很喜欢运动，他最喜欢的运动是踢足球，每个星期都踢三次。',
                statement: '小王不喜欢运动。',
                answer: false,
                vi: 'Tiểu Vương rất thích thể thao, môn cậu ấy thích nhất là bóng đá, tuần nào cũng đá ba lần. — ★ Tiểu Vương không thích thể thao.',
              },
              {
                text: '这家商店的东西很便宜，所以买东西的人很多。',
                statement: '这家商店人很多。',
                answer: true,
                vi: 'Đồ ở cửa hàng này rất rẻ, nên có rất nhiều người đến mua. — ★ Cửa hàng này rất đông người.',
              },
              {
                text: '我昨天给你打电话，你为什么不回电话？',
                statement: '我昨天给他打过电话。',
                answer: true,
                vi: 'Hôm qua tôi gọi cho bạn, sao bạn không gọi lại? — ★ Hôm qua tôi đã gọi điện cho anh ấy.',
              },
            ],
          },
          {
            type: 'match-text',
            options: [
              '不客气，你下次再来！',
              '是我爸爸的，他今天不开车。',
              '我们坐几路公交车？',
              '因为我昨天晚上睡得太晚了。',
              '好的，我现在就去。',
              '对不起，我不知道。',
            ],
            items: [
              {
                text: '谢谢你的菜，太好吃了！',
                answer: 0,
                vi: 'Cảm ơn bữa cơm của bạn, ngon quá!',
              },
              {
                text: '你今天怎么这么累？',
                answer: 3,
                vi: 'Hôm nay sao bạn mệt thế?',
              },
              { text: '这是谁的车？', answer: 1, vi: 'Đây là xe của ai?' },
              {
                text: '请问，去北京大学怎么走？',
                answer: 5,
                vi: 'Cho hỏi, đến Đại học Bắc Kinh đi thế nào?',
              },
              {
                text: '你去商店给我买点儿水果吧。',
                answer: 4,
                vi: 'Bạn ra cửa hàng mua giúp tôi ít hoa quả nhé.',
              },
            ],
          },
          {
            type: 'match-text',
            continues: true,
            options: [
              '我也是，我们一起去吧。',
              '他在楼上，你上去找他吧。',
              '不贵，一个两块钱。',
              '没问题，几点？',
              '是我自己画的。',
            ],
            items: [
              {
                text: '这些苹果多少钱？',
                answer: 2,
                vi: 'Chỗ táo này bao nhiêu tiền?',
              },
              {
                text: '这个画儿真漂亮，是谁画的？',
                answer: 4,
                vi: 'Bức tranh này đẹp thật, ai vẽ vậy?',
              },
              {
                text: '你哥哥在家吗？',
                answer: 1,
                vi: 'Anh trai bạn có nhà không?',
              },
              {
                text: '我想去看电影。',
                answer: 0,
                vi: 'Tôi muốn đi xem phim.',
              },
              {
                text: '明天你能帮我一下吗？',
                answer: 3,
                vi: 'Ngày mai bạn giúp tôi một chút được không?',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'hsk2-de-3',
    level: 2,
    title: 'HSK 2 — Đề 3',
    durationMin: 50,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'judge',
            items: [
              {
                audio: [{ s: 'F', zh: '我每天晚上十一点睡觉。' }],
                picture: P('😴', 'đi ngủ'),
                answer: true,
                vi: 'Tối nào tôi cũng đi ngủ lúc 11 giờ.',
              },
              {
                audio: [{ s: 'M', zh: '他在机场等飞机。' }],
                picture: P('🚉', 'ga tàu'),
                answer: false,
                vi: 'Anh ấy đang chờ máy bay ở sân bay.',
              },
              {
                audio: [{ s: 'F', zh: '这条鱼很大。' }],
                picture: P('🐦', 'con chim'),
                answer: false,
                vi: 'Con cá này rất to.',
              },
              {
                audio: [{ s: 'M', zh: '我们一起唱歌吧。' }],
                picture: P('🎤', 'hát'),
                answer: true,
                vi: 'Chúng mình cùng hát đi.',
              },
              {
                audio: [{ s: 'F', zh: '我的手表是爸爸送的。' }],
                picture: P('⌚', 'đồng hồ đeo tay'),
                answer: true,
                vi: 'Đồng hồ của tôi là bố tặng.',
              },
              {
                audio: [{ s: 'M', zh: '外面在下雪，很冷。' }],
                picture: P('☀️', 'trời nắng'),
                answer: false,
                vi: 'Bên ngoài đang có tuyết, rất lạnh.',
              },
              {
                audio: [{ s: 'F', zh: '我喜欢喝牛奶。' }],
                picture: P('🥛', 'sữa'),
                answer: true,
                vi: 'Tôi thích uống sữa.',
              },
              {
                audio: [{ s: 'M', zh: '他们在踢足球。' }],
                picture: P('🏀', 'bóng rổ'),
                answer: false,
                vi: 'Họ đang đá bóng.',
              },
              {
                audio: [{ s: 'F', zh: '这是我的新电脑。' }],
                picture: P('💻', 'máy tính'),
                answer: true,
                vi: 'Đây là máy tính mới của tôi.',
              },
              {
                audio: [{ s: 'M', zh: '妈妈在做饭。' }],
                picture: P('🧹', 'quét nhà'),
                answer: false,
                vi: 'Mẹ đang nấu cơm.',
              },
            ],
          },
          {
            type: 'match-picture',
            pictures: [
              P('🏊', 'đi bơi'),
              P('📱', 'gọi điện thoại'),
              P('🍜', 'mì'),
              P('🚕', 'taxi'),
              P('🎂', 'sinh nhật'),
              P('🏥', 'bệnh viện'),
            ],
            items: [
              {
                audio: [
                  { s: 'M', zh: '你给谁打电话呢？' },
                  { s: 'F', zh: '给我妈妈，她明天来北京。' },
                ],
                answer: 1,
                vi: 'Nam: Em đang gọi điện cho ai thế? — Nữ: Cho mẹ em, mai mẹ đến Bắc Kinh.',
              },
              {
                audio: [
                  { s: 'F', zh: '你哪儿不舒服？' },
                  { s: 'M', zh: '我头疼，想去医院看看。' },
                ],
                answer: 5,
                vi: 'Nữ: Anh khó chịu ở đâu? — Nam: Anh đau đầu, muốn đến bệnh viện khám.',
              },
              {
                audio: [
                  { s: 'M', zh: '晚上吃什么？' },
                  { s: 'F', zh: '吃面条儿吧，做起来很快。' },
                ],
                answer: 2,
                vi: 'Nam: Tối nay ăn gì? — Nữ: Ăn mì đi, nấu nhanh lắm.',
              },
              {
                audio: [
                  { s: 'F', zh: '太晚了，没有公交车了。' },
                  { s: 'M', zh: '没关系，我们打车回去。' },
                ],
                answer: 3,
                vi: 'Nữ: Muộn quá rồi, hết xe buýt rồi. — Nam: Không sao, mình bắt taxi về.',
              },
              {
                audio: [
                  { s: 'M', zh: '星期天我们去游泳吧。' },
                  { s: 'F', zh: '好啊，我也很想去。' },
                ],
                answer: 0,
                vi: 'Nam: Chủ nhật mình đi bơi nhé. — Nữ: Được đó, em cũng rất muốn đi.',
              },
            ],
          },
          {
            type: 'match-picture',
            continues: true,
            pictures: [
              P('🐟', 'con cá'),
              P('👖', 'quần dài'),
              P('🎨', 'vẽ tranh'),
              P('🏫', 'trường học'),
              P('☕', 'cà phê'),
            ],
            items: [
              {
                audio: [
                  { s: 'F', zh: '这条裤子怎么样？' },
                  { s: 'M', zh: '颜色不错，就是有点儿长。' },
                ],
                answer: 1,
                vi: 'Nữ: Chiếc quần này thế nào? — Nam: Màu được đấy, chỉ là hơi dài.',
              },
              {
                audio: [
                  { s: 'M', zh: '你喝咖啡吗？' },
                  { s: 'F', zh: '不喝了，喝了睡不着。' },
                ],
                answer: 4,
                vi: 'Nam: Em uống cà phê không? — Nữ: Thôi ạ, uống vào em không ngủ được.',
              },
              {
                audio: [
                  { s: 'F', zh: '你买鱼了吗？' },
                  { s: 'M', zh: '买了两条，晚上做给你吃。' },
                ],
                answer: 0,
                vi: 'Nữ: Anh mua cá chưa? — Nam: Mua hai con rồi, tối anh nấu cho em ăn.',
              },
              {
                audio: [
                  { s: 'M', zh: '你女儿在哪儿上学？' },
                  { s: 'F', zh: '就在我们家旁边的小学。' },
                ],
                answer: 3,
                vi: 'Nam: Con gái chị học ở đâu? — Nữ: Ở ngay trường tiểu học cạnh nhà chúng tôi.',
              },
              {
                audio: [
                  { s: 'F', zh: '你在画什么？' },
                  { s: 'M', zh: '我在画一只鸟。' },
                ],
                answer: 2,
                vi: 'Nữ: Anh đang vẽ gì thế? — Nam: Anh đang vẽ một con chim.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '你几点下班？' },
                  { s: 'M', zh: '五点半，你等我一会儿。' },
                  { s: 'N', zh: '问：男的几点下班？' },
                ],
                options: ['五点', '五点半', '六点'],
                answer: 1,
                vi: 'Nữ: Mấy giờ anh tan làm? — Nam: Năm rưỡi, em đợi anh một lát nhé. — Hỏi: Người nam tan làm lúc mấy giờ?',
              },
              {
                audio: [
                  { s: 'M', zh: '你的汉语老师是哪国人？' },
                  { s: 'F', zh: '是中国人，他姓李。' },
                  { s: 'N', zh: '问：老师姓什么？' },
                ],
                options: ['李', '王', '张'],
                answer: 0,
                vi: 'Nam: Giáo viên tiếng Trung của em là người nước nào? — Nữ: Là người Trung Quốc, thầy họ Lý. — Hỏi: Thầy giáo họ gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '这个房间怎么样？' },
                  { s: 'M', zh: '很大，也很舒服，就是离车站有点儿远。' },
                  { s: 'N', zh: '问：这个房间怎么样？' },
                ],
                options: ['离车站远', '很小', '不舒服'],
                answer: 0,
                vi: 'Nữ: Căn phòng này thế nào? — Nam: Rất rộng, cũng rất thoải mái, chỉ là hơi xa ga tàu. — Hỏi: Căn phòng này thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '你想吃米饭还是面条儿？' },
                  { s: 'F', zh: '吃米饭吧，我不想吃面条儿。' },
                  { s: 'N', zh: '问：女的想吃什么？' },
                ],
                options: ['面条儿', '饺子', '米饭'],
                answer: 2,
                vi: 'Nam: Em muốn ăn cơm hay ăn mì? — Nữ: Ăn cơm đi, em không muốn ăn mì. — Hỏi: Người nữ muốn ăn gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你们班有多少学生？' },
                  { s: 'M', zh: '二十五个，男生十二个。' },
                  { s: 'N', zh: '问：他们班有多少个女生？' },
                ],
                options: ['十二个', '十三个', '二十五个'],
                answer: 1,
                vi: 'Nữ: Lớp anh có bao nhiêu học sinh? — Nam: Hai mươi lăm, nam mười hai bạn. — Hỏi: Lớp họ có bao nhiêu bạn nữ?',
                explain: '25 học sinh, 12 bạn nam → 25 − 12 = 13 bạn nữ.',
              },
              {
                audio: [
                  { s: 'M', zh: '你昨天怎么没来上课？' },
                  { s: 'F', zh: '我生病了，在家休息了一天。' },
                  { s: 'N', zh: '问：女的昨天为什么没来上课？' },
                ],
                options: ['生病了', '去旅游了', '工作忙'],
                answer: 0,
                vi: 'Nam: Hôm qua sao em không đến lớp? — Nữ: Em bị ốm, ở nhà nghỉ một ngày. — Hỏi: Hôm qua vì sao người nữ không đến lớp?',
              },
              {
                audio: [
                  { s: 'F', zh: '我们坐地铁还是坐公交车？' },
                  { s: 'M', zh: '坐地铁吧，地铁比公交车快。' },
                  { s: 'N', zh: '问：男的觉得地铁怎么样？' },
                ],
                options: ['比公交车慢', '人很多', '比公交车快'],
                answer: 2,
                vi: 'Nữ: Mình đi tàu điện ngầm hay xe buýt? — Nam: Đi tàu điện ngầm đi, tàu điện ngầm nhanh hơn xe buýt. — Hỏi: Người nam thấy tàu điện ngầm thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '明天是我妻子的生日，我想给她买个手表。' },
                  { s: 'F', zh: '好啊，我跟你一起去看看。' },
                  { s: 'N', zh: '问：男的要给妻子买什么？' },
                ],
                options: ['衣服', '手机', '手表'],
                answer: 2,
                vi: 'Nam: Mai là sinh nhật vợ anh, anh muốn mua cho cô ấy một chiếc đồng hồ. — Nữ: Hay đấy, em đi xem cùng anh. — Hỏi: Người nam muốn mua gì cho vợ?',
              },
              {
                audio: [
                  { s: 'F', zh: '你会开车吗？' },
                  { s: 'M', zh: '会，但是我不经常开。' },
                  { s: 'N', zh: '问：男的会开车吗？' },
                ],
                options: ['会', '不会', '在学'],
                answer: 0,
                vi: 'Nữ: Anh có biết lái xe không? — Nam: Biết, nhưng anh không hay lái. — Hỏi: Người nam có biết lái xe không?',
              },
              {
                audio: [
                  { s: 'M', zh: '这些水果是你买的吗？' },
                  { s: 'F', zh: '不是，是我朋友送给我的。' },
                  { s: 'N', zh: '问：这些水果是从哪儿来的？' },
                ],
                options: ['女的买的', '朋友送的', '男的买的'],
                answer: 1,
                vi: 'Nam: Chỗ hoa quả này em mua à? — Nữ: Không, bạn em tặng em đấy. — Hỏi: Chỗ hoa quả này từ đâu mà có?',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '你好，请问这儿有咖啡吗？' },
                  { s: 'M', zh: '有，你要热的还是冷的？' },
                  { s: 'F', zh: '热的，一杯多少钱？' },
                  { s: 'M', zh: '二十块。' },
                  { s: 'N', zh: '问：女的要什么？' },
                ],
                options: ['冷咖啡', '热咖啡', '热茶'],
                answer: 1,
                vi: 'Nữ: Chào anh, cho hỏi ở đây có cà phê không? — Nam: Có, chị lấy nóng hay lạnh? — Nữ: Nóng, bao nhiêu tiền một cốc? — Nam: Hai mươi tệ. — Hỏi: Người nữ muốn gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '你在看什么书？' },
                  { s: 'F', zh: '一本汉语书，是我们老师写的。' },
                  { s: 'M', zh: '有意思吗？' },
                  { s: 'F', zh: '很有意思，看完了我给你。' },
                  { s: 'N', zh: '问：女的看完了这本书要做什么？' },
                ],
                options: ['给男的', '给老师', '再看一次'],
                answer: 0,
                vi: 'Nam: Em đang đọc sách gì thế? — Nữ: Một cuốn sách tiếng Trung, do thầy giáo bọn em viết. — Nam: Hay không? — Nữ: Rất hay, đọc xong em đưa anh. — Hỏi: Đọc xong cuốn sách, người nữ sẽ làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '明天我们去哪儿玩儿？' },
                  { s: 'M', zh: '去商场看看吧。' },
                  { s: 'F', zh: '商场人太多了，我们去看电影吧。' },
                  { s: 'M', zh: '好，听你的。' },
                  { s: 'N', zh: '问：他们明天可能去做什么？' },
                ],
                options: ['去商场', '看电影', '在家休息'],
                answer: 1,
                vi: 'Nữ: Mai mình đi đâu chơi? — Nam: Đi trung tâm thương mại xem chút đi. — Nữ: Trung tâm thương mại đông người quá, mình đi xem phim đi. — Nam: Được, nghe em. — Hỏi: Ngày mai họ có thể đi làm gì?',
                explain:
                  'Ý đầu là đi trung tâm thương mại, nhưng cuối cùng người nam đồng ý đi xem phim ("听你的" — nghe em).',
              },
              {
                audio: [
                  { s: 'M', zh: '你的身体怎么这么好？' },
                  { s: 'F', zh: '我每天都运动。' },
                  { s: 'M', zh: '你做什么运动？' },
                  { s: 'F', zh: '早上跑步，晚上跳舞。' },
                  { s: 'N', zh: '问：女的晚上做什么运动？' },
                ],
                options: ['跳舞', '跑步', '游泳'],
                answer: 0,
                vi: 'Nam: Sao sức khoẻ em tốt thế? — Nữ: Ngày nào em cũng tập thể dục. — Nam: Em tập gì? — Nữ: Sáng chạy bộ, tối nhảy múa. — Hỏi: Buổi tối người nữ tập môn gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '你妹妹今年多大了？' },
                  { s: 'M', zh: '十八岁了，今年九月开学，她要去北京上大学。' },
                  { s: 'F', zh: '真快啊！' },
                  { s: 'N', zh: '问：男的妹妹九月要做什么？' },
                ],
                options: ['去旅游', '去工作', '上大学'],
                answer: 2,
                vi: 'Nữ: Em gái anh năm nay bao nhiêu tuổi rồi? — Nam: Mười tám rồi, tháng Chín này khai giảng, em ấy sẽ lên Bắc Kinh học đại học. — Nữ: Nhanh thật! — Hỏi: Tháng Chín em gái người nam sẽ làm gì?',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'match-picture',
            pictures: [
              P('🧋', 'trà sữa'),
              P('🏀', 'chơi bóng rổ'),
              P('🧳', 'đi du lịch'),
              P('📞', 'gọi điện thoại'),
              P('🚇', 'tàu điện ngầm'),
              P('💊', 'thuốc'),
            ],
            items: [
              {
                text: '你吃药了吗？医生说一天吃三次。',
                answer: 5,
                vi: 'Bạn uống thuốc chưa? Bác sĩ bảo ngày uống ba lần.',
              },
              {
                text: '我们坐地铁去吧，地铁很快。',
                answer: 4,
                vi: 'Chúng mình đi tàu điện ngầm đi, tàu điện ngầm rất nhanh.',
              },
              {
                text: '我想喝奶茶，你要不要？',
                answer: 0,
                vi: 'Tôi muốn uống trà sữa, bạn có muốn không?',
              },
              {
                text: '我们星期六去打篮球，你也来吧！',
                answer: 1,
                vi: 'Thứ Bảy chúng mình đi chơi bóng rổ, bạn cũng đến nhé!',
              },
              {
                text: '下个月我和家人要去旅游。',
                answer: 2,
                vi: 'Tháng sau tôi và gia đình sẽ đi du lịch.',
              },
            ],
          },
          {
            type: 'fill-blank',
            options: ['虽然', '记得', '跟', '次', '可能', '希望'],
            items: [
              {
                text: '我（ ）你明天能来。',
                answer: 5,
                vi: 'Tôi hy vọng ngày mai bạn đến được.',
              },
              {
                text: '你还（ ）我吗？我们是小学同学。',
                answer: 1,
                vi: 'Bạn còn nhớ tôi không? Chúng ta là bạn học tiểu học.',
              },
              {
                text: '（ ）今天很冷，但是他还是去跑步了。',
                answer: 0,
                vi: 'Tuy hôm nay rất lạnh nhưng anh ấy vẫn đi chạy bộ.',
              },
              {
                text: '我去过北京两（ ）。',
                answer: 3,
                vi: 'Tôi đã đến Bắc Kinh hai lần.',
              },
              {
                text: '天阴了，明天（ ）会下雨。',
                answer: 4,
                vi: 'Trời âm u rồi, ngày mai có thể sẽ mưa.',
              },
            ],
          },
          {
            type: 'judge-text',
            items: [
              {
                text: '我是去年九月来中国的，到现在已经一年多了。',
                statement: '他在中国一年多了。',
                answer: true,
                vi: 'Tôi đến Trung Quốc từ tháng Chín năm ngoái, đến nay đã hơn một năm. — ★ Anh ấy ở Trung Quốc hơn một năm rồi.',
              },
              {
                text: '这家饭馆的菜不好吃，还很贵，我们别去了。',
                statement: '这家饭馆的菜很便宜。',
                answer: false,
                vi: 'Món ăn ở quán này không ngon, lại còn đắt, chúng ta đừng đi nữa. — ★ Món ăn ở quán này rất rẻ.',
              },
              {
                text: '妈妈让我早点儿回家，因为晚上要去奶奶家吃饭。',
                statement: '晚上他们要去奶奶家。',
                answer: true,
                vi: 'Mẹ bảo tôi về nhà sớm một chút, vì tối nay phải sang nhà bà nội ăn cơm. — ★ Tối nay họ sẽ sang nhà bà nội.',
              },
              {
                text: '我的汉语不太好，很多字都不认识，所以我每天都学一个小时汉语。',
                statement: '他的汉语非常好。',
                answer: false,
                vi: 'Tiếng Trung của tôi không tốt lắm, nhiều chữ còn không biết, nên ngày nào tôi cũng học tiếng Trung một tiếng. — ★ Tiếng Trung của anh ấy rất tốt.',
              },
              {
                text: '我们七点出门，坐了半个小时的公交车，七点半就到公司了。',
                statement: '他们是坐地铁去公司的。',
                answer: false,
                vi: 'Chúng tôi ra khỏi nhà lúc 7 giờ, đi xe buýt nửa tiếng, 7 rưỡi đã tới công ty. — ★ Họ đi tàu điện ngầm đến công ty.',
              },
            ],
          },
          {
            type: 'match-text',
            options: [
              '在门口，我们快进去吧。',
              '因为我身体不舒服。',
              '好的，你在哪儿等我？',
              '我觉得白色的好看。',
              '是的，我们是大学同学。',
              '已经十二点了，快睡觉吧。',
            ],
            items: [
              {
                text: '你们两个认识吗？',
                answer: 4,
                vi: 'Hai bạn quen nhau à?',
              },
              {
                text: '你为什么不去跑步了？',
                answer: 1,
                vi: 'Sao bạn không đi chạy bộ nữa?',
              },
              {
                text: '现在几点了？',
                answer: 5,
                vi: 'Bây giờ mấy giờ rồi?',
              },
              {
                text: '你看，这两件衣服哪件好看？',
                answer: 3,
                vi: 'Bạn xem, hai bộ quần áo này bộ nào đẹp?',
              },
              {
                text: '下午我们一起去商场吧。',
                answer: 2,
                vi: 'Chiều nay chúng mình cùng đi trung tâm thương mại nhé.',
              },
            ],
          },
          {
            type: 'match-text',
            continues: true,
            options: [
              '没关系，我们打车去吧。',
              '喜欢，我经常去游泳。',
              '对不起，我忘了。',
              '不远，走路五分钟。',
              '我想买一个新手机。',
            ],
            items: [
              {
                text: '你家离这儿远吗？',
                answer: 3,
                vi: 'Nhà bạn cách đây có xa không?',
              },
              {
                text: '你喜欢运动吗？',
                answer: 1,
                vi: 'Bạn có thích thể thao không?',
              },
              {
                text: '公交车已经走了。',
                answer: 0,
                vi: 'Xe buýt đi mất rồi.',
              },
              {
                text: '你去商场想买什么？',
                answer: 4,
                vi: 'Bạn đi trung tâm thương mại muốn mua gì?',
              },
              {
                text: '你怎么没给我打电话？',
                answer: 2,
                vi: 'Sao bạn không gọi điện cho tôi?',
              },
            ],
          },
        ],
      },
    ],
  },
];
