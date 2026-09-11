/**
 * Giải thích cho các mục "句子的类型/句子成分/固定格式/特殊表达法" HSK4 trong đại
 * cương chính thức (grammar-syllabus.raw.json) — tức các CẤU TRÚC CÂU thật sự,
 * khác với các mục "词类/短语" chỉ là danh sách từ vựng theo từ loại (không cần
 * giải thích riêng từng mục, giữ nguyên dạng rút gọn).
 *
 * Khớp bằng `content` (nguyên văn tiếng Trung trong raw.json) — seedGrammarSyllabus
 * tra map này, có thì dùng giải thích thật, không có thì giữ mục dạng rút gọn (flat).
 */
export interface ExplainedEntry {
  explanationVi: string;
  patterns: string[];
  examples: { zh: string; vi: string }[];
}

export const HSK4_EXPLAINED: Record<string, ExplainedEntry> = {
  '一+量词+比+一+量词': {
    explanationVi:
      'Lặp lại "một + lượng từ + 比 + một + lượng từ" để diễn tả mức độ tăng/giảm dần liên tục theo thời gian — "ngày càng...", "mỗi lúc một...".',
    patterns: ['một + LT + 比 + một + LT + tính từ/động từ'],
    examples: [
      { zh: '天气一天比一天冷。', vi: 'Thời tiết ngày càng lạnh.' },
      {
        zh: '他的汉语一年比一年好。',
        vi: 'Tiếng Trung của anh ấy mỗi năm một tiến bộ.',
      },
    ],
  },
  '在……方面': {
    explanationVi:
      '在 + danh từ/cụm từ + 方面: nêu phạm vi, khía cạnh đang bàn tới — "về mặt...", "trong lĩnh vực...".',
    patterns: ['在 + Danh từ + 方面'],
    examples: [
      {
        zh: '在学习方面，他一直很努力。',
        vi: 'Về mặt học tập, anh ấy luôn rất chăm chỉ.',
      },
      {
        zh: '这个项目在技术方面还有问题。',
        vi: 'Dự án này về mặt kỹ thuật vẫn còn vấn đề.',
      },
    ],
  },
  '够……的': {
    explanationVi:
      '够 + tính từ/động từ + 的: khẩu ngữ, nhấn mạnh mức độ cao — "đủ... rồi", "khá là...". Thường mang sắc thái than thở nhẹ.',
    patterns: ['够 + Tính từ + 的'],
    examples: [
      { zh: '今天的天气够热的。', vi: 'Thời tiết hôm nay đủ nóng rồi.' },
      {
        zh: '这条路够远的，走了一个小时。',
        vi: 'Con đường này khá xa, đi mất một tiếng.',
      },
    ],
  },
  '拿……来说': {
    explanationVi:
      '拿 + đối tượng + 来说: đưa ra ví dụ cụ thể để minh họa — "lấy... mà nói", "nói riêng về...".',
    patterns: ['拿 + Danh từ + 来说'],
    examples: [
      {
        zh: '拿中文来说，声调是最难的部分。',
        vi: 'Lấy tiếng Trung mà nói, thanh điệu là phần khó nhất.',
      },
      {
        zh: '拿他来说，从来没迟到过。',
        vi: 'Nói riêng về anh ấy, chưa bao giờ đi trễ.',
      },
    ],
  },
  '再也不/没……': {
    explanationVi:
      '再也不/没 + động từ: nhấn mạnh một hành động sẽ/đã không xảy ra thêm lần nào nữa — "không bao giờ... nữa".',
    patterns: ['再也不/没 + Động từ'],
    examples: [
      {
        zh: '他说再也不抽烟了。',
        vi: 'Anh ấy nói sẽ không bao giờ hút thuốc nữa.',
      },
      {
        zh: '从那以后，我再也没见过她。',
        vi: 'Từ đó, tôi không bao giờ gặp lại cô ấy nữa.',
      },
    ],
  },
  '怎么都/也+不/没……': {
    explanationVi:
      '怎么都/也 + 不/没 + động từ: dù thử cách nào cũng không được — "dù thế nào cũng không...".',
    patterns: ['怎么都/也 + 不/没 + Động từ'],
    examples: [
      {
        zh: '这道题我怎么都做不出来。',
        vi: 'Bài này dù thế nào tôi cũng không làm ra được.',
      },
      {
        zh: '他怎么也不肯说出真相。',
        vi: 'Anh ta dù thế nào cũng không chịu nói ra sự thật.',
      },
    ],
  },
  '为了……而……': {
    explanationVi:
      '为了 + mục đích + 而 + hành động: nêu rõ mục đích của hành động, văn phong trang trọng hơn 为了...就....',
    patterns: ['为了 + Mục đích + 而 + Động từ'],
    examples: [
      {
        zh: '他为了理想而努力奋斗。',
        vi: 'Anh ấy vì lý tưởng mà nỗ lực phấn đấu.',
      },
      { zh: '不要为了钱而放弃健康。', vi: 'Đừng vì tiền mà từ bỏ sức khỏe.' },
    ],
  },
  '动词+一X是一X': {
    explanationVi:
      'Động từ + một + lượng từ/danh từ + 是 + một + lượng từ/danh từ: làm việc gì đó một cách nghiêm túc, dứt khoát, không qua loa — "làm đâu ra đấy".',
    patterns: ['Động từ + 一X + 是 + 一X'],
    examples: [
      {
        zh: '他做事一是一，认真负责。',
        vi: 'Anh ấy làm việc đâu ra đấy, nghiêm túc có trách nhiệm.',
      },
    ],
  },
  '（没）有什么（好）X的': {
    explanationVi:
      '（没）有什么（好）+ động từ/tính từ + 的: câu hỏi tu từ mang tính phủ nhận, cho rằng việc gì đó không đáng để làm/lo — "có gì mà phải...".',
    patterns: ['（没）有什么（好）+ Động từ/Tính từ + 的'],
    examples: [
      { zh: '这有什么好担心的？', vi: 'Cái này có gì mà phải lo lắng?' },
      {
        zh: '没有什么好客气的，都是自己人。',
        vi: 'Không có gì phải khách sáo, đều là người nhà cả.',
      },
    ],
  },
  'X是X，Y是Y': {
    explanationVi:
      'Lặp cấu trúc "X是X" để khẳng định X và Y là hai việc tách biệt, không nên lẫn lộn — "X ra X, Y ra Y".',
    patterns: ['X + 是 + X，Y + 是 + Y'],
    examples: [
      {
        zh: '工作是工作，生活是生活，不要混在一起。',
        vi: 'Công việc ra công việc, cuộc sống ra cuộc sống, đừng lẫn lộn.',
      },
    ],
  },
  'X也得X，不X也得X': {
    explanationVi:
      'X + 也得 + X，不X + 也得 + X: nhấn mạnh việc bắt buộc phải làm, dù muốn hay không — "dù có muốn hay không cũng phải...".',
    patterns: ['X也得X，不X也得X'],
    examples: [
      {
        zh: '这个任务，你去也得去，不去也得去。',
        vi: 'Nhiệm vụ này, cậu dù muốn hay không cũng phải đi.',
      },
    ],
  },
  X就是了: {
    explanationVi:
      'X + 就是了: khẩu ngữ, trấn an rằng chỉ cần làm X là đủ, mọi thứ sẽ ổn — "cứ X là được".',
    patterns: ['Động từ/Câu + 就是了'],
    examples: [
      {
        zh: '有问题你问我就是了。',
        vi: 'Có vấn đề gì cậu cứ hỏi tôi là được.',
      },
    ],
  },
  还X呢: {
    explanationVi:
      '还 + động từ/tính từ + 呢: khẩu ngữ mang sắc thái mỉa mai, phản bác lại điều vừa nghe — "còn... cơ đấy", "còn dám...".',
    patterns: ['还 + Động từ/Tính từ + 呢'],
    examples: [
      {
        zh: '你还说呢，都是你的错！',
        vi: 'Cậu còn nói cơ đấy, đều là lỗi của cậu!',
      },
    ],
  },
  你X你的吧: {
    explanationVi:
      '你 + động từ + 你的 + 吧: cho phép/mặc kệ người khác làm việc của họ, mình không can thiệp — "cậu cứ X đi".',
    patterns: ['你 + Động từ + 你的 + 吧'],
    examples: [
      { zh: '你玩你的吧，我先走了。', vi: 'Cậu cứ chơi đi, tôi đi trước đây.' },
    ],
  },
  '让/叫你X你就X': {
    explanationVi:
      '让/叫 你 + X + 你就 + X: nhấn mạnh sự vâng lời tuyệt đối, được bảo làm gì thì làm nấy (đôi khi mang sắc thái bực bội).',
    patterns: ['让/叫你X，你就X'],
    examples: [
      {
        zh: '让你走你就走，别问那么多。',
        vi: 'Bảo cậu đi thì cứ đi, đừng hỏi nhiều thế.',
      },
    ],
  },
  '说什么/怎么（着）也得X': {
    explanationVi:
      '说什么/怎么（着）也得 + động từ: nhấn mạnh quyết tâm, dù thế nào cũng phải làm bằng được — "nói gì thì nói cũng phải...".',
    patterns: ['说什么/怎么（着）也得 + Động từ'],
    examples: [
      {
        zh: '这次说什么也得赢。',
        vi: 'Lần này nói gì thì nói cũng phải thắng.',
      },
    ],
  },
  'X就X（点儿）吧': {
    explanationVi:
      'X + 就 + X（点儿）+ 吧: chấp nhận miễn cưỡng, thôi thì đành chịu vậy — "X thì X vậy".',
    patterns: ['X就X（点儿）吧'],
    examples: [
      {
        zh: '贵就贵点儿吧，质量好就行。',
        vi: 'Đắt thì đắt một chút vậy, chất lượng tốt là được.',
      },
    ],
  },
  X是X: {
    explanationVi:
      'X + 是 + X: thừa nhận X đúng là như vậy, nhưng thường kèm theo một ý "tuy nhiên..." phía sau (nhượng bộ).',
    patterns: ['X是X（，不过/但是……）'],
    examples: [
      {
        zh: '好是好，就是有点儿贵。',
        vi: 'Tốt thì tốt đấy, chỉ là hơi đắt một chút.',
      },
    ],
  },
  '形容词/心理动词+死了/厉害': {
    explanationVi:
      'Tính từ/động từ tâm lý + 死了/厉害: bổ ngữ mức độ khẩu ngữ, diễn tả mức độ cực cao, phóng đại — "...chết đi được", "...kinh khủng".',
    patterns: ['Tính từ/Động từ tâm lý + 死了/厉害'],
    examples: [
      { zh: '今天热死了。', vi: 'Hôm nay nóng chết đi được.' },
      { zh: '我担心死了。', vi: 'Tôi lo lắng kinh khủng.' },
    ],
  },
  '动词+得/不+了': {
    explanationVi:
      'Động từ + 得/不 + 了 (liǎo): bổ ngữ khả năng, diễn tả có/không có khả năng hoàn thành hành động về mặt khách quan (không phải kỹ năng).',
    patterns: ['Động từ + 得/不 + 了'],
    examples: [
      {
        zh: '这么多菜，我们俩吃得了吗？',
        vi: 'Nhiều món thế này, hai chúng ta ăn hết được không?',
      },
      { zh: '东西太重，我拿不了。', vi: 'Đồ nặng quá, tôi không cầm nổi.' },
    ],
  },
  '难道……吗？': {
    explanationVi:
      '难道…… 吗？: câu hỏi tu từ (phản vấn) nhấn mạnh, người nói thực ra đã có câu trả lời rồi — "chẳng lẽ... sao?".',
    patterns: ['难道 + Câu + 吗？'],
    examples: [{ zh: '难道你忘了吗？', vi: 'Chẳng lẽ cậu quên rồi sao?' }],
  },
  由疑问代词构成的反问句: {
    explanationVi:
      'Dùng đại từ nghi vấn (谁, 什么, 哪儿, 怎么…) trong câu không nhằm hỏi thật, mà để phủ định/nhấn mạnh — ví dụ 谁知道 nghĩa là "chẳng ai biết".',
    patterns: ['谁/什么/哪儿/怎么 + …（phản vấn）'],
    examples: [
      { zh: '这件事谁不知道啊？', vi: 'Việc này ai mà chẳng biết chứ?' },
      {
        zh: '我哪儿有时间做这个？',
        vi: 'Tôi làm gì có thời gian làm cái này?',
      },
    ],
  },
  '（1）主语+把+宾语+动词（+一/了）+动词': {
    explanationVi:
      'Câu chữ 把 với động từ lặp lại (thường thêm 一 hoặc 了 ở giữa): diễn tả hành động xử lý tân ngữ một cách nhẹ nhàng, thử làm.',
    patterns: ['S + 把 + O + V(一/了) + V'],
    examples: [
      {
        zh: '你把这个问题想一想。',
        vi: 'Bạn hãy suy nghĩ kỹ vấn đề này một chút.',
      },
    ],
  },
  '（2）主语+把+宾语+动词+了': {
    explanationVi:
      'Câu chữ 把 cơ bản với 了 cuối câu: nhấn mạnh tân ngữ đã bị xử lý xong, thay đổi trạng thái hoàn toàn.',
    patterns: ['S + 把 + O + V + 了'],
    examples: [{ zh: '我把作业做完了。', vi: 'Tôi đã làm xong bài tập rồi.' }],
  },
  '（3）主语+把+宾语+动词+动量补语/时量补语': {
    explanationVi:
      'Câu chữ 把 với bổ ngữ số lần/thời lượng sau động từ: diễn tả tân ngữ bị tác động trong bao lâu/mấy lần.',
    patterns: ['S + 把 + O + V + bổ ngữ động lượng/thời lượng'],
    examples: [
      {
        zh: '他把这本书看了两遍。',
        vi: 'Anh ấy đã đọc cuốn sách này hai lần.',
      },
    ],
  },
  '（4）主语+把+宾语+状语+动词': {
    explanationVi:
      'Câu chữ 把 với trạng ngữ (cách thức) chen giữa 宾语 và động từ: miêu tả CÁCH thức tân ngữ bị xử lý.',
    patterns: ['S + 把 + O + trạng ngữ + V'],
    examples: [
      {
        zh: '请把房间好好打扫一下。',
        vi: 'Làm ơn dọn dẹp phòng thật kỹ giúp tôi.',
      },
    ],
  },
  '主语+叫/让+宾语+动词+其他成分': {
    explanationVi:
      'Câu bị động khẩu ngữ dùng 叫/让 thay cho 被 — chủ ngữ (đối tượng chịu tác động) + 叫/让 + tác nhân + động từ. Thông dụng trong lời nói hằng ngày hơn 被.',
    patterns: ['S(bị tác động) + 叫/让 + tác nhân + V + …'],
    examples: [
      {
        zh: '我的自行车叫人骑走了。',
        vi: 'Xe đạp của tôi bị ai đó lấy mất rồi.',
      },
      { zh: '衣服让雨淋湿了。', vi: 'Quần áo bị mưa làm ướt hết.' },
    ],
  },
  '（1）表爱憎义：主语+表扬/批评+宾语1+动词+宾语2': {
    explanationVi:
      'Câu kiêm ngữ diễn tả khen/chê: chủ ngữ 1 + động từ khen-chê (表扬/批评…) + tân ngữ 1 (cũng là chủ ngữ của động từ sau) + động từ 2 + tân ngữ 2.',
    patterns: ['S1 + 表扬/批评 + O1 + V2 + O2'],
    examples: [
      {
        zh: '老师表扬他学习努力。',
        vi: 'Thầy giáo khen cậu ấy học tập chăm chỉ.',
      },
    ],
  },
  '（2）表称谓或认定义：主语+收/选+宾语1+做/当/为+宾语2': {
    explanationVi:
      'Câu kiêm ngữ diễn tả sự bổ nhiệm/công nhận: S + 收/选/称 + O1 + 做/当/为 + O2 (O1 vừa là tân ngữ của động từ trước, vừa là chủ ngữ của "làm O2").',
    patterns: ['S + 收/选 + O1 + 做/当/为 + O2'],
    examples: [
      { zh: '大家选他当班长。', vi: 'Mọi người bầu cậu ấy làm lớp trưởng.' },
    ],
  },
  '（3）表致使：主语+使/让+人称代词+动词短语': {
    explanationVi:
      'Câu kiêm ngữ diễn tả nguyên nhân-kết quả: S + 使/让 + đại từ nhân xưng + cụm động từ, diễn tả S khiến cho đối tượng có trạng thái/hành động đó.',
    patterns: ['S + 使/让 + đại từ + cụm động từ'],
    examples: [
      { zh: '这个消息使我很高兴。', vi: 'Tin tức này khiến tôi rất vui.' },
    ],
  },
  '（1）A不如B（+形容词）': {
    explanationVi:
      'A + 不如 + B (+ tính từ): so sánh A kém hơn B ở một phương diện nào đó — "A không bằng B".',
    patterns: ['A + 不如 + B (+ tính từ)'],
    examples: [
      { zh: '走路不如骑车快。', vi: 'Đi bộ không nhanh bằng đi xe đạp.' },
    ],
  },
  '（2）跟……相比': {
    explanationVi:
      '跟 + đối tượng + 相比: nêu đối tượng dùng để so sánh — "so với...".',
    patterns: ['跟 + Danh từ + 相比'],
    examples: [
      {
        zh: '跟去年相比，今年的销量增加了。',
        vi: 'So với năm ngoái, doanh số năm nay đã tăng.',
      },
    ],
  },
  用双重否定表示强调: {
    explanationVi:
      'Dùng hai từ phủ định liên tiếp (不能不, 不得不, 没有不…) để nhấn mạnh ý khẳng định — "không thể không...", ý nghĩa mạnh hơn câu khẳng định thông thường.',
    patterns: ['不能不/不得不/没有不 + …'],
    examples: [
      { zh: '这件事你不能不知道。', vi: 'Việc này cậu không thể không biết.' },
      {
        zh: '他不得不同意这个计划。',
        vi: 'Anh ấy không thể không đồng ý kế hoạch này.',
      },
    ],
  },
  '不是……，而是……': {
    explanationVi:
      'Câu ghép song song phủ định-khẳng định: phủ nhận vế trước, khẳng định vế đúng ở sau — "không phải là..., mà là...".',
    patterns: ['不是A，而是B'],
    examples: [
      {
        zh: '这不是他的错，而是我的错。',
        vi: 'Đây không phải lỗi của anh ấy, mà là lỗi của tôi.',
      },
    ],
  },
  '既……，又/也……': {
    explanationVi:
      'Câu ghép song song: nêu hai đặc điểm/hành động cùng tồn tại — "vừa..., vừa...".',
    patterns: ['既A，又/也B'],
    examples: [
      {
        zh: '这个房间既宽敞又明亮。',
        vi: 'Căn phòng này vừa rộng rãi vừa sáng sủa.',
      },
    ],
  },
  '一方面……，另一方面……': {
    explanationVi:
      'Câu ghép song song: nêu hai mặt/khía cạnh của cùng một vấn đề — "một mặt..., mặt khác...".',
    patterns: ['一方面A，另一方面B'],
    examples: [
      {
        zh: '他一方面要工作，另一方面要照顾家庭。',
        vi: 'Anh ấy một mặt phải làm việc, mặt khác phải chăm sóc gia đình.',
      },
    ],
  },
  '首先……，其次……': {
    explanationVi:
      'Câu ghép tiếp nối liệt kê thứ tự các bước/lý do — "trước tiên..., tiếp theo...".',
    patterns: ['首先A，其次B'],
    examples: [
      {
        zh: '首先我们要收集资料，其次进行分析。',
        vi: 'Trước tiên chúng ta cần thu thập tư liệu, tiếp theo tiến hành phân tích.',
      },
    ],
  },
  '首先……，然后……': {
    explanationVi:
      'Câu ghép tiếp nối diễn tả trình tự thời gian các bước — "trước tiên..., sau đó...".',
    patterns: ['首先A，然后B'],
    examples: [
      {
        zh: '首先打开电脑，然后输入密码。',
        vi: 'Trước tiên bật máy tính, sau đó nhập mật khẩu.',
      },
    ],
  },
  '……，于是……': {
    explanationVi:
      '于是: nối hai vế câu, vế sau là kết quả/hành động tiếp theo tự nhiên xảy ra sau vế trước — "vì thế, rồi thì".',
    patterns: ['A，于是B'],
    examples: [
      {
        zh: '下雨了，于是我们改在室内进行。',
        vi: 'Trời mưa rồi, thế nên chúng tôi đổi sang làm trong nhà.',
      },
    ],
  },
  '……,甚至……': {
    explanationVi:
      '甚至: nối vế sau để nhấn mạnh mức độ vượt xa hơn vế trước, gây bất ngờ — "thậm chí".',
    patterns: ['A，甚至B'],
    examples: [
      {
        zh: '他每天工作十个小时，甚至周末也不休息。',
        vi: 'Anh ấy mỗi ngày làm việc mười tiếng, thậm chí cuối tuần cũng không nghỉ.',
      },
    ],
  },
  '不仅/不光……，还/而且……': {
    explanationVi:
      'Câu ghép tăng tiến: vế sau bổ sung thêm, mức độ cao hơn vế trước — "không những..., mà còn...".',
    patterns: ['不仅/不光A，还/而且B'],
    examples: [
      {
        zh: '她不仅漂亮，而且很聪明。',
        vi: 'Cô ấy không những xinh đẹp, mà còn rất thông minh.',
      },
    ],
  },
  '……，并且……': {
    explanationVi:
      '并且: nối hai vế câu có quan hệ tăng tiến, bổ sung thêm thông tin, mang tính trang trọng — "và, hơn nữa".',
    patterns: ['A，并且B'],
    examples: [
      {
        zh: '这个方案可行，并且成本较低。',
        vi: 'Phương án này khả thi, hơn nữa chi phí khá thấp.',
      },
    ],
  },
  '连……也/都……，……更……': {
    explanationVi:
      'Câu ghép tăng tiến với 连…也/都 nhấn mạnh trường hợp cực đoan, sau đó 更 nâng mức độ lên cao hơn nữa.',
    patterns: ['连A也/都B，……更C'],
    examples: [
      {
        zh: '连小孩都懂，大人更应该懂。',
        vi: 'Trẻ con còn hiểu, người lớn càng phải hiểu.',
      },
    ],
  },
  '不是……，就是……': {
    explanationVi:
      'Câu ghép lựa chọn: nêu hai khả năng, ít nhất một trong hai là đúng — "không phải... thì là...".',
    patterns: ['不是A，就是B'],
    examples: [
      {
        zh: '他不是在图书馆，就是在教室。',
        vi: 'Anh ấy không ở thư viện thì ở lớp học.',
      },
    ],
  },
  '尽管……，但是/可是……': {
    explanationVi:
      'Câu ghép chuyển ý (nhượng bộ): thừa nhận thực tế ở vế trước, nhưng vế sau vẫn giữ ý kiến/kết quả khác — "mặc dù..., nhưng...".',
    patterns: ['尽管A，但是/可是B'],
    examples: [
      {
        zh: '尽管很累，但是他还是坚持完成了工作。',
        vi: 'Mặc dù rất mệt, nhưng anh ấy vẫn kiên trì hoàn thành công việc.',
      },
    ],
  },
  '……，然而……': {
    explanationVi:
      '然而: nối hai vế câu có ý nghĩa trái ngược, mang tính trang trọng, văn viết hơn 但是 — "tuy nhiên".',
    patterns: ['A，然而B'],
    examples: [
      {
        zh: '计划很完美，然而现实却很复杂。',
        vi: 'Kế hoạch rất hoàn hảo, tuy nhiên thực tế lại rất phức tạp.',
      },
    ],
  },
  '……，不过……': {
    explanationVi:
      '不过: nối hai vế câu chuyển ý nhẹ nhàng hơn 但是, thường bổ sung một ý nhỏ, không hoàn toàn phủ định vế trước — "chỉ có điều...".',
    patterns: ['A，不过B'],
    examples: [
      {
        zh: '这个主意不错，不过还需要再讨论一下。',
        vi: 'Ý tưởng này khá hay, chỉ có điều cần bàn thêm một chút.',
      },
    ],
  },
  '……X是X，就是/不过……': {
    explanationVi:
      'X是X kết hợp với 就是/不过 ở sau: thừa nhận X đúng như vậy, nhưng nêu ra một điểm hạn chế/khác biệt — "X thì đúng là X, chỉ có điều...".',
    patterns: ['X是X，就是/不过……'],
    examples: [
      {
        zh: '便宜是便宜，就是质量一般。',
        vi: 'Rẻ thì đúng là rẻ, chỉ có điều chất lượng bình thường.',
      },
    ],
  },
  '……，否则……': {
    explanationVi:
      '否则: nêu điều kiện giả định trái ngược với vế trước và hậu quả nếu không tuân theo — "nếu không thì...".',
    patterns: ['A，否则B'],
    examples: [
      {
        zh: '你得快点儿，否则就迟到了。',
        vi: 'Cậu phải nhanh lên, nếu không thì sẽ trễ đấy.',
      },
    ],
  },
  '要是……，就……': {
    explanationVi:
      'Câu ghép giả thiết khẩu ngữ: nêu điều kiện giả định và kết quả — "nếu... thì...". 要是 thông dụng hơn trong lời nói so với 如果.',
    patterns: ['要是A，就B'],
    examples: [
      {
        zh: '要是明天不下雨，我们就去爬山。',
        vi: 'Nếu mai không mưa, chúng ta sẽ đi leo núi.',
      },
    ],
  },
  '要是……，（就）……，否则……': {
    explanationVi:
      'Kết hợp giả thiết 要是...就... với 否则 nêu thêm hậu quả nếu điều kiện KHÔNG xảy ra.',
    patterns: ['要是A，（就）B，否则C'],
    examples: [
      {
        zh: '要是有空，就来找我，否则我们下次再约。',
        vi: 'Nếu rảnh thì đến tìm tôi, nếu không thì lần sau ta hẹn lại.',
      },
    ],
  },
  '不管……，都/也……': {
    explanationVi:
      'Câu ghép điều kiện (vô điều kiện): 不管 + điều kiện bất kỳ (thường có đại từ nghi vấn hoặc lựa chọn) + 都/也 + kết quả không đổi — "bất kể... đều...".',
    patterns: ['不管A，都/也B'],
    examples: [
      {
        zh: '不管天气怎么样，比赛都会照常进行。',
        vi: 'Bất kể thời tiết thế nào, trận đấu vẫn diễn ra như thường.',
      },
    ],
  },
  '无论……，都/也……': {
    explanationVi:
      'Tương tự 不管…都/也…, nhưng 无论 trang trọng hơn, thường dùng trong văn viết — "vô luận... đều...".',
    patterns: ['无论A，都/也B'],
    examples: [
      {
        zh: '无论遇到什么困难，他都不会放弃。',
        vi: 'Vô luận gặp khó khăn gì, anh ấy cũng sẽ không bỏ cuộc.',
      },
    ],
  },
  '既然……，就……': {
    explanationVi:
      'Câu ghép nhân quả: 既然 nêu một thực tế đã biết/đã xảy ra, 就 nêu kết luận/hành động hợp lý theo sau — "đã... thì...".',
    patterns: ['既然A，就B'],
    examples: [
      {
        zh: '既然你已经决定了，就好好去做吧。',
        vi: 'Đã quyết định rồi thì cứ làm cho tốt đi.',
      },
    ],
  },
  '（由于）……，因此……': {
    explanationVi:
      'Câu ghép nhân quả trang trọng: (由于) nêu nguyên nhân, 因此 nêu kết quả — "do..., vì thế...".',
    patterns: ['（由于）A，因此B'],
    examples: [
      {
        zh: '由于交通堵塞，因此他迟到了半个小时。',
        vi: 'Do tắc đường, vì thế anh ấy đã đến trễ nửa tiếng.',
      },
    ],
  },
  '……，好……': {
    explanationVi:
      'Câu ghép mục đích: vế sau bắt đầu bằng 好 nêu mục đích thuận tiện cho việc gì đó — "để tiện cho...".',
    patterns: ['A，好B'],
    examples: [
      {
        zh: '把地址写下来，好以后能找到。',
        vi: 'Ghi địa chỉ lại, để sau này còn tìm được.',
      },
    ],
  },
  '即使……，也……': {
    explanationVi:
      'Câu ghép nhượng bộ giả định: 即使 nêu tình huống giả định (dù thật hay chưa xảy ra), 也 nêu kết quả không đổi — "dù cho... cũng...".',
    patterns: ['即使A，也B'],
    examples: [
      { zh: '即使下大雨，他也会来。', vi: 'Dù mưa to anh ấy cũng sẽ đến.' },
    ],
  },
  '就是……，也……': {
    explanationVi:
      'Tương tự 即使…也…, mang tính khẩu ngữ hơn — "cho dù... cũng...".',
    patterns: ['就是A，也B'],
    examples: [
      {
        zh: '就是再忙，我也要抽时间锻炼。',
        vi: 'Cho dù có bận đến đâu, tôi cũng phải dành thời gian tập luyện.',
      },
    ],
  },
  无标记: {
    explanationVi:
      'Câu rút gọn (紧缩句) không dùng từ nối rõ ràng — hai vế đặt liền nhau, quan hệ ngữ nghĩa (điều kiện, nhân quả…) được hiểu ngầm qua ngữ cảnh.',
    patterns: ['A，B（không có liên từ）'],
    examples: [{ zh: '有困难找警察。', vi: 'Có khó khăn thì tìm cảnh sát.' }],
  },
  '不……也……': {
    explanationVi:
      'Câu rút gọn: 不 + động từ/tính từ + 也 + động từ/tính từ, hai vế đặt sát nhau không cần thêm liên từ khác — "không... cũng...".',
    patterns: ['不A也B'],
    examples: [{ zh: '不说也知道。', vi: 'Không nói cũng biết.' }],
  },
  '概数表示法3：数词+来+量词': {
    explanationVi:
      'Số từ + 来 + lượng từ: diễn tả số lượng ước chừng, xấp xỉ con số đó — "khoảng, chừng".',
    patterns: ['Số từ + 来 + Lượng từ'],
    examples: [
      { zh: '他今年二十来岁。', vi: 'Năm nay anh ấy khoảng hai mươi tuổi.' },
    ],
  },
  '用“大约、左右、前后”表示概数': {
    explanationVi:
      '大约 đặt trước số từ, 左右/前后 đặt sau số từ: đều diễn tả số lượng/thời điểm ước chừng — "khoảng, tầm".',
    patterns: ['大约 + số từ', 'số từ + 左右/前后'],
    examples: [
      {
        zh: '大约三十个人参加了会议。',
        vi: 'Khoảng ba mươi người đã tham gia cuộc họp.',
      },
      { zh: '他八点左右到。', vi: 'Anh ấy đến vào khoảng tám giờ.' },
    ],
  },
  '小数、分数、百分数、倍数的表示法': {
    explanationVi:
      'Cách đọc số thập phân (点), phân số (分之), phần trăm (百分之), số lần/bội số (倍) trong tiếng Trung.',
    patterns: [
      '点 (thập phân)',
      'B分之A (phân số A/B)',
      '百分之N (N%)',
      '数词 + 倍 (gấp N lần)',
    ],
    examples: [
      {
        zh: '三点五 (3.5)，三分之一 (1/3)，百分之五十 (50%)。',
        vi: 'ba phẩy năm, một phần ba, năm mươi phần trăm.',
      },
      {
        zh: '今年的销量是去年的两倍。',
        vi: 'Doanh số năm nay gấp đôi năm ngoái.',
      },
    ],
  },
};
