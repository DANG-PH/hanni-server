import type { MockPaper, Picture } from '../mock-exam.types';

/**
 * Đề thi thử HSK 4 — Hanni tự soạn (không chép đề thật), chỉ dùng chữ trong từ vựng HSK 1–4 (HSK 3.0, ~2000 từ)
 * cộng vài tên riêng — spec kiểm tra từng chữ. Cấu trúc đề HSK 4 hiện hành (100 câu, 100 phút làm bài — đề thật
 * ghi "约105分钟" gồm 5 phút điền thông tin cá nhân):
 * - Nghe: 1–10 nghe 1 đoạn, xét câu ★ đúng/sai · 11–25 hội thoại 2 câu + câu hỏi chọn A/B/C/D · 26–35 hội thoại
 *   4–5 câu + câu hỏi · 36–45 nghe 1 đoạn, mỗi đoạn 2 câu hỏi (đoạn được đọc lại ở câu thứ hai).
 * - Đọc: 46–55 chọn từ điền chỗ trống (46–50 câu đơn, 51–55 hội thoại; mỗi bộ A–F thừa 1) · 56–65 sắp xếp 3 câu
 *   A/B/C thành đoạn văn · 66–85 đọc đoạn văn + câu hỏi chọn A/B/C/D (80–85 mỗi đoạn 2 câu hỏi).
 * - Viết: 86–95 sắp xếp từ thành câu · 96–100 nhìn tranh, dùng từ cho sẵn đặt câu (chấm tự động mức tối thiểu,
 *   chữa bài bằng câu mẫu — `acceptableSentence`).
 */
const P = (e: string, vi: string): Picture => ({ e, vi });

const RUN =
  '很多人认为早上运动对身体最好。其实，什么时候运动应该看自己的情况来决定。如果早上起不来，晚饭后一个小时去散散步、跑跑步也很好。最重要的是要坚持，每次运动三十分钟以上，效果才会好。';
const DAVID =
  '我叫大卫，来中国已经两年了。刚来的时候，我一句汉语也不会说，买东西、坐车都很麻烦。后来我在大学学了一年汉语，还交了很多中国朋友。现在我不但能用汉语跟别人聊天，而且还能看懂中文小说了。';
const SHOP =
  '现在的年轻人越来越喜欢在网上买东西。网上可以选择的东西很多，价格也比商店便宜，而且在家就能买到。不过，网上购物也有缺点，比如看不到真的东西，有时候买到的东西和照片上的不一样。';
const FLIGHT =
  '各位乘客，欢迎乘坐本次航班。我们的飞机将在二十分钟后起飞，本次航班从北京飞往上海，飞行时间大约两个小时。飞机起飞时，请您在座位上坐好，关掉手机。祝您旅行愉快！';
const GRANDPA =
  '我的爷爷今年八十岁了，可是身体还很健康。他每天早上六点起床，先去公园锻炼身体，然后回家吃早饭。下午他喜欢看看报纸、写写字。爷爷常说，心情好，身体才会好。';
const VILLAGE =
  '我的老家在一个小山村，那里风景很美，空气也很新鲜，但是交通很不方便。小时候，我每天要走一个多小时的路去上学。后来村里修了公路，通了公共汽车，现在从村里到城里只要半个小时。';
const HABIT =
  '一个人的性格和他的习惯有很大关系。比如，做事认真的人，一般都有早睡早起的好习惯；而做事马虎的人，常常会忘记带钥匙、忘记交作业。所以，如果想改变自己的性格，可以先从改变习惯开始。';
const PIANO =
  '张阿姨今年六十岁，不上班以后，她报名参加了老年大学的钢琴课。刚开始的时候，她连简单的歌也弹不好，可是她每天坚持练习两个小时。现在，她已经能在晚会上为大家表演了。';

export const HSK4_PAPERS: MockPaper[] = [
  {
    slug: 'hsk4-de-1',
    level: 4,
    title: 'HSK 4 — Đề 1',
    durationMin: 100,
    sections: [
      {
        kind: 'listening',
        parts: [
          {
            type: 'judge-text',
            items: [
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我以前很少运动，后来医生建议我每天走走路。现在我每天晚饭后都去公园散步，身体比以前好多了。',
                  },
                ],
                statement: '他现在常常散步。',
                answer: true,
                vi: 'Trước đây tôi rất ít vận động, sau đó bác sĩ khuyên mỗi ngày nên đi bộ. Bây giờ tối nào ăn xong tôi cũng ra công viên đi dạo, sức khỏe tốt hơn trước nhiều. ★ Bây giờ anh ấy thường đi dạo.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '这家饭馆的菜很好吃，价格也不贵，所以每到周末，门口都排着很长的队。如果想在这儿吃饭，最好提前打电话。',
                  },
                ],
                statement: '这家饭馆的菜很贵。',
                answer: false,
                vi: 'Món ăn ở nhà hàng này rất ngon, giá cũng không đắt, nên cứ cuối tuần là trước cửa xếp hàng dài. Nếu muốn ăn ở đây, tốt nhất nên gọi điện trước. ★ Món ăn ở nhà hàng này rất đắt.',
                explain: '价格也不贵 — giá cũng không đắt.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我已经在这家公司工作了五年了。虽然工资不算高，但是同事们都很友好，我也学到了很多东西，所以我不打算换工作。',
                  },
                ],
                statement: '他想换工作。',
                answer: false,
                vi: 'Tôi đã làm ở công ty này năm năm rồi. Tuy lương không cao lắm nhưng đồng nghiệp đều rất thân thiện, tôi cũng học được nhiều điều, nên tôi không định đổi việc. ★ Anh ấy muốn đổi việc.',
                explain: '不打算换工作 — không định đổi việc.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '明天的会议原来安排在上午九点，但是经理上午要去机场接客人，所以会议推迟到了下午两点，地点没有变。',
                  },
                ],
                statement: '会议的时间改了。',
                answer: true,
                vi: 'Cuộc họp ngày mai vốn sắp xếp lúc 9 giờ sáng, nhưng buổi sáng giám đốc phải ra sân bay đón khách, nên cuộc họp hoãn đến 2 giờ chiều, địa điểm không đổi. ★ Thời gian cuộc họp đã thay đổi.',
                explain:
                  '推迟到了下午两点 — hoãn sang 2 giờ chiều; chỉ địa điểm là không đổi.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '很多人觉得学汉语很难，特别是汉字。其实只要每天坚持写一写、读一读，慢慢就会发现汉字也很有意思。',
                  },
                ],
                statement: '说话人认为汉字很无聊。',
                answer: false,
                vi: 'Nhiều người thấy học tiếng Trung rất khó, nhất là chữ Hán. Thật ra chỉ cần mỗi ngày kiên trì viết, đọc một chút, dần dần sẽ thấy chữ Hán cũng rất thú vị. ★ Người nói cho rằng chữ Hán rất nhàm chán.',
                explain: '汉字也很有意思 — chữ Hán cũng rất thú vị.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '我妹妹从小就喜欢唱歌，她的理想是成为一名歌手。上个月她参加了学校的唱歌比赛，得了第一名。',
                  },
                ],
                statement: '妹妹在比赛中得了第一名。',
                answer: true,
                vi: 'Em gái tôi từ nhỏ đã thích hát, ước mơ của em là trở thành ca sĩ. Tháng trước em tham gia cuộc thi hát của trường và giành giải nhất. ★ Em gái giành hạng nhất trong cuộc thi.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '现在很多年轻人都喜欢在网上购物，因为又方便又便宜。不过，网上买的东西有时候质量不太好，所以买之前最好仔细看看别人的评价。',
                  },
                ],
                statement: '网上的东西质量都很好。',
                answer: false,
                vi: 'Bây giờ nhiều người trẻ thích mua sắm trên mạng vì vừa tiện vừa rẻ. Có điều đồ mua trên mạng đôi khi chất lượng không tốt lắm, nên trước khi mua tốt nhất xem kỹ đánh giá của người khác. ★ Đồ trên mạng chất lượng đều rất tốt.',
                explain: '有时候质量不太好 — đôi khi chất lượng không tốt lắm.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '这次旅行我们一共去了三个城市。最让我难忘的是最后一个城市，那里不但风景美，而且人也特别热情。',
                  },
                ],
                statement: '她对最后一个城市印象很深。',
                answer: true,
                vi: 'Chuyến đi này chúng tôi đến tổng cộng ba thành phố. Khiến tôi khó quên nhất là thành phố cuối cùng, ở đó không chỉ phong cảnh đẹp mà người dân cũng đặc biệt nhiệt tình. ★ Cô ấy có ấn tượng sâu sắc với thành phố cuối cùng.',
                explain:
                  '最让我难忘 — khó quên nhất ⇒ ấn tượng sâu sắc (印象很深).',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '我儿子今年上小学二年级，他每天放学回家以后先做作业，做完作业才能看电视，这是我们家的规定。',
                  },
                ],
                statement: '儿子回家后先看电视。',
                answer: false,
                vi: 'Con trai tôi năm nay học lớp hai, ngày nào tan học về nhà cũng làm bài tập trước, làm xong mới được xem tivi, đây là quy định của nhà tôi. ★ Con trai về nhà thì xem tivi trước.',
                explain:
                  '先做作业，做完作业才能看电视 — làm bài trước, xong mới được xem tivi.',
              },
              {
                audio: [
                  {
                    s: 'F',
                    zh: '下个月我要去北京参加一个国际会议，这是我第一次去中国。我打算会议结束以后在北京多留几天，好好参观一下。',
                  },
                ],
                statement: '她以前去过中国。',
                answer: false,
                vi: 'Tháng sau tôi sẽ đến Bắc Kinh dự một hội nghị quốc tế, đây là lần đầu tôi đến Trung Quốc. Tôi định sau hội nghị ở lại Bắc Kinh thêm vài ngày để tham quan cho kỹ. ★ Trước đây cô ấy đã từng đến Trung Quốc.',
                explain:
                  '这是我第一次去中国 — đây là lần đầu tôi đến Trung Quốc.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'F', zh: '你的汉语说得这么好，学了多长时间了？' },
                  { s: 'M', zh: '差不多三年了，不过我每天都和中国朋友聊天。' },
                  { s: 'N', zh: '问：男的学汉语多长时间了？' },
                ],
                options: ['一年', '两年', '三年', '五年'],
                answer: 2,
                vi: 'Nữ: Anh nói tiếng Trung giỏi thế, học bao lâu rồi? — Nam: Gần ba năm rồi, có điều ngày nào tôi cũng trò chuyện với bạn Trung Quốc. Hỏi: Người nam học tiếng Trung bao lâu rồi?',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '这件衣服你穿上有点儿大，要不要换一件小一点儿的？',
                  },
                  { s: 'F', zh: '好，那你帮我拿一件吧，颜色一样就行。' },
                  { s: 'N', zh: '问：女的想要什么样的衣服？' },
                ],
                options: ['大一点儿的', '小一点儿的', '红色的', '便宜的'],
                answer: 1,
                vi: 'Nam: Bộ quần áo này chị mặc hơi rộng, có muốn đổi cỡ nhỏ hơn không? — Nữ: Được, vậy anh lấy giúp tôi một bộ, cùng màu là được. Hỏi: Người nữ muốn quần áo thế nào?',
              },
              {
                audio: [
                  { s: 'F', zh: '今天的晚饭你别做了，我们出去吃吧。' },
                  { s: 'M', zh: '好啊，楼下新开了一家饭馆，听说味道不错。' },
                  { s: 'N', zh: '问：他们晚上最可能做什么？' },
                ],
                options: ['在家做饭', '去饭馆吃饭', '去超市买菜', '去朋友家'],
                answer: 1,
                vi: 'Nữ: Tối nay anh đừng nấu nữa, chúng ta ra ngoài ăn đi. — Nam: Được, dưới tầng mới mở một nhà hàng, nghe nói đồ ăn ngon. Hỏi: Buổi tối họ nhiều khả năng làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '你怎么又迟到了？会议已经开始半个小时了。' },
                  { s: 'F', zh: '对不起，路上堵车堵得太厉害了。' },
                  { s: 'N', zh: '问：女的为什么迟到？' },
                ],
                options: ['起床晚了', '忘了时间', '路上堵车', '身体不舒服'],
                answer: 2,
                vi: 'Nam: Sao chị lại đến muộn nữa? Cuộc họp bắt đầu được nửa tiếng rồi. — Nữ: Xin lỗi, trên đường kẹt xe kinh khủng quá. Hỏi: Vì sao người nữ đến muộn?',
              },
              {
                audio: [
                  { s: 'F', zh: '这个周末你有什么安排？' },
                  {
                    s: 'M',
                    zh: '我打算在家好好休息一下，这个星期工作太累了。',
                  },
                  { s: 'N', zh: '问：男的周末打算做什么？' },
                ],
                options: ['加班', '去旅游', '在家休息', '去看朋友'],
                answer: 2,
                vi: 'Nữ: Cuối tuần này anh có kế hoạch gì? — Nam: Tôi định ở nhà nghỉ ngơi cho thật tốt, tuần này làm việc mệt quá. Hỏi: Cuối tuần người nam định làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '请问，从这儿到火车站怎么走最快？' },
                  { s: 'F', zh: '坐地铁吧，二号线三站就到了，比坐出租车快。' },
                  { s: 'N', zh: '问：女的建议怎么去火车站？' },
                ],
                options: ['走路', '坐出租车', '坐地铁', '骑自行车'],
                answer: 2,
                vi: 'Nam: Xin hỏi, từ đây đến ga tàu đi thế nào nhanh nhất? — Nữ: Đi tàu điện ngầm đi, tuyến số hai ba ga là đến, nhanh hơn đi taxi. Hỏi: Người nữ khuyên đến ga tàu bằng cách nào?',
              },
              {
                audio: [
                  { s: 'F', zh: '你看这张照片，是我去年在海边照的。' },
                  { s: 'M', zh: '照得真漂亮！你看起来比现在瘦一点儿。' },
                  { s: 'N', zh: '问：男的觉得照片怎么样？' },
                ],
                options: ['很漂亮', '不太好', '太旧了', '看不清楚'],
                answer: 0,
                vi: 'Nữ: Anh xem bức ảnh này, tôi chụp ở bờ biển năm ngoái. — Nam: Chụp đẹp thật! Trông chị gầy hơn bây giờ một chút. Hỏi: Người nam thấy bức ảnh thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '我的手机怎么找不到了？刚才还在桌子上。' },
                  { s: 'F', zh: '别着急，是不是放在你的包里了？' },
                  { s: 'N', zh: '问：男的在找什么？' },
                ],
                options: ['钥匙', '手机', '包', '钱'],
                answer: 1,
                vi: 'Nam: Sao tôi không tìm thấy điện thoại đâu nhỉ? Vừa nãy còn ở trên bàn. — Nữ: Đừng vội, có phải để trong túi của anh không? Hỏi: Người nam đang tìm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '王老师，明天的考试难不难？' },
                  { s: 'M', zh: '不太难，只要你认真复习了，就没有问题。' },
                  { s: 'N', zh: '问：男的是什么意思？' },
                ],
                options: [
                  '考试很难',
                  '不用复习',
                  '认真复习就能考好',
                  '考试取消了',
                ],
                answer: 2,
                vi: 'Nữ: Thầy Vương, bài thi ngày mai có khó không ạ? — Nam: Không khó lắm, chỉ cần em ôn tập nghiêm túc thì không có vấn đề gì. Hỏi: Người nam có ý gì?',
                explain:
                  '只要……就…… — chỉ cần… thì… ⇒ ôn tập nghiêm túc là làm tốt.',
              },
              {
                audio: [
                  {
                    s: 'M',
                    zh: '这个房子离公司很近，房租也不贵，你为什么不租呢？',
                  },
                  { s: 'F', zh: '房间太小了，而且没有厨房，我想自己做饭。' },
                  { s: 'N', zh: '问：女的为什么不租那个房子？' },
                ],
                options: ['离公司太远', '房租太贵', '没有厨房', '周围不安全'],
                answer: 2,
                vi: 'Nam: Căn nhà này gần công ty, tiền thuê cũng không đắt, sao chị không thuê? — Nữ: Phòng nhỏ quá, hơn nữa không có bếp, tôi muốn tự nấu ăn. Hỏi: Vì sao người nữ không thuê căn nhà đó?',
              },
              {
                audio: [
                  { s: 'F', zh: '我听说你要去中国留学了？' },
                  { s: 'M', zh: '是啊，我申请到了奖学金，下个月就出发。' },
                  { s: 'N', zh: '问：男的为什么能去中国留学？' },
                ],
                options: [
                  '父母给了钱',
                  '拿到了奖学金',
                  '公司让他去',
                  '他自己赚了钱',
                ],
                answer: 1,
                vi: 'Nữ: Nghe nói anh sắp đi du học Trung Quốc à? — Nam: Đúng vậy, tôi xin được học bổng, tháng sau là lên đường. Hỏi: Vì sao người nam có thể đi du học Trung Quốc?',
              },
              {
                audio: [
                  { s: 'M', zh: '你今天怎么这么高兴？' },
                  { s: 'F', zh: '我的论文通过了，下个星期就可以毕业了。' },
                  { s: 'N', zh: '问：女的为什么高兴？' },
                ],
                options: [
                  '找到了工作',
                  '论文通过了',
                  '考了第一名',
                  '要去旅行了',
                ],
                answer: 1,
                vi: 'Nam: Sao hôm nay chị vui thế? — Nữ: Luận văn của tôi đã được thông qua, tuần sau là có thể tốt nghiệp rồi. Hỏi: Vì sao người nữ vui?',
              },
              {
                audio: [
                  { s: 'F', zh: '这个菜有点儿咸，你下次少放点儿盐。' },
                  { s: 'M', zh: '好的，我知道了，下次一定注意。' },
                  { s: 'N', zh: '问：女的觉得菜怎么样？' },
                ],
                options: ['太辣了', '太咸了', '太甜了', '很好吃'],
                answer: 1,
                vi: 'Nữ: Món này hơi mặn, lần sau anh cho ít muối thôi. — Nam: Được, tôi biết rồi, lần sau nhất định chú ý. Hỏi: Người nữ thấy món ăn thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: '小张，你的作文写得非常好，我要表扬你。' },
                  { s: 'F', zh: '谢谢老师，我写了好几遍呢。' },
                  { s: 'N', zh: '问：他们最可能是什么关系？' },
                ],
                options: [
                  '老师和学生',
                  '医生和病人',
                  '经理和职员',
                  '丈夫和妻子',
                ],
                answer: 0,
                vi: 'Nam: Tiểu Trương, bài văn của em viết rất hay, thầy muốn khen em. — Nữ: Em cảm ơn thầy, em viết đi viết lại mấy lần đấy ạ. Hỏi: Hai người nhiều khả năng có quan hệ gì?',
                explain: '作文 (bài văn) + 谢谢老师 ⇒ thầy và trò.',
              },
              {
                audio: [
                  { s: 'F', zh: '外面雨下得这么大，你还要出去吗？' },
                  { s: 'M', zh: '我跟朋友约好了，不去不好，我穿上雨衣就行。' },
                  { s: 'N', zh: '问：男的为什么还要出去？' },
                ],
                options: [
                  '要去上班',
                  '跟朋友约好了',
                  '要去买东西',
                  '雨已经停了',
                ],
                answer: 1,
                vi: 'Nữ: Bên ngoài mưa to thế này, anh vẫn muốn ra ngoài à? — Nam: Tôi đã hẹn với bạn rồi, không đi thì không hay, tôi mặc áo mưa là được. Hỏi: Vì sao người nam vẫn muốn ra ngoài?',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                audio: [
                  { s: 'M', zh: '你好，我想办一张银行卡。' },
                  { s: 'F', zh: '好的，请问您带身份证了吗？' },
                  { s: 'M', zh: '带了，在这儿。' },
                  { s: 'F', zh: '请您先填写一下这张表格。' },
                  { s: 'N', zh: '问：男的现在最可能在哪儿？' },
                ],
                options: ['银行', '医院', '学校', '超市'],
                answer: 0,
                vi: 'Nam: Xin chào, tôi muốn làm một thẻ ngân hàng. — Nữ: Vâng, xin hỏi anh có mang chứng minh thư không? — Nam: Có, đây ạ. — Nữ: Mời anh điền vào tờ đơn này trước. Hỏi: Người nam bây giờ nhiều khả năng đang ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: '听说你最近在学开车？' },
                  { s: 'M', zh: '是啊，已经学了一个多月了。' },
                  { s: 'F', zh: '难不难？' },
                  {
                    s: 'M',
                    zh: '开始觉得很难，现在好多了，下个月就能考试了。',
                  },
                  { s: 'N', zh: '问：关于男的，可以知道什么？' },
                ],
                options: [
                  '已经会开车了',
                  '正在学开车',
                  '不想学开车',
                  '考试没通过',
                ],
                answer: 1,
                vi: 'Nữ: Nghe nói dạo này anh đang học lái xe? — Nam: Ừ, học được hơn một tháng rồi. — Nữ: Có khó không? — Nam: Lúc đầu thấy rất khó, giờ đỡ nhiều rồi, tháng sau là thi được. Hỏi: Về người nam, có thể biết điều gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '这台电脑多少钱？' },
                  { s: 'F', zh: '原来卖五千块，现在打八折。' },
                  { s: 'M', zh: '那就是四千块，对吗？' },
                  { s: 'F', zh: '对，而且还送一个电脑包。' },
                  { s: 'N', zh: '问：电脑现在卖多少钱？' },
                ],
                options: ['五千块', '四千五百块', '四千块', '三千块'],
                answer: 2,
                vi: 'Nam: Chiếc máy tính này bao nhiêu tiền? — Nữ: Trước bán năm nghìn tệ, bây giờ giảm còn 80%. — Nam: Vậy là bốn nghìn tệ phải không? — Nữ: Đúng, lại còn tặng kèm một túi đựng máy tính. Hỏi: Máy tính bây giờ bán bao nhiêu tiền?',
                explain: '打八折 = trả 80% giá: 5000 × 0,8 = 4000 tệ.',
              },
              {
                audio: [
                  { s: 'F', zh: '你周末一般做什么？' },
                  { s: 'M', zh: '我喜欢去健身房锻炼身体。' },
                  { s: 'F', zh: '每个周末都去吗？' },
                  { s: 'M', zh: '差不多吧，除了有别的事情的时候。' },
                  { s: 'N', zh: '问：男的周末一般做什么？' },
                ],
                options: ['在家看书', '去健身房', '去爬山', '去看电影'],
                answer: 1,
                vi: 'Nữ: Cuối tuần anh thường làm gì? — Nam: Tôi thích đến phòng gym tập thể dục. — Nữ: Cuối tuần nào cũng đi à? — Nam: Gần như vậy, trừ lúc có việc khác. Hỏi: Cuối tuần người nam thường làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '明天的面试你准备好了吗？' },
                  { s: 'F', zh: '差不多了，就是有点儿紧张。' },
                  { s: 'M', zh: '别紧张，你的条件这么好，一定没问题。' },
                  { s: 'F', zh: '希望吧，谢谢你。' },
                  { s: 'N', zh: '问：女的明天要做什么？' },
                ],
                options: ['考试', '面试', '出差', '搬家'],
                answer: 1,
                vi: 'Nam: Buổi phỏng vấn ngày mai em chuẩn bị xong chưa? — Nữ: Gần xong rồi, chỉ là hơi căng thẳng. — Nam: Đừng căng thẳng, điều kiện của em tốt thế, chắc chắn không sao. — Nữ: Mong là vậy, cảm ơn anh. Hỏi: Ngày mai người nữ sẽ làm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: '师傅，我要去机场，来得及吗？' },
                  { s: 'M', zh: '您几点的飞机？' },
                  { s: 'F', zh: '下午三点的。' },
                  {
                    s: 'M',
                    zh: '现在才十二点，路上不堵车的话，一个小时就到了。',
                  },
                  { s: 'N', zh: '问：女的现在最可能在做什么？' },
                ],
                options: ['坐出租车', '坐飞机', '在机场等人', '开车'],
                answer: 0,
                vi: 'Nữ: Bác tài, tôi đi sân bay, có kịp không ạ? — Nam: Máy bay của chị mấy giờ? — Nữ: Ba giờ chiều. — Nam: Bây giờ mới mười hai giờ, đường không tắc thì một tiếng là tới. Hỏi: Người nữ bây giờ nhiều khả năng đang làm gì?',
                explain:
                  '师傅 — cách gọi tài xế taxi; cô ấy đang trên đường ra sân bay.',
              },
              {
                audio: [
                  { s: 'M', zh: '这么晚了，你怎么还在办公室？' },
                  { s: 'F', zh: '明天要交一份报告，我还没写完。' },
                  { s: 'M', zh: '要不要我帮你？' },
                  { s: 'F', zh: '不用了，再有半个小时就好了。' },
                  { s: 'N', zh: '问：女的为什么还在办公室？' },
                ],
                options: ['在等人', '要写报告', '在开会', '电脑坏了'],
                answer: 1,
                vi: 'Nam: Muộn thế này rồi sao em vẫn còn ở văn phòng? — Nữ: Ngày mai phải nộp một bản báo cáo, em chưa viết xong. — Nam: Có cần anh giúp không? — Nữ: Không cần đâu, nửa tiếng nữa là xong. Hỏi: Vì sao người nữ vẫn còn ở văn phòng?',
              },
              {
                audio: [
                  { s: 'F', zh: '你的眼睛怎么这么红？' },
                  { s: 'M', zh: '昨天晚上看球赛，看到两点才睡。' },
                  { s: 'F', zh: '比赛那么好看吗？' },
                  { s: 'M', zh: '当然，是我最喜欢的球队，而且最后赢了。' },
                  { s: 'N', zh: '问：男的昨天晚上做什么了？' },
                ],
                options: ['加班', '看比赛', '学习', '和朋友聊天'],
                answer: 1,
                vi: 'Nữ: Sao mắt anh đỏ thế? — Nam: Tối qua xem bóng đá, xem đến hai giờ mới ngủ. — Nữ: Trận đấu hay đến thế à? — Nam: Tất nhiên, là đội bóng tôi thích nhất, mà cuối cùng còn thắng nữa. Hỏi: Tối qua người nam đã làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: '你家的小狗真可爱，养了多久了？' },
                  { s: 'F', zh: '两年了，是我生日的时候朋友送的。' },
                  { s: 'M', zh: '它平时谁照顾？' },
                  { s: 'F', zh: '我和我妈妈，它特别喜欢我妈妈。' },
                  { s: 'N', zh: '问：小狗是从哪儿来的？' },
                ],
                options: ['在商店买的', '朋友送的', '妈妈养的', '同事给的'],
                answer: 1,
                vi: 'Nam: Con chó nhỏ nhà chị đáng yêu thật, nuôi bao lâu rồi? — Nữ: Hai năm rồi, bạn tặng tôi hồi sinh nhật. — Nam: Bình thường ai chăm nó? — Nữ: Tôi và mẹ tôi, nó đặc biệt thích mẹ tôi. Hỏi: Con chó nhỏ từ đâu mà có?',
              },
              {
                audio: [
                  { s: 'F', zh: '这次考试你考得怎么样？' },
                  { s: 'M', zh: '比上次好多了，听力和阅读都不错。' },
                  { s: 'F', zh: '那写作呢？' },
                  { s: 'M', zh: '写作还是有点儿问题，我还要多练练。' },
                  { s: 'N', zh: '问：男的哪方面需要多练习？' },
                ],
                options: ['听力', '阅读', '写作', '口语'],
                answer: 2,
                vi: 'Nữ: Kỳ thi này anh làm thế nào? — Nam: Tốt hơn lần trước nhiều, nghe và đọc đều khá. — Nữ: Còn viết thì sao? — Nam: Viết vẫn còn chút vấn đề, tôi phải luyện thêm. Hỏi: Người nam cần luyện thêm mặt nào?',
              },
              {
                audio: [
                  { s: 'F', zh: RUN },
                  { s: 'N', zh: '问：说话人认为什么最重要？' },
                ],
                options: [
                  '早上运动',
                  '坚持运动',
                  '运动时间长',
                  '吃完饭马上运动',
                ],
                answer: 1,
                vi: 'Nhiều người cho rằng tập thể dục buổi sáng tốt cho sức khỏe nhất. Thật ra tập lúc nào nên tùy tình hình bản thân. Nếu buổi sáng không dậy nổi, sau bữa tối một tiếng đi dạo, chạy bộ cũng rất tốt. Quan trọng nhất là phải kiên trì, mỗi lần tập trên ba mươi phút thì mới có hiệu quả. Hỏi: Người nói cho rằng điều gì quan trọng nhất?',
                explain: '最重要的是要坚持 — quan trọng nhất là kiên trì.',
              },
              {
                audio: [
                  { s: 'F', zh: RUN },
                  { s: 'N', zh: '问：每次运动多长时间，效果才会好？' },
                ],
                options: ['十分钟', '二十分钟', '三十分钟以上', '一个小时以上'],
                answer: 2,
                vi: '(Cùng đoạn trên) Hỏi: Mỗi lần tập bao lâu thì mới có hiệu quả?',
              },
              {
                audio: [
                  { s: 'M', zh: DAVID },
                  { s: 'N', zh: '问：大卫刚来中国的时候怎么样？' },
                ],
                options: [
                  '会说很多汉语',
                  '一句汉语也不会说',
                  '有很多中国朋友',
                  '在公司工作',
                ],
                answer: 1,
                vi: 'Tôi tên là David, đến Trung Quốc đã hai năm. Lúc mới đến, tôi một câu tiếng Trung cũng không biết nói, mua đồ, đi xe đều rất phiền. Sau đó tôi học tiếng Trung một năm ở đại học, còn kết bạn với nhiều người Trung Quốc. Bây giờ tôi không chỉ có thể trò chuyện bằng tiếng Trung mà còn đọc hiểu được tiểu thuyết tiếng Trung. Hỏi: Lúc David mới đến Trung Quốc thế nào?',
              },
              {
                audio: [
                  { s: 'M', zh: DAVID },
                  { s: 'N', zh: '问：大卫现在能做什么？' },
                ],
                options: ['当汉语老师', '看懂中文小说', '写中文小说', '当翻译'],
                answer: 1,
                vi: '(Cùng đoạn trên) Hỏi: Bây giờ David có thể làm gì?',
                explain:
                  '还能看懂中文小说 — còn đọc hiểu được tiểu thuyết tiếng Trung (không phải viết).',
              },
              {
                audio: [
                  { s: 'F', zh: SHOP },
                  { s: 'N', zh: '问：年轻人为什么喜欢在网上买东西？' },
                ],
                options: [
                  '东西质量好',
                  '选择多、价格便宜',
                  '送货很快',
                  '可以试穿',
                ],
                answer: 1,
                vi: 'Người trẻ bây giờ ngày càng thích mua đồ trên mạng. Trên mạng có rất nhiều thứ để lựa chọn, giá cũng rẻ hơn cửa hàng, hơn nữa ở nhà là mua được. Có điều mua sắm trên mạng cũng có nhược điểm, chẳng hạn không nhìn thấy đồ thật, đôi khi đồ mua về khác với ảnh. Hỏi: Vì sao người trẻ thích mua đồ trên mạng?',
              },
              {
                audio: [
                  { s: 'F', zh: SHOP },
                  { s: 'N', zh: '问：在网上买东西有什么缺点？' },
                ],
                options: ['价格太高', '东西太少', '看不到真的东西', '需要排队'],
                answer: 2,
                vi: '(Cùng đoạn trên) Hỏi: Mua đồ trên mạng có nhược điểm gì?',
              },
              {
                audio: [
                  { s: 'F', zh: FLIGHT },
                  { s: 'N', zh: '问：这段话最可能在哪儿听到？' },
                ],
                options: ['火车上', '飞机上', '公共汽车上', '地铁里'],
                answer: 1,
                vi: 'Kính thưa quý hành khách, chào mừng quý khách đến với chuyến bay hôm nay. Máy bay sẽ cất cánh sau hai mươi phút nữa, chuyến bay từ Bắc Kinh đi Thượng Hải, thời gian bay khoảng hai tiếng. Khi máy bay cất cánh, xin quý khách ngồi yên tại chỗ và tắt điện thoại. Chúc quý khách chuyến đi vui vẻ! Hỏi: Đoạn này nhiều khả năng nghe thấy ở đâu?',
              },
              {
                audio: [
                  { s: 'F', zh: FLIGHT },
                  { s: 'N', zh: '问：从北京到上海要飞多长时间？' },
                ],
                options: ['二十分钟', '一个小时', '两个小时左右', '三个小时'],
                answer: 2,
                vi: '(Cùng đoạn trên) Hỏi: Bay từ Bắc Kinh đến Thượng Hải mất bao lâu?',
                explain:
                  '二十分钟后起飞 là thời gian chờ cất cánh; 飞行时间大约两个小时 mới là thời gian bay.',
              },
              {
                audio: [
                  { s: 'M', zh: GRANDPA },
                  { s: 'N', zh: '问：爷爷每天早上做什么？' },
                ],
                options: ['去公园锻炼', '看报纸', '写字', '做早饭'],
                answer: 0,
                vi: 'Ông tôi năm nay tám mươi tuổi nhưng sức khỏe vẫn rất tốt. Sáng nào ông cũng dậy lúc sáu giờ, ra công viên tập thể dục trước, rồi về nhà ăn sáng. Buổi chiều ông thích đọc báo, viết chữ. Ông thường nói, tâm trạng tốt thì sức khỏe mới tốt. Hỏi: Sáng nào ông cũng làm gì?',
              },
              {
                audio: [
                  { s: 'M', zh: GRANDPA },
                  { s: 'N', zh: '问：爷爷认为身体好的关键是什么？' },
                ],
                options: ['多吃饭', '心情好', '多睡觉', '少运动'],
                answer: 1,
                vi: '(Cùng đoạn trên) Hỏi: Ông cho rằng mấu chốt để có sức khỏe tốt là gì?',
                explain:
                  '心情好，身体才会好 — tâm trạng tốt thì sức khỏe mới tốt.',
              },
            ],
          },
        ],
      },
      {
        kind: 'reading',
        parts: [
          {
            type: 'fill-blank',
            options: ['准时', '温度', '适合', '尤其', '勇敢', '继续'],
            items: [
              {
                text: '这件衣服的颜色很（ ）你，你穿上很好看。',
                answer: 2,
                vi: 'Màu của bộ quần áo này rất hợp với bạn, bạn mặc vào rất đẹp.',
              },
              {
                text: '今天的（ ）比昨天低了十度，出门多穿点儿衣服。',
                answer: 1,
                vi: 'Nhiệt độ hôm nay thấp hơn hôm qua mười độ, ra ngoài nhớ mặc thêm áo.',
              },
              {
                text: '我们休息十分钟，然后（ ）上课。',
                answer: 5,
                vi: 'Chúng ta nghỉ mười phút, sau đó học tiếp.',
              },
              {
                text: '他每天都（ ）到公司，从来没有迟到过。',
                answer: 0,
                vi: 'Ngày nào anh ấy cũng đến công ty đúng giờ, chưa bao giờ đi muộn.',
              },
              {
                text: '我喜欢运动，（ ）是打篮球。',
                answer: 3,
                vi: 'Tôi thích thể thao, đặc biệt là chơi bóng rổ.',
              },
            ],
          },
          {
            type: 'fill-blank',
            continues: true,
            options: ['估计', '麻烦', '顺便', '原因', '肯定', '值得'],
            items: [
              {
                text: 'A：你知道他为什么没来吗？ B：我也不知道是什么（ ）。',
                answer: 3,
                vi: 'A: Bạn có biết vì sao anh ấy không đến không? B: Tôi cũng không biết là lý do gì.',
              },
              {
                text: 'A：这个电影怎么样？ B：非常好看，很（ ）一看。',
                answer: 5,
                vi: 'A: Bộ phim này thế nào? B: Rất hay, rất đáng xem.',
              },
              {
                text: 'A：你去超市吗？ B：是啊。 A：那你（ ）帮我买瓶水吧。',
                answer: 2,
                vi: 'A: Bạn đi siêu thị à? B: Ừ. A: Vậy tiện thể mua giúp tôi chai nước nhé.',
              },
              {
                text: 'A：都八点了，小李怎么还没到？ B：（ ）是路上堵车了。',
                answer: 0,
                vi: 'A: Tám giờ rồi, sao Tiểu Lý vẫn chưa đến? B: Chắc là đường bị tắc.',
                explain:
                  '估计 — đoán chừng; 肯定 (chắc chắn) quá khẳng định khi chỉ đang đoán.',
              },
              {
                text: 'A：真不好意思，又（ ）你了。 B：没关系，这是我应该做的。',
                answer: 1,
                vi: 'A: Thật ngại quá, lại làm phiền bạn rồi. B: Không sao, đây là việc tôi nên làm.',
              },
            ],
          },
          {
            type: 'order',
            items: [
              {
                pieces: [
                  '所以我们决定明天再去',
                  '可是今天突然下起了大雨',
                  '我们本来打算今天去爬山',
                ],
                answer:
                  '我们本来打算今天去爬山，可是今天突然下起了大雨，所以我们决定明天再去。',
                vi: 'Chúng tôi vốn định hôm nay đi leo núi, nhưng hôm nay đột nhiên mưa to, nên chúng tôi quyết định mai đi.',
                explain: '本来……可是……所以…… — vốn định… nhưng… nên…',
              },
              {
                pieces: [
                  '他就开始学习汉语了',
                  '小王对中国文化很感兴趣',
                  '从上大学的时候起',
                ],
                answer:
                  '小王对中国文化很感兴趣，从上大学的时候起，他就开始学习汉语了。',
                vi: 'Tiểu Vương rất hứng thú với văn hóa Trung Quốc, từ hồi học đại học cậu ấy đã bắt đầu học tiếng Trung.',
                explain:
                  '从……起，就…… — từ lúc… đã…; câu mở đầu giới thiệu nhân vật 小王.',
              },
              {
                pieces: [
                  '但是我觉得很值得',
                  '这次旅行花了不少钱',
                  '因为我看到了很多美丽的风景',
                ],
                answer:
                  '这次旅行花了不少钱，但是我觉得很值得，因为我看到了很多美丽的风景。',
                vi: 'Chuyến đi này tốn khá nhiều tiền, nhưng tôi thấy rất đáng, vì tôi đã được ngắm nhiều phong cảnh đẹp.',
              },
              {
                pieces: ['然后再去洗澡', '他每天下班回家', '先做饭吃饭'],
                answer: '他每天下班回家，先做饭吃饭，然后再去洗澡。',
                vi: 'Ngày nào tan làm về nhà anh ấy cũng nấu cơm ăn trước, sau đó mới đi tắm.',
                explain: '先……然后再…… — trước… sau đó mới…',
              },
              {
                pieces: [
                  '而且价格也不贵',
                  '这家饭馆的菜不但好吃',
                  '所以每天来吃饭的人都很多',
                ],
                answer:
                  '这家饭馆的菜不但好吃，而且价格也不贵，所以每天来吃饭的人都很多。',
                vi: 'Món ăn của nhà hàng này không những ngon mà giá cũng không đắt, nên ngày nào cũng rất đông người đến ăn.',
                explain: '不但……而且…… — không những… mà còn…',
              },
              {
                pieces: ['就一定能学好', '虽然汉语很难', '但是只要你每天坚持'],
                answer: '虽然汉语很难，但是只要你每天坚持，就一定能学好。',
                vi: 'Tuy tiếng Trung rất khó, nhưng chỉ cần bạn kiên trì mỗi ngày thì nhất định sẽ học tốt.',
                explain: '虽然……但是只要……就…… — tuy… nhưng chỉ cần… thì…',
              },
              {
                pieces: ['我们就出发', '等雨停了', '现在外面雨下得很大'],
                answer: '现在外面雨下得很大，等雨停了，我们就出发。',
                vi: 'Bây giờ bên ngoài mưa rất to, đợi mưa tạnh thì chúng ta xuất phát.',
              },
              {
                pieces: [
                  '结果把手机忘在出租车上了',
                  '今天早上我起晚了',
                  '急急忙忙出了门',
                ],
                answer:
                  '今天早上我起晚了，急急忙忙出了门，结果把手机忘在出租车上了。',
                vi: 'Sáng nay tôi dậy muộn, vội vội vàng vàng ra khỏi nhà, kết quả để quên điện thoại trên taxi.',
                explain: '结果 — kết quả là, đứng sau cùng nói hậu quả.',
              },
              {
                pieces: [
                  '如果你有什么问题',
                  '欢迎大家来参加这次活动',
                  '可以随时打电话问我',
                ],
                answer:
                  '欢迎大家来参加这次活动，如果你有什么问题，可以随时打电话问我。',
                vi: 'Hoan nghênh mọi người đến tham gia hoạt động lần này, nếu bạn có vấn đề gì, có thể gọi điện hỏi tôi bất cứ lúc nào.',
                explain:
                  '如果…… (có thể)…… — vế điều kiện đứng trước vế kết quả.',
              },
              {
                pieces: [
                  '第二天早上感冒就好了',
                  '昨天晚上我喝了一杯热水',
                  '然后很早就上床睡觉了',
                ],
                answer:
                  '昨天晚上我喝了一杯热水，然后很早就上床睡觉了，第二天早上感冒就好了。',
                vi: 'Tối qua tôi uống một cốc nước nóng, sau đó lên giường đi ngủ sớm, sáng hôm sau là khỏi cảm.',
              },
            ],
          },
          {
            type: 'choose-text',
            items: [
              {
                text: '小李是我们公司的经理，他工作很认真，对每个人都很热情。虽然他很年轻，但是公司里的人都很尊重他。',
                question: '关于小李，可以知道什么？',
                options: [
                  '年纪很大',
                  '对人很热情',
                  '工作不认真',
                  '大家不尊重他',
                ],
                answer: 1,
                vi: 'Tiểu Lý là giám đốc công ty chúng tôi, anh ấy làm việc rất nghiêm túc, đối với ai cũng rất nhiệt tình. Tuy anh ấy còn trẻ nhưng mọi người trong công ty đều rất tôn trọng anh ấy. ★ Về Tiểu Lý, có thể biết điều gì?',
              },
              {
                text: '我以前不喜欢吃辣的。来南方工作以后，我发现这里的人做菜都喜欢放辣的东西，后来我也慢慢习惯了，现在不放辣的反而觉得没有味道。',
                question: '他现在对吃辣的看法是：',
                options: ['还是不喜欢', '已经习惯了', '从来不吃', '觉得太辣了'],
                answer: 1,
                vi: 'Trước đây tôi không thích ăn cay. Sau khi vào miền Nam làm việc, tôi thấy người ở đây nấu ăn đều thích cho đồ cay, dần dần tôi cũng quen, bây giờ không cho cay lại thấy nhạt. ★ Bây giờ anh ấy nghĩ gì về ăn cay?',
                explain:
                  '反而 — trái lại: không cay lại thấy nhạt ⇒ đã quen ăn cay.',
              },
              {
                text: '这本书是一位著名作家写的，讲的是一个农村孩子努力学习、最后考上大学的故事。这本书出来以后，受到了很多读者的欢迎。',
                question: '这本书主要讲什么？',
                options: [
                  '作家的生活',
                  '农村孩子考上大学',
                  '城市的变化',
                  '怎么写小说',
                ],
                answer: 1,
                vi: 'Cuốn sách này do một nhà văn nổi tiếng viết, kể câu chuyện một đứa trẻ nông thôn chăm chỉ học tập, cuối cùng đỗ đại học. Sách ra đời được rất nhiều độc giả yêu thích. ★ Cuốn sách chủ yếu kể về điều gì?',
              },
              {
                text: '为了保护环境，现在很多城市都鼓励大家少开车，多坐公共汽车或者骑自行车。这样不但能减少空气污染，而且对身体也有好处。',
                question: '城市为什么鼓励大家少开车？',
                options: ['为了省钱', '为了保护环境', '车太贵了', '停车太难了'],
                answer: 1,
                vi: 'Để bảo vệ môi trường, nhiều thành phố bây giờ khuyến khích mọi người ít lái xe, đi xe buýt hoặc đạp xe nhiều hơn. Như vậy không những giảm ô nhiễm không khí mà còn tốt cho sức khỏe. ★ Vì sao thành phố khuyến khích mọi người ít lái xe?',
              },
              {
                text: '很多人有这样的经历：考试前一天晚上睡不着，越想睡越睡不着。其实，考试前放松一下，比如听听音乐、散散步，反而更容易睡着。',
                question: '考试前怎样才能更容易睡着？',
                options: ['多复习', '放松一下', '多吃东西', '早点儿起床'],
                answer: 1,
                vi: 'Nhiều người từng trải qua cảnh: tối trước ngày thi không ngủ được, càng muốn ngủ càng không ngủ được. Thật ra trước khi thi thư giãn một chút, chẳng hạn nghe nhạc, đi dạo, lại dễ ngủ hơn. ★ Trước khi thi làm thế nào mới dễ ngủ hơn?',
              },
              {
                text: '我和丈夫是大学同学，我们是在学校的一次活动中认识的。毕业以后，我们在同一个城市工作，三年后就结婚了。',
                question: '他们是怎么认识的？',
                options: [
                  '在公司认识的',
                  '在学校活动中认识的',
                  '朋友介绍的',
                  '在网上认识的',
                ],
                answer: 1,
                vi: 'Tôi và chồng là bạn học đại học, chúng tôi quen nhau trong một hoạt động của trường. Sau khi tốt nghiệp, chúng tôi làm việc cùng một thành phố, ba năm sau thì kết hôn. ★ Họ quen nhau như thế nào?',
              },
              {
                text: '这个手机虽然价格不高，但是质量很好，用起来也很方便。另外，它的样子也很漂亮，所以很多年轻人都喜欢。',
                question: '关于这个手机，下面哪个是对的？',
                options: [
                  '价格很高',
                  '质量不好',
                  '很受年轻人欢迎',
                  '用起来很麻烦',
                ],
                answer: 2,
                vi: 'Chiếc điện thoại này tuy giá không cao nhưng chất lượng rất tốt, dùng cũng rất tiện. Ngoài ra kiểu dáng cũng đẹp, nên nhiều người trẻ thích. ★ Về chiếc điện thoại này, câu nào đúng?',
              },
              {
                text: '学习一门外语，最好的方法是多听、多说、多读、多写。另外，有机会的话，最好去那个国家生活一段时间，这样进步会更快。',
                question: '怎样学外语进步会更快？',
                options: [
                  '只看书',
                  '去那个国家生活一段时间',
                  '多看电视',
                  '多做练习题',
                ],
                answer: 1,
                vi: 'Học một ngoại ngữ, cách tốt nhất là nghe nhiều, nói nhiều, đọc nhiều, viết nhiều. Ngoài ra, nếu có cơ hội, tốt nhất nên sang nước đó sống một thời gian, như vậy sẽ tiến bộ nhanh hơn. ★ Học ngoại ngữ thế nào sẽ tiến bộ nhanh hơn?',
              },
              {
                text: '现在很多大学生毕业以后不想马上工作，而是先去旅行一段时间，或者继续读研究生。他们认为，先多看看、多学学，以后找工作会更容易。',
                question: '很多大学生毕业以后先做什么？',
                options: ['马上工作', '去旅行或者读研究生', '回老家', '结婚'],
                answer: 1,
                vi: 'Bây giờ nhiều sinh viên tốt nghiệp xong không muốn đi làm ngay, mà đi du lịch một thời gian trước, hoặc học tiếp cao học. Họ cho rằng xem nhiều, học nhiều trước thì sau này tìm việc sẽ dễ hơn. ★ Nhiều sinh viên tốt nghiệp xong làm gì trước?',
              },
              {
                text: '我们这儿的天气很有意思，夏天不太热，冬天也不太冷，一年四季都像春天一样，所以很多人喜欢来这儿旅游。',
                question: '这儿的天气怎么样？',
                options: [
                  '夏天很热',
                  '冬天很冷',
                  '一年四季都很舒服',
                  '经常下雨',
                ],
                answer: 2,
                vi: 'Thời tiết ở chỗ chúng tôi rất thú vị, mùa hè không quá nóng, mùa đông cũng không quá lạnh, quanh năm đều như mùa xuân, nên nhiều người thích đến đây du lịch. ★ Thời tiết ở đây thế nào?',
              },
              {
                text: '上个周末我去看了一场话剧，演员们演得非常好，观众们都很感动。演出结束的时候，大家为他们拍了很长时间的手。',
                question: '观众觉得这场话剧怎么样？',
                options: ['很无聊', '很精彩', '太长了', '看不懂'],
                answer: 1,
                vi: 'Cuối tuần trước tôi đi xem một vở kịch nói, các diễn viên diễn rất hay, khán giả đều rất xúc động. Khi buổi diễn kết thúc, mọi người vỗ tay cho họ rất lâu. ★ Khán giả thấy vở kịch thế nào?',
              },
              {
                text: '很多父母都希望孩子能上最好的学校，所以从小就让孩子学这学那。其实，对孩子来说，最重要的是有一个快乐的童年。',
                question: '说话人认为对孩子来说最重要的是什么？',
                options: [
                  '上最好的学校',
                  '学很多东西',
                  '有一个快乐的童年',
                  '早点儿工作',
                ],
                answer: 2,
                vi: 'Nhiều bố mẹ mong con được học trường tốt nhất, nên từ nhỏ đã cho con học đủ thứ. Thật ra, đối với trẻ con, quan trọng nhất là có một tuổi thơ vui vẻ. ★ Người nói cho rằng với trẻ con điều gì quan trọng nhất?',
                explain:
                  '其实 (thật ra) báo hiệu ý kiến thật của người nói, khác với điều nhiều bố mẹ nghĩ.',
              },
              {
                text: '小张最近在找房子。他看了好几个，有的太贵，有的离公司太远，有的太旧。最后他找到一个离公司近、价格也合适的房子，马上就租下来了。',
                question: '小张最后租的房子怎么样？',
                options: ['很贵', '离公司很远', '很旧', '离公司近，价格合适'],
                answer: 3,
                vi: 'Gần đây Tiểu Trương đang tìm nhà. Anh ấy xem mấy căn, căn thì đắt quá, căn thì xa công ty, căn thì cũ quá. Cuối cùng anh tìm được một căn gần công ty, giá cũng hợp lý, liền thuê ngay. ★ Căn nhà Tiểu Trương thuê cuối cùng thế nào?',
              },
              {
                text: '现在越来越多的人选择在网上看病。只要用手机说清楚自己的情况，医生就能给你一些建议。不过，如果病得比较严重，还是应该去医院。',
                question: '病得比较严重的时候应该怎么做？',
                options: ['在网上看病', '去医院', '自己买药', '多休息'],
                answer: 1,
                vi: 'Bây giờ ngày càng nhiều người chọn khám bệnh trên mạng. Chỉ cần dùng điện thoại nói rõ tình trạng của mình, bác sĩ có thể cho bạn một số lời khuyên. Có điều nếu bệnh khá nặng thì vẫn nên đến bệnh viện. ★ Khi bệnh khá nặng thì nên làm gì?',
              },
              {
                text: VILLAGE,
                question: '说话人小时候怎么去上学？',
                options: ['坐公共汽车', '走路', '骑自行车', '坐火车'],
                answer: 1,
                vi: 'Quê tôi ở một làng nhỏ trên núi, ở đó phong cảnh rất đẹp, không khí cũng trong lành, nhưng giao thông rất bất tiện. Hồi nhỏ ngày nào tôi cũng phải đi bộ hơn một tiếng để đến trường. Sau này làng làm đường, có xe buýt, bây giờ từ làng lên thành phố chỉ mất nửa tiếng. ★ Hồi nhỏ người nói đi học bằng cách nào?',
              },
              {
                text: VILLAGE,
                question: '现在说话人的老家有什么变化？',
                options: ['空气变差了', '交通方便了', '人更少了', '风景更美了'],
                answer: 1,
                vi: '(Cùng đoạn trên) ★ Bây giờ quê của người nói có thay đổi gì?',
                explain:
                  '修了公路，通了公共汽车 — làm đường, có xe buýt ⇒ giao thông thuận tiện hơn.',
              },
              {
                text: HABIT,
                question: '做事马虎的人常常会怎么样？',
                options: ['早睡早起', '忘记带东西', '做事很认真', '很少说话'],
                answer: 1,
                vi: 'Tính cách của một người có quan hệ rất lớn với thói quen của người đó. Ví dụ, người làm việc nghiêm túc thường có thói quen tốt ngủ sớm dậy sớm; còn người làm việc cẩu thả thường hay quên mang chìa khóa, quên nộp bài tập. Vì vậy, nếu muốn thay đổi tính cách, có thể bắt đầu từ việc thay đổi thói quen. ★ Người làm việc cẩu thả thường thế nào?',
              },
              {
                text: HABIT,
                question: '这段话主要告诉我们什么？',
                options: [
                  '要早睡早起',
                  '改变性格可以从改变习惯开始',
                  '钥匙很重要',
                  '作业要按时交',
                ],
                answer: 1,
                vi: '(Cùng đoạn trên) ★ Đoạn văn chủ yếu muốn nói với chúng ta điều gì?',
                explain: '所以 ở câu cuối đưa ra kết luận của cả đoạn.',
              },
              {
                text: PIANO,
                question: '张阿姨在老年大学学什么？',
                options: ['唱歌', '跳舞', '弹钢琴', '画画儿'],
                answer: 2,
                vi: 'Cô Trương năm nay sáu mươi tuổi, sau khi nghỉ làm, cô đăng ký lớp piano ở trường đại học dành cho người cao tuổi. Lúc mới bắt đầu, đến bài hát đơn giản cô cũng đàn không tốt, nhưng ngày nào cô cũng kiên trì luyện hai tiếng. Bây giờ cô đã có thể biểu diễn cho mọi người trong buổi dạ hội. ★ Cô Trương học gì ở đại học người cao tuổi?',
              },
              {
                text: PIANO,
                question: '关于张阿姨，可以知道什么？',
                options: [
                  '今年七十岁',
                  '学得很快',
                  '每天坚持练习',
                  '不喜欢表演',
                ],
                answer: 2,
                vi: '(Cùng đoạn trên) ★ Về cô Trương, có thể biết điều gì?',
                explain:
                  '每天坚持练习两个小时 — ngày nào cũng kiên trì luyện hai tiếng; lúc đầu cô học chưa giỏi nên không phải "học rất nhanh".',
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
                pieces: ['被', '我的自行车', '弟弟', '骑走了'],
                answer: '我的自行车被弟弟骑走了。',
                vi: 'Xe đạp của tôi bị em trai đạp đi mất rồi.',
                explain:
                  'Câu bị động 被: vật bị tác động + 被 + người làm + động từ + thành phần khác.',
              },
              {
                pieces: ['比', '这家饭馆的菜', '那家', '好吃多了'],
                answer: '这家饭馆的菜比那家好吃多了。',
                vi: 'Món ăn của nhà hàng này ngon hơn nhà kia nhiều.',
                explain: 'A + 比 + B + tính từ + 多了.',
              },
              {
                pieces: ['一遍', '请你', '再', '说'],
                answer: '请你再说一遍。',
                vi: 'Bạn hãy nói lại một lần nữa.',
                explain:
                  '再 đứng trước động từ, bổ ngữ số lần 一遍 đứng sau động từ.',
              },
              {
                pieces: ['把', '护照', '放在', '包里了', '我'],
                answer: '我把护照放在包里了。',
                vi: 'Tôi đã để hộ chiếu vào trong túi rồi.',
                explain:
                  'Câu chữ 把: chủ ngữ + 把 + tân ngữ + động từ + 在 + nơi chốn.',
              },
              {
                pieces: ['越来越', '他的汉语', '流利了', '说得'],
                answer: '他的汉语说得越来越流利了。',
                vi: 'Tiếng Trung của anh ấy nói ngày càng lưu loát.',
                explain: 'Động từ + 得 + 越来越 + tính từ.',
              },
              {
                pieces: ['已经', '三年了', '在北京', '他', '住了'],
                answer: '他已经在北京住了三年了。',
                alternatives: ['他在北京已经住了三年了。'],
                vi: 'Anh ấy đã sống ở Bắc Kinh ba năm rồi.',
                explain: 'Thời lượng (三年) đứng sau động từ: 住了三年了.',
              },
              {
                pieces: ['让', '这个消息', '很吃惊', '大家'],
                answer: '这个消息让大家很吃惊。',
                vi: 'Tin này khiến mọi người rất kinh ngạc.',
                explain: 'A + 让 + B + cảm xúc: A khiến B…',
              },
              {
                pieces: ['是', '从', '他', '上海来的'],
                answer: '他是从上海来的。',
                vi: 'Anh ấy đến từ Thượng Hải.',
                explain:
                  'Cấu trúc 是……的 nhấn mạnh nơi chốn: 是 + 从 + nơi + 来的.',
              },
              {
                pieces: ['连', '他', '都没吃', '早饭'],
                answer: '他连早饭都没吃。',
                vi: 'Anh ấy đến bữa sáng cũng chưa ăn.',
                explain: '连……都…… — đến… cũng…',
              },
              {
                pieces: ['得', '这次考试', '他', '考', '很好'],
                answer: '这次考试他考得很好。',
                alternatives: ['他这次考试考得很好。'],
                vi: 'Kỳ thi lần này anh ấy làm rất tốt.',
                explain: 'Bổ ngữ trình độ: động từ + 得 + 很好.',
              },
            ],
          },
          {
            type: 'write-sentence',
            items: [
              {
                picture: P('🏃', 'chạy bộ'),
                word: '跑步',
                answer: '他每天早上都去公园跑步。',
                alternatives: ['跑步对身体很有好处。'],
                vi: 'Sáng nào anh ấy cũng ra công viên chạy bộ.',
              },
              {
                picture: P('🎂', 'bánh sinh nhật'),
                word: '生日',
                answer: '今天是我的生日，朋友们送了我一个大蛋糕。',
                alternatives: ['祝你生日快乐！'],
                vi: 'Hôm nay là sinh nhật tôi, các bạn tặng tôi một chiếc bánh ngọt lớn.',
              },
              {
                picture: P('📚', 'sách'),
                word: '阅读',
                answer: '我每天晚上睡觉前都要阅读半个小时。',
                alternatives: ['阅读能让我们学到很多知识。'],
                vi: 'Tối nào trước khi ngủ tôi cũng đọc sách nửa tiếng.',
              },
              {
                picture: P('😴', 'buồn ngủ'),
                word: '困',
                answer: '他昨天晚上没睡好，今天上课的时候很困。',
                alternatives: ['我太困了，想早点儿睡觉。'],
                vi: 'Tối qua cậu ấy ngủ không ngon, hôm nay trong giờ học rất buồn ngủ.',
              },
              {
                picture: P('🧳', 'vali hành lý'),
                word: '整理',
                answer: '明天就要去旅行了，她正在整理东西。',
                alternatives: ['出发以前，我把东西整理好了。'],
                vi: 'Ngày mai sắp đi du lịch rồi, cô ấy đang sắp xếp đồ đạc.',
              },
            ],
          },
        ],
      },
    ],
  },
];
