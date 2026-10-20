/**
 * Giải thích cho các mục "句子的类型/句子成分/固定格式/特殊表达法/语段（句群）" HSK7-9
 * trong đại cương chính thức — cùng cách làm với grammar-explained-hsk4.ts.
 * Đây là cấp cao nhất, nhiều mục mang tính văn viết/trang trọng hoặc tổ chức
 * đoạn văn (không còn là mẫu câu đơn lẻ) — giải thích ngắn gọn hơn phù hợp bản chất.
 */
import type { ExplainedEntry } from './grammar-explained-hsk4';

export const HSK7_EXPLAINED: Record<string, ExplainedEntry> = {
  'X到这个地步/份上': {
    explanationVi:
      'X到这个地步/份上: nhấn mạnh sự việc đã đạt tới mức độ nghiêm trọng/cực đoan — "đến mức này/nông nỗi này".',
    patterns: ['X + 到 + 这个地步/份上'],
    examples: [
      {
        zh: '事情都到这个地步了，还有什么好说的。',
        vi: 'Sự việc đã đến nông nỗi này rồi, còn gì để nói nữa.',
      },
    ],
  },
  'X得要命/要死': {
    explanationVi:
      'X得要命/要死: bổ ngữ mức độ khẩu ngữ, cực kỳ phóng đại — "...chết đi được", "kinh khủng".',
    patterns: ['Tính từ + 得要命/要死'],
    examples: [{ zh: '今天热得要命。', vi: 'Hôm nay nóng chết đi được.' }],
  },
  'X都不/没X': {
    explanationVi:
      'X都不/没X: dùng 都 nhấn mạnh phủ định tuyệt đối — "X cũng không/chẳng...".',
    patterns: ['X + 都 + 不/没 + X'],
    examples: [
      { zh: '他连一句话都没说。', vi: 'Anh ấy đến một câu cũng không nói.' },
    ],
  },
  X就X个Y: {
    explanationVi:
      'X就X个Y: chấp nhận làm X, mục đích/kết quả chỉ để đạt Y (thường là điều nhỏ nhặt) — "X thì X, cốt để có được Y".',
    patterns: ['X + 就 + X + 个 + Y'],
    examples: [
      {
        zh: '忙就忙个开心，不然图什么呢。',
        vi: 'Bận thì bận, cốt để vui, không thì bận vì cái gì chứ.',
      },
    ],
  },
  'X了Y，Y了X': {
    explanationVi:
      'X了Y，Y了X: diễn tả hai hành động/đối tượng tác động qua lại lẫn nhau liên tục — "X Y rồi lại Y X".',
    patterns: ['X了Y，Y了X'],
    examples: [
      {
        zh: '两个人吵了骂，骂了吵，谁也不肯让步。',
        vi: 'Hai người cãi rồi mắng, mắng rồi cãi, chẳng ai chịu nhường ai.',
      },
    ],
  },
  'X也好，Y也罢': {
    explanationVi:
      'X也好，Y也罢: liệt kê các khả năng/lựa chọn với thái độ dứt khoát rằng dù là gì cũng không ảnh hưởng tới kết luận sau — "X cũng được, Y cũng thôi (đều không quan trọng)".',
    patterns: ['X也好，Y也罢，……'],
    examples: [
      {
        zh: '同意也好，反对也罢，决定已经做出了。',
        vi: 'Đồng ý cũng được, phản đối cũng thôi, quyết định đã được đưa ra rồi.',
      },
    ],
  },
  '别提（有）多+形容词+了': {
    explanationVi:
      '别提（有）多+tính từ+了: cảm thán khẩu ngữ nhấn mạnh mức độ cực cao, "khỏi phải nói" — "...không biết bao nhiêu mà kể".',
    patterns: ['别提（有）多 + Tính từ + 了'],
    examples: [
      {
        zh: '考上理想的大学，他别提有多高兴了。',
        vi: 'Thi đỗ vào trường đại học mơ ước, anh ấy vui không biết bao nhiêu mà kể.',
      },
    ],
  },
  '不亚于……': {
    explanationVi:
      '不亚于……: so sánh trang trọng, khẳng định không hề kém hơn đối tượng được so sánh — "không kém gì...", "chẳng thua...".',
    patterns: ['不亚于 + Danh từ/Cụm từ'],
    examples: [
      {
        zh: '她的水平不亚于专业选手。',
        vi: 'Trình độ của cô ấy không kém gì vận động viên chuyên nghiệp.',
      },
    ],
  },
  '不知X是/才好': {
    explanationVi:
      '不知X是/才好: diễn tả sự lúng túng, không biết nên lựa chọn/phản ứng thế nào — "không biết nên... mới phải".',
    patterns: ['不知 + Động từ/Tính từ + 是/才好'],
    examples: [
      {
        zh: '听到这个消息，我真不知该高兴还是难过才好。',
        vi: 'Nghe tin này, tôi thực không biết nên vui hay buồn nữa.',
      },
    ],
  },
  '动不动就……': {
    explanationVi:
      '动不动就……: diễn tả một hành động/phản ứng (thường tiêu cực) xảy ra quá dễ dàng, thường xuyên, chỉ cần một cớ nhỏ — "hơi một tí là...", "động tí là...".',
    patterns: ['动不动就 + Động từ'],
    examples: [
      { zh: '他动不动就发脾气。', vi: 'Anh ấy hơi một tí là nổi giận.' },
    ],
  },
  '动词+得个……': {
    explanationVi:
      'Động từ + 得个 + kết quả: khẩu ngữ, diễn tả hành động dẫn tới một kết cục nào đó (thường không như ý) — "làm để rồi được cái...".',
    patterns: ['Động từ + 得个 + Kết quả'],
    examples: [
      {
        zh: '他辛苦一场，落得个两手空空。',
        vi: 'Anh ấy vất vả cả buổi, để rồi chẳng được gì cả.',
      },
    ],
  },
  '动词+个X': {
    explanationVi:
      'Động từ + 个 + X: khẩu ngữ, 个 chen giữa động từ và tân ngữ/bổ ngữ để nhấn mạnh tính tùy hứng, nhẹ nhàng của hành động.',
    patterns: ['Động từ + 个 + X'],
    examples: [
      {
        zh: '大家聚在一起，吃个痛快。',
        vi: 'Mọi người tụ họp lại, ăn cho đã đời.',
      },
    ],
  },
  '该X（就）X，该Y（就）Y': {
    explanationVi:
      '该X（就）X，该Y（就）Y: khuyên nên xử lý mọi việc đúng lúc đúng chỗ của nó, không cần lo lắng thái quá — "đến lúc X thì X, đến lúc Y thì Y".',
    patterns: ['该X（就）X，该Y（就）Y'],
    examples: [
      {
        zh: '别太担心了，该吃吃，该睡睡。',
        vi: 'Đừng lo lắng quá, đến bữa thì ăn, đến giờ thì ngủ.',
      },
    ],
  },
  '何至于……': {
    explanationVi:
      '何至于……: câu hỏi tu từ trang trọng, tỏ ý không ngờ/không cần thiết sự việc lại nghiêm trọng đến mức đó — "việc gì phải đến mức...".',
    patterns: ['何至于 + Động từ/Cụm từ'],
    examples: [
      {
        zh: '不就是迟到几分钟吗，何至于这么生气？',
        vi: 'Chỉ trễ có vài phút thôi mà, việc gì phải giận đến thế?',
      },
    ],
  },
  仅次于X: {
    explanationVi:
      '仅次于X: đứng ở vị trí thứ hai, chỉ sau X — "chỉ đứng sau...", "chỉ kém...".',
    patterns: ['仅次于 + Danh từ'],
    examples: [
      {
        zh: '这座城市的人口仅次于首都。',
        vi: 'Dân số thành phố này chỉ đứng sau thủ đô.',
      },
    ],
  },
  看在X的面子上: {
    explanationVi:
      '看在X的面子上: nêu lý do khoan dung/nhượng bộ vì nể mặt X — "nể tình/nể mặt...".',
    patterns: ['看在 + Danh từ + 的面子上'],
    examples: [
      {
        zh: '看在老朋友的面子上，这次就原谅他吧。',
        vi: 'Nể tình bạn cũ, lần này tha cho anh ta đi.',
      },
    ],
  },
  '没什么+动词+头儿': {
    explanationVi:
      '没什么+动词+头儿: khẩu ngữ, cho rằng việc gì đó không đáng để làm/không có giá trị — "chẳng có gì đáng để...".',
    patterns: ['没什么 + Động từ + 头儿'],
    examples: [
      { zh: '这部电影没什么看头儿。', vi: 'Bộ phim này chẳng có gì đáng xem.' },
    ],
  },
  '没什么好+动词+的': {
    explanationVi:
      '没什么好+动词+的: tương tự trên, phủ nhận sự cần thiết của một cảm xúc/hành động — "chẳng có gì phải...".',
    patterns: ['没什么好 + Động từ + 的'],
    examples: [
      { zh: '这没什么好害怕的。', vi: 'Cái này chẳng có gì phải sợ.' },
    ],
  },
  '莫过于……': {
    explanationVi:
      '莫过于……: khẳng định không gì hơn được điều được nêu ra, mang tính so sánh tuyệt đối, trang trọng — "không gì bằng...", "chẳng gì hơn...".',
    patterns: ['莫过于 + Danh từ/Cụm từ'],
    examples: [
      {
        zh: '人生最大的幸福莫过于家人平安。',
        vi: 'Hạnh phúc lớn nhất đời người không gì bằng gia đình bình an.',
      },
    ],
  },
  '你说你一个X，……': {
    explanationVi:
      '你说你一个X，……: khẩu ngữ trách móc nhẹ nhàng, nhắc lại thân phận/vai trò (X) của đối phương để phê bình hành động không phù hợp — "cậu là một X mà lại...".',
    patterns: ['你说你一个X，……'],
    examples: [
      {
        zh: '你说你一个大人了，还这么任性。',
        vi: 'Cậu là người lớn rồi mà còn bướng bỉnh thế.',
      },
    ],
  },
  什么A的B的: {
    explanationVi:
      '什么A的B的: liệt kê vài ví dụ với thái độ coi nhẹ/không để tâm, ý muốn gạt bỏ — "nào là A nào là B gì đó".',
    patterns: ['什么A的B的'],
    examples: [
      {
        zh: '什么忙的累的，都是借口。',
        vi: 'Nào là bận nào là mệt, đều là cái cớ cả.',
      },
    ],
  },
  '视……而定': {
    explanationVi:
      '视……而定: kết quả/quyết định phụ thuộc vào yếu tố được nêu, mang tính trang trọng — "tùy vào... mà quyết định".',
    patterns: ['视 + Danh từ + 而定'],
    examples: [
      {
        zh: '具体方案视情况而定。',
        vi: 'Phương án cụ thể tùy tình hình mà quyết định.',
      },
    ],
  },
  '谈何……': {
    explanationVi:
      '谈何……: câu hỏi tu từ trang trọng, phủ nhận khả năng của điều được nói tới — "nói gì đến...", "làm sao có thể nói tới...".',
    patterns: ['谈何 + Danh từ/Động từ'],
    examples: [
      {
        zh: '连基本生活都保证不了，谈何理想？',
        vi: 'Đến cuộc sống cơ bản còn chưa đảm bảo được, nói gì đến lý tưởng?',
      },
    ],
  },
  '无非/不过/只是……罢了/而已': {
    explanationVi:
      '无非/不过/只是……罢了/而已: nhấn mạnh sự việc chỉ đơn giản/nhỏ nhặt như vậy, không có gì to tát — "chẳng qua chỉ là... mà thôi".',
    patterns: ['无非/不过/只是 + …… + 罢了/而已'],
    examples: [
      {
        zh: '他这样做无非是想引起大家注意罢了。',
        vi: 'Anh ấy làm vậy chẳng qua chỉ muốn gây sự chú ý mà thôi.',
      },
    ],
  },
  '想X之所想，急X之所急': {
    explanationVi:
      '想X之所想，急X之所急: thành ngữ diễn tả sự đồng cảm sâu sắc, đặt mình vào vị trí của X — "nghĩ điều X nghĩ, lo điều X lo".',
    patterns: ['想X之所想，急X之所急'],
    examples: [
      {
        zh: '好的领导要想员工之所想，急员工之所急。',
        vi: 'Lãnh đạo tốt cần nghĩ điều nhân viên nghĩ, lo điều nhân viên lo.',
      },
    ],
  },
  '向……致以……': {
    explanationVi:
      '向……致以……: mẫu câu trang trọng dùng để bày tỏ lời chúc/lời cảm ơn/sự kính trọng — "gửi tới... lời...".',
    patterns: ['向 + Đối tượng + 致以 + Lời chúc/cảm ơn'],
    examples: [
      {
        zh: '向各位来宾致以热烈的欢迎。',
        vi: 'Xin gửi tới quý khách lời chào đón nồng nhiệt.',
      },
    ],
  },
  '要X有/没X，要Y有/没Y': {
    explanationVi:
      '要X有/没X，要Y有/没Y: liệt kê để nhấn mạnh sự đầy đủ (hoặc thiếu thốn) toàn diện về nhiều mặt — "cần X có X, cần Y có Y" (hoặc ngược lại đều không có).',
    patterns: ['要X有/没X，要Y有/没Y'],
    examples: [
      {
        zh: '这里要什么有什么，非常方便。',
        vi: 'Ở đây cần gì có nấy, rất tiện lợi.',
      },
    ],
  },
  '因……而……': {
    explanationVi:
      '因……而……: liên từ nhân quả trang trọng, văn viết — "vì... mà...".',
    patterns: ['因 + Nguyên nhân + 而 + Kết quả'],
    examples: [
      {
        zh: '这座城市因风景优美而闻名。',
        vi: 'Thành phố này nổi tiếng vì phong cảnh tươi đẹp.',
      },
    ],
  },
  有何X: {
    explanationVi:
      '有何X: câu hỏi tu từ trang trọng, văn viết, thường mang nghĩa phủ định — "có gì mà...", ví dụ 有何不可 = "có gì mà không được".',
    patterns: ['有何 + Danh từ/Tính từ'],
    examples: [
      {
        zh: '大家都同意，我们有何不可？',
        vi: 'Mọi người đều đồng ý, chúng ta có gì mà không được?',
      },
    ],
  },
  '有什么+动词+头儿': {
    explanationVi:
      '有什么+动词+头儿: câu hỏi tu từ, phủ nhận giá trị của việc gì đó — "có gì đáng để... đâu".',
    patterns: ['有什么 + Động từ + 头儿'],
    examples: [
      { zh: '这种电影有什么看头儿？', vi: 'Loại phim này có gì đáng xem đâu?' },
    ],
  },
  '（在）……之余': {
    explanationVi:
      '（在）……之余: văn viết, diễn tả việc gì đó xảy ra thêm ngoài hoạt động chính đã nêu — "ngoài việc..., còn...", "trong lúc rảnh rỗi khỏi...".',
    patterns: ['（在）+ Cụm từ + 之余，……'],
    examples: [
      {
        zh: '工作之余，他喜欢画画。',
        vi: 'Ngoài giờ làm việc, anh ấy thích vẽ tranh.',
      },
    ],
  },
  '值此……之际，……': {
    explanationVi:
      '值此……之际，……: mẫu câu trang trọng, nghi lễ, dùng để mở đầu lời chúc/phát biểu nhân dịp gì đó — "nhân dịp...".',
    patterns: ['值此 + Dịp/Thời điểm + 之际，……'],
    examples: [
      {
        zh: '值此新年之际，祝大家身体健康。',
        vi: 'Nhân dịp năm mới, chúc mọi người sức khỏe dồi dào.',
      },
    ],
  },
  'A+形容词+于/过+B': {
    explanationVi:
      'A+tính từ+于/过+B: mẫu so sánh văn viết, dùng 于/过 thay cho 比 — "A [tính từ] hơn B".',
    patterns: ['A + Tính từ + 于/过 + B'],
    examples: [
      { zh: '事实胜于雄辩。', vi: 'Sự thật hùng hồn hơn mọi lời biện luận.' },
    ],
  },
  '一来……，二来……，三来……': {
    explanationVi:
      '一来……，二来……，三来……: liệt kê lần lượt các lý do/khía cạnh, mang tính khẩu ngữ nhẹ nhàng — "một là..., hai là..., ba là...".',
    patterns: ['一来A，二来B，（三来C）'],
    examples: [
      {
        zh: '我不去，一来太忙，二来没有兴趣。',
        vi: 'Tôi không đi, một là quá bận, hai là không có hứng thú.',
      },
    ],
  },
  '一则……，二则……，三则……': {
    explanationVi:
      '一则……，二则……，三则……: tương tự 一来…二来…, nhưng trang trọng/văn viết hơn.',
    patterns: ['一则A，二则B，（三则C）'],
    examples: [
      {
        zh: '这样做，一则省时，二则省力。',
        vi: 'Làm như vậy, một là tiết kiệm thời gian, hai là tiết kiệm sức lực.',
      },
    ],
  },
  '所谓……，就是……': {
    explanationVi:
      '所谓……，就是……: đưa ra định nghĩa/giải thích rõ về một khái niệm/thuật ngữ — "cái gọi là..., chính là...".',
    patterns: ['所谓A，就是B'],
    examples: [
      {
        zh: '所谓成功，就是不断超越自己。',
        vi: 'Cái gọi là thành công, chính là không ngừng vượt qua chính mình.',
      },
    ],
  },
  '或……，或……': {
    explanationVi:
      '或……，或……: dạng rút gọn văn viết của 或是…或是…, liệt kê các khả năng — "hoặc..., hoặc...".',
    patterns: ['或A，或B'],
    examples: [
      {
        zh: '闲暇时，他或读书，或写作。',
        vi: 'Lúc rảnh rỗi, anh ấy hoặc đọc sách, hoặc viết lách.',
      },
    ],
  },
  '宁可/宁愿……，也不……': {
    explanationVi:
      '宁可/宁愿……，也不……: nêu rõ sự lựa chọn ưu tiên, thà chấp nhận vế trước còn hơn làm vế sau — "thà... còn hơn...".',
    patterns: ['宁可/宁愿A，也不B'],
    examples: [
      {
        zh: '他宁可自己受苦，也不愿麻烦别人。',
        vi: 'Anh ấy thà chịu khổ một mình còn hơn làm phiền người khác.',
      },
    ],
  },
  '与其……，宁愿/宁可……': {
    explanationVi:
      '与其……，宁愿/宁可……: so sánh hai phương án rồi khẳng định lựa chọn ưu tiên hơn ở vế sau — "thay vì..., thà rằng...".',
    patterns: ['与其A，宁愿/宁可B'],
    examples: [
      {
        zh: '与其在这里等，宁愿主动去找他。',
        vi: 'Thay vì đợi ở đây, thà chủ động đi tìm anh ấy còn hơn.',
      },
    ],
  },
  'X（倒）是X（了），……': {
    explanationVi:
      'X（倒）是X（了），……: thừa nhận X đúng như vậy, nhưng vế sau nêu ra một vấn đề/hạn chế khác — dạng đầy đủ, trang trọng hơn của "X是X".',
    patterns: ['X（倒）是X（了），……'],
    examples: [
      {
        zh: '道理倒是这个道理，可做起来没那么容易。',
        vi: 'Lý thì đúng là lý đó, nhưng làm thì không dễ như vậy.',
      },
    ],
  },
  '别看……，……': {
    explanationVi:
      '别看……，……: nhắc người nghe đừng chỉ nhìn vào vẻ bề ngoài/ấn tượng ban đầu (vế trước), vì thực tế lại khác (vế sau) — "đừng thấy... mà...".',
    patterns: ['别看A，……'],
    examples: [
      {
        zh: '别看他年纪小，懂的事可不少。',
        vi: 'Đừng thấy cậu ấy tuổi còn nhỏ, những điều cậu ấy hiểu không hề ít.',
      },
    ],
  },
  '虽说……，但/可……': {
    explanationVi:
      '虽说……，但/可……: biến thể khẩu ngữ của 虽然…但是…, thường dùng trong lời nói thường ngày.',
    patterns: ['虽说A，但/可B'],
    examples: [
      {
        zh: '虽说天气冷，但大家兴致都很高。',
        vi: 'Tuy trời lạnh, nhưng ai nấy đều rất hào hứng.',
      },
    ],
  },
  '无论……与否，都……': {
    explanationVi:
      '无论……与否，都……: câu ghép điều kiện trang trọng, 与否 nghĩa là "hay không", nêu hai khả năng đối lập rồi khẳng định kết quả không đổi.',
    patterns: ['无论A与否，都B'],
    examples: [
      {
        zh: '无论成功与否，都要坚持到底。',
        vi: 'Bất kể thành công hay không, đều phải kiên trì đến cùng.',
      },
    ],
  },
  '凡……（者），均（可）……': {
    explanationVi:
      '凡……（者），均（可）……: câu ghép điều kiện mang tính văn bản pháp lý/quy định, trang trọng — "phàm là... (người), đều (có thể)...".',
    patterns: ['凡……（者），均（可）……'],
    examples: [
      {
        zh: '凡年满十八岁者，均可申请。',
        vi: 'Phàm là người đủ mười tám tuổi, đều có thể nộp đơn.',
      },
    ],
  },
  '假若/假使……，……': {
    explanationVi:
      '假若/假使……，……: từ đồng nghĩa văn viết của 如果/假如, mở đầu câu giả thiết.',
    patterns: ['假若/假使A，……'],
    examples: [
      {
        zh: '假若时光可以倒流，你想做什么？',
        vi: 'Giả sử thời gian có thể quay ngược, bạn muốn làm gì?',
      },
    ],
  },
  '幸亏/幸好……，不然/否则……': {
    explanationVi:
      '幸亏/幸好……，不然/否则……: diễn tả sự may mắn đã tránh được hậu quả xấu — "may mà..., nếu không thì...".',
    patterns: ['幸亏/幸好A，不然/否则B'],
    examples: [
      {
        zh: '幸亏带了伞，不然就淋湿了。',
        vi: 'May mà mang theo ô, nếu không thì đã bị ướt.',
      },
    ],
  },
  '纵然/纵使……，也……': {
    explanationVi:
      '纵然/纵使……，也……: câu ghép nhượng bộ văn viết, mức độ trang trọng cao hơn 即使…也….',
    patterns: ['纵然/纵使A，也B'],
    examples: [
      {
        zh: '纵然困难重重，他也从未放弃。',
        vi: 'Dù khó khăn chồng chất, anh ấy cũng chưa từng bỏ cuộc.',
      },
    ],
  },
  '（因）……，故……': {
    explanationVi:
      '（因）……，故……: liên từ nhân quả cổ điển/trang trọng, thường gặp trong văn bản chính thức — "vì..., cho nên...".',
    patterns: ['（因）A，故B'],
    examples: [
      {
        zh: '因天气原因，故活动延期举行。',
        vi: 'Vì lý do thời tiết, nên hoạt động được hoãn lại.',
      },
    ],
  },
  '……，以至（于）……': {
    explanationVi:
      '以至（于）: nối vế sau nêu KẾT QUẢ/MỨC ĐỘ cực đoan do vế trước gây ra (thường ngoài mong muốn) — "..., đến mức...".',
    patterns: ['A，以至（于）B'],
    examples: [
      {
        zh: '他太紧张了，以至于说不出话来。',
        vi: 'Anh ấy quá căng thẳng, đến mức không nói nên lời.',
      },
    ],
  },
  '别说……，都/也……': {
    explanationVi:
      '别说……，都/也……: nêu một trường hợp cực đoan/khó hơn ở vế trước để làm nổi bật trường hợp còn lại càng đúng hơn — "đừng nói..., ngay cả... cũng...".',
    patterns: ['别说A，……都/也B'],
    examples: [
      {
        zh: '别说骑车了，他走路都走不稳。',
        vi: 'Đừng nói đi xe đạp, đi bộ anh ấy còn chưa vững.',
      },
    ],
  },
  '……不说，还……': {
    explanationVi:
      '……不说，还……: câu ghép tăng tiến khẩu ngữ, vế trước đã đủ tệ/đủ nhiều, vế sau còn thêm nữa — "chưa nói đến..., còn...".',
    patterns: ['A不说，还B'],
    examples: [
      {
        zh: '他脾气不好不说，还很懒。',
        vi: 'Tính anh ta đã không tốt, lại còn lười nữa.',
      },
    ],
  },
  '连……都……，更不用说……了': {
    explanationVi:
      '连……都……，更不用说……了: nêu trường hợp cơ bản/dễ nhất (连…都…) rồi khẳng định trường hợp khó hơn càng chắc chắn đúng, khỏi cần nói — "ngay cả... còn..., huống chi...".',
    patterns: ['连A都……，更不用说B了'],
    examples: [
      {
        zh: '连专家都解决不了，更不用说我们了。',
        vi: 'Ngay cả chuyên gia còn không giải quyết được, huống chi chúng ta.',
      },
    ],
  },
  '……尚且……，（更）何况……': {
    explanationVi:
      '……尚且……，（更）何况……: văn viết, cấu trúc tương tự 连…都…更不用说…, nhưng trang trọng hơn — "... còn..., huống hồ...".',
    patterns: ['A尚且B，（更）何况C'],
    examples: [
      {
        zh: '大人尚且做不到，何况孩子呢？',
        vi: 'Người lớn còn làm không được, huống hồ trẻ con?',
      },
    ],
  },
  '……，更不用说……了': {
    explanationVi:
      '更不用说……了: nối vế sau nêu một trường hợp hiển nhiên đúng hơn, không cần nói thêm — "..., khỏi phải nói đến... rồi".',
    patterns: ['A，更不用说B了'],
    examples: [
      {
        zh: '这道题大学生都不会，更不用说小学生了。',
        vi: 'Bài này sinh viên đại học còn không làm được, khỏi nói đến học sinh tiểu học.',
      },
    ],
  },
  '为（了）……起见，……': {
    explanationVi:
      '为（了）……起见，……: mẫu câu trang trọng nêu mục đích/lý do cân nhắc — "vì lý do..., xét thấy cần...".',
    patterns: ['为（了）+ Danh từ + 起见，……'],
    examples: [
      {
        zh: '为安全起见，请系好安全带。',
        vi: 'Vì lý do an toàn, xin vui lòng thắt dây an toàn.',
      },
    ],
  },
  '……，以……': {
    explanationVi:
      '以: liên từ mục đích trang trọng, văn viết, tương đương "để..." — "..., nhằm...".',
    patterns: ['A，以B'],
    examples: [
      {
        zh: '政府加大投入，以改善民生。',
        vi: 'Chính phủ tăng cường đầu tư, nhằm cải thiện đời sống người dân.',
      },
    ],
  },
  '非得……才……': {
    explanationVi:
      '非得……才……: nhấn mạnh điều kiện bắt buộc, không có cách nào khác — "nhất định phải..., mới...".',
    patterns: ['非得A才B'],
    examples: [
      {
        zh: '这件事非得你亲自出面才行。',
        vi: 'Việc này nhất định phải cậu đích thân ra mặt mới được.',
      },
    ],
  },
  '任……也……': {
    explanationVi:
      '任……也……: câu ghép nhượng bộ văn viết, tương đương 无论/不管…都…, nhưng dùng 任 (mặc kệ, tùy) — "mặc cho... cũng...".',
    patterns: ['任A也B'],
    examples: [
      {
        zh: '任你怎么解释，他也不会相信。',
        vi: 'Mặc cho cậu giải thích thế nào, anh ta cũng sẽ không tin.',
      },
    ],
  },
  多重并列复句: {
    explanationVi:
      'Câu ghép song song NHIỀU TẦNG: kết hợp từ 3 vế trở lên cùng quan hệ song song (既…又…还…), hoặc lồng một câu ghép song song bên trong một câu ghép khác — kỹ năng viết đoạn văn phức tạp ở trình độ cao.',
    patterns: ['A，B，还C（lồng nhiều tầng song song）'],
    examples: [
      {
        zh: '这个方案既省时，又省力，还能提高质量。',
        vi: 'Phương án này vừa tiết kiệm thời gian, vừa tiết kiệm sức lực, lại còn nâng cao được chất lượng.',
      },
    ],
  },
  多重转折复句: {
    explanationVi:
      'Câu ghép chuyển ý NHIỀU TẦNG: một câu chứa từ hai quan hệ chuyển ý trở lên (ví dụ vừa 虽然…但是…, bên trong lại có thêm 不过…), diễn tả lập luận phức tạp, nhiều lớp.',
    patterns: ['(Câu chuyển ý lồng trong câu chuyển ý khác)'],
    examples: [
      {
        zh: '虽然他很努力，但是效果不明显，不过大家还是很欣赏他的态度。',
        vi: 'Tuy anh ấy rất nỗ lực, nhưng hiệu quả không rõ rệt, dù vậy mọi người vẫn rất trân trọng thái độ của anh ấy.',
      },
    ],
  },
  多重假设复句: {
    explanationVi:
      'Câu ghép giả thiết NHIỀU TẦNG: kết hợp nhiều điều kiện giả định lồng nhau (ví dụ 如果…那么…万一…就…), thường gặp trong lập luận, phân tích trường hợp phức tạp.',
    patterns: ['(Câu giả thiết lồng trong câu giả thiết khác)'],
    examples: [
      {
        zh: '如果明天下雨，我们就改期；万一改期也不行，那就只能取消了。',
        vi: 'Nếu mai mưa, chúng ta sẽ đổi ngày; lỡ như đổi ngày cũng không được, thì đành phải hủy thôi.',
      },
    ],
  },
  多重因果复句: {
    explanationVi:
      'Câu ghép nhân quả NHIỀU TẦNG: chuỗi nguyên nhân-kết quả nối tiếp nhau (kết quả của vế này lại là nguyên nhân của vế sau), tạo thành lập luận dây chuyền.',
    patterns: ['(Chuỗi nhân quả nối tiếp)'],
    examples: [
      {
        zh: '因为下雨，所以路滑，因此他不小心摔倒了。',
        vi: 'Vì trời mưa nên đường trơn, do đó anh ấy sơ ý ngã.',
      },
    ],
  },
  多重递进复句: {
    explanationVi:
      'Câu ghép tăng tiến NHIỀU TẦNG: các vế câu tăng dần mức độ liên tục qua nhiều lớp (不但…而且…甚至…), đẩy lập luận lên cao trào.',
    patterns: ['(Chuỗi tăng tiến nhiều lớp: 不但…而且…甚至…)'],
    examples: [
      {
        zh: '他不但学习好，而且体育也好，甚至连音乐都很出色。',
        vi: 'Cậu ấy không những học giỏi, mà thể thao cũng giỏi, thậm chí âm nhạc cũng rất xuất sắc.',
      },
    ],
  },
  时间顺序: {
    explanationVi:
      'Tổ chức đoạn văn theo TRÌNH TỰ THỜI GIAN: các câu/sự việc được sắp xếp theo diễn biến trước-sau, thường dùng các từ nối như 首先/然后/接着/最后, hoặc các mốc thời gian cụ thể.',
    patterns: ['首先……然后……接着……最后……'],
    examples: [
      {
        zh: '这项技术的发展经历了三个阶段：起步、发展，最后走向成熟。',
        vi: 'Sự phát triển của công nghệ này trải qua ba giai đoạn: khởi đầu, phát triển, và cuối cùng là trưởng thành.',
      },
    ],
  },
  空间顺序: {
    explanationVi:
      'Tổ chức đoạn văn theo TRÌNH TỰ KHÔNG GIAN: miêu tả sự vật theo hướng di chuyển của tầm nhìn (từ xa đến gần, từ trên xuống dưới, từ trong ra ngoài...), thường dùng trong văn miêu tả.',
    patterns: ['(Miêu tả theo hướng: xa→gần, trên→dưới, trong→ngoài…)'],
    examples: [
      {
        zh: '走进房间，正前方是一张桌子，桌子左边放着一把椅子，再往里是一扇窗户。',
        vi: 'Bước vào phòng, ngay phía trước là một cái bàn, bên trái bàn đặt một cái ghế, đi sâu vào trong nữa là một cửa sổ.',
      },
    ],
  },
  逻辑顺序: {
    explanationVi:
      'Tổ chức đoạn văn theo TRÌNH TỰ LOGIC: sắp xếp ý theo quan hệ lập luận (nguyên nhân→kết quả, tổng quát→cụ thể, vấn đề→giải pháp...) thay vì theo thời gian hay không gian — dùng nhiều trong văn nghị luận.',
    patterns: ['(Sắp xếp theo: nguyên nhân→kết quả, khái quát→cụ thể…)'],
    examples: [
      {
        zh: '现代社会竞争激烈，因此，年轻人更需要不断学习新技能。',
        vi: 'Xã hội hiện đại cạnh tranh khốc liệt, do đó, người trẻ càng cần không ngừng học kỹ năng mới.',
      },
    ],
  },
  话题延伸: {
    explanationVi:
      'Kỹ thuật viết đoạn văn: MỞ RỘNG một chủ đề đang nói bằng cách bổ sung thêm chi tiết, ví dụ, hoặc góc nhìn liên quan, thường dùng các từ nối như 另外/此外/而且/与此同时.',
    patterns: ['另外/此外/而且/与此同时 + ý mở rộng'],
    examples: [
      {
        zh: '这个政策有利于经济发展。此外，它还能改善民生。',
        vi: 'Chính sách này có lợi cho phát triển kinh tế. Ngoài ra, nó còn có thể cải thiện đời sống người dân.',
      },
    ],
  },
  话题转换: {
    explanationVi:
      'Kỹ thuật viết đoạn văn: CHUYỂN SANG một chủ đề mới trong khi vẫn giữ mạch văn liên kết, thường dùng các từ nối như 至于/说到/另一方面/与此相反.',
    patterns: ['至于/说到/另一方面 + chủ đề mới'],
    examples: [
      {
        zh: '经济方面已经谈得很多了。至于文化方面，我们下面再详细讨论。',
        vi: 'Về mặt kinh tế đã bàn khá nhiều rồi. Còn về mặt văn hóa, chúng ta sẽ bàn chi tiết hơn ở phần sau.',
      },
    ],
  },
  承前省略: {
    explanationVi:
      'Tỉnh lược chủ ngữ/thành phần đã xuất hiện ở CÂU TRƯỚC ĐÓ để tránh lặp từ — người đọc tự hiểu dựa vào ngữ cảnh phía trước.',
    patterns: ['Câu 1 (có chủ ngữ) + Câu 2 (lược chủ ngữ, hiểu ngầm)'],
    examples: [
      {
        zh: '他打开门，（他）走了进去，（他）坐了下来。',
        vi: 'Anh ấy mở cửa, (anh ấy) bước vào, (anh ấy) ngồi xuống.',
      },
    ],
  },
  蒙后省略: {
    explanationVi:
      'Tỉnh lược thành phần sẽ được nhắc rõ ở CÂU SAU — ít gặp hơn 承前省略, thường dùng trong văn viết súc tích, người đọc hiểu ngầm nhờ câu tiếp theo bổ sung.',
    patterns: ['Câu 1 (lược thành phần) + Câu 2 (nêu rõ thành phần đó)'],
    examples: [
      {
        zh: '（虽然）大家都不说，心里其实都明白是怎么回事。',
        vi: '(Dù) không ai nói ra, nhưng trong lòng ai cũng hiểu rõ chuyện là như thế nào.',
      },
    ],
  },
};
