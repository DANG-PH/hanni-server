/**
 * Giải thích cho các mục "句子的类型/句子成分/固定格式/特殊表达法" HSK5 trong đại
 * cương chính thức — cùng cách làm với grammar-explained-hsk4.ts.
 */
import type { ExplainedEntry } from './grammar-explained-hsk4';

export const HSK5_EXPLAINED: Record<string, ExplainedEntry> = {
  'X是它，Y也是它': {
    explanationVi:
      'X是它，Y也是它: khẩu ngữ, diễn tả X và Y thực chất chẳng khác gì nhau, gọi tên nào cũng vậy — "gọi là gì thì cũng thế thôi".',
    patterns: ['X是它，Y也是它'],
    examples: [
      {
        zh: '叫经理也好，叫老板也好，反正说的都是他，叫什么是它，叫什么也是它。',
        vi: 'Gọi giám đốc hay gọi sếp thì cũng đều là nói về anh ấy thôi, gọi gì cũng vậy.',
      },
    ],
  },
  X着也是X着: {
    explanationVi:
      'X着也是X着: lặp lại trạng thái đang tiếp diễn để nhấn mạnh đằng nào cũng đang ở trạng thái đó, thà tranh thủ làm việc khác — "đằng nào cũng đang X".',
    patterns: ['X着也是X着'],
    examples: [
      {
        zh: '闲着也是闲着，不如帮我一起打扫。',
        vi: 'Đằng nào cũng đang rảnh, chi bằng giúp tôi dọn dẹp luôn.',
      },
    ],
  },
  不管怎样说: {
    explanationVi:
      '不管怎样说: cụm chuyển ý cố định, dùng để tổng kết/khẳng định điều sắp nói dù trước đó có bàn luận thế nào — "dù sao thì, nói thế nào đi nữa".',
    patterns: ['不管怎样说，……'],
    examples: [
      {
        zh: '不管怎样说，安全才是最重要的。',
        vi: 'Dù nói thế nào đi nữa, an toàn vẫn là quan trọng nhất.',
      },
    ],
  },
  '真有你/他/她的': {
    explanationVi:
      '真有你/他/她的: khẩu ngữ khen ngợi (hoặc mỉa mai nhẹ) ai đó thật sự có bản lĩnh/tài giỏi trong việc gì — "cậu/anh ấy/cô ấy đúng là ghê thật".',
    patterns: ['真有 + đại từ + 的'],
    examples: [
      {
        zh: '一个人搞定这么大的项目，真有你的！',
        vi: 'Một mình xử lý xong dự án lớn thế này, cậu đúng là ghê thật!',
      },
    ],
  },
  X什么X: {
    explanationVi:
      'X什么X: câu hỏi tu từ phủ nhận, cho rằng không cần/không nên làm X — "X cái gì mà X", "việc gì phải X".',
    patterns: ['Động từ + 什么 + Động từ'],
    examples: [
      {
        zh: '急什么急，时间还早呢。',
        vi: 'Vội cái gì mà vội, thời gian vẫn còn sớm mà.',
      },
    ],
  },
  '什么X不X（的）': {
    explanationVi:
      '什么X不X（的）: khẩu ngữ gạt bỏ, cho rằng việc phân biệt/lăn tăn về X là không cần thiết — "gì mà X hay không X chứ".',
    patterns: ['什么 + Tính từ/Động từ + 不 + Tính từ/Động từ（的）'],
    examples: [
      {
        zh: '什么累不累的，做完再说吧。',
        vi: 'Gì mà mệt hay không mệt chứ, làm xong rồi tính.',
      },
    ],
  },
  不X白不X: {
    explanationVi:
      '不X白不X: khẩu ngữ, diễn tả nếu không tranh thủ làm X (thường vì miễn phí/có sẵn) thì phí — "không X thì phí".',
    patterns: ['不 + Động từ + 白 + 不 + Động từ'],
    examples: [
      {
        zh: '免费的东西，不吃白不吃。',
        vi: 'Đồ miễn phí mà, không ăn thì phí.',
      },
    ],
  },
  'X来X去，都是/就是……': {
    explanationVi:
      'X来X去，都是/就是……: lặp đi lặp lại hành động X nhiều lần nhưng kết quả/kết luận vẫn không đổi — "X tới X lui thì cũng vẫn là...".',
    patterns: ['Động từ来Động từ去，都是/就是……'],
    examples: [
      {
        zh: '想来想去，还是觉得这个办法最好。',
        vi: 'Suy đi tính lại, vẫn thấy cách này là tốt nhất.',
      },
    ],
  },
  '动词+什么（就）是什么': {
    explanationVi:
      '动词+什么（就）是什么: diễn tả sự chấp nhận/không kén chọn, kết quả của hành động ra sao thì chấp nhận vậy — "V gì thì được nấy".',
    patterns: ['Động từ + 什么（就）是什么'],
    examples: [
      {
        zh: '我不挑，你做什么就是什么，我都吃。',
        vi: 'Tôi không kén, bạn nấu gì thì tôi ăn nấy.',
      },
    ],
  },
  多项状语: {
    explanationVi:
      'Khi câu có NHIỀU trạng ngữ cùng lúc (thời gian, nơi chốn, đối tượng, cách thức, phạm vi...), thứ tự chuẩn thường là: trạng ngữ thời gian → trạng ngữ nơi chốn → trạng ngữ đối tượng (介词短语 với 给/跟/对...) → trạng ngữ cách thức → động từ.',
    patterns: ['Thời gian + Nơi chốn + Đối tượng + Cách thức + Động từ'],
    examples: [
      {
        zh: '他昨天在办公室很认真地跟经理谈了这件事。',
        vi: 'Hôm qua anh ấy đã bàn việc này với giám đốc một cách rất nghiêm túc ở văn phòng.',
      },
    ],
  },
  '动词+得/不得': {
    explanationVi:
      'Động từ + 得/不得: bổ ngữ khả năng diễn tả việc CÓ ĐƯỢC PHÉP làm hay không (về mặt quy tắc, đạo lý, hậu quả), khác với 得/不了 (chỉ khả năng khách quan làm được hay không).',
    patterns: ['Động từ + 得/不得'],
    examples: [
      {
        zh: '这种蘑菇有毒，吃不得。',
        vi: 'Loại nấm này có độc, không ăn được đâu.',
      },
      {
        zh: '这件事说得，不用瞒着大家。',
        vi: 'Việc này nói được, không cần giấu mọi người.',
      },
    ],
  },
  '形容词/心理动词+得+不得了': {
    explanationVi:
      'Tính từ/động từ tâm lý + 得 + 不得了: bổ ngữ mức độ khẩu ngữ, nhấn mạnh mức độ cực cao, không kiểm soát nổi — "...không chịu được", "cực kỳ...".',
    patterns: ['Tính từ/Động từ tâm lý + 得 + 不得了'],
    examples: [
      { zh: '今天热得不得了。', vi: 'Hôm nay nóng không chịu được.' },
      {
        zh: '听到这个消息，他高兴得不得了。',
        vi: 'Nghe tin này, anh ấy vui mừng cực kỳ.',
      },
    ],
  },
  '趋向补语的引申用法：表示状态意义：动词/形容词+下来/下去/起来/过来/过去': {
    explanationVi:
      'Bổ ngữ xu hướng dùng theo nghĩa BÓNG (không còn chỉ phương hướng thật) để diễn tả trạng thái: 下来 = một trạng thái dần ổn định/dừng lại (安静下来 = dần yên tĩnh lại); 下去 = tiếp tục duy trì (坚持下去 = tiếp tục kiên trì); 起来 = bắt đầu và tăng dần (哭起来 = bắt đầu khóc); 过来/过去 = chuyển đổi trạng thái ý thức (醒过来 = tỉnh lại, 晕过去 = ngất đi).',
    patterns: ['Động từ/Tính từ + 下来/下去/起来/过来/过去 (nghĩa bóng)'],
    examples: [
      { zh: '大家慢慢安静下来了。', vi: 'Mọi người dần yên tĩnh lại.' },
      {
        zh: '不管多难，他都坚持下去了。',
        vi: 'Dù khó khăn thế nào, anh ấy vẫn kiên trì tiếp tục.',
      },
      {
        zh: '听到这个笑话，大家都笑起来了。',
        vi: 'Nghe chuyện cười này, mọi người đều bật cười.',
      },
    ],
  },
  '（1）动词/形容词+得+动词短语': {
    explanationVi:
      'Bổ ngữ trạng thái là một CỤM ĐỘNG TỪ sau 得, miêu tả kết quả/mức độ của hành động chính bằng cả một hành động khác.',
    patterns: ['Động từ/Tính từ + 得 + Cụm động từ'],
    examples: [
      {
        zh: '他累得站不起来了。',
        vi: 'Anh ấy mệt đến mức không đứng dậy nổi.',
      },
    ],
  },
  '（2）动词/形容词+得+主谓短语': {
    explanationVi:
      'Bổ ngữ trạng thái là một CỤM CHỦ-VỊ sau 得, tức là cả một câu nhỏ mô tả hệ quả.',
    patterns: ['Động từ/Tính từ + 得 + Cụm chủ-vị'],
    examples: [
      {
        zh: '这个消息让她高兴得眼泪都流出来了。',
        vi: 'Tin này khiến cô ấy vui đến mức nước mắt trào ra.',
      },
    ],
  },
  '（3）动词/形容词+得+固定短语': {
    explanationVi:
      'Bổ ngữ trạng thái là một CỤM TỪ CỐ ĐỊNH (thành ngữ, quán ngữ) sau 得, thường mang tính hình tượng/phóng đại.',
    patterns: ['Động từ/Tính từ + 得 + Cụm từ cố định'],
    examples: [
      {
        zh: '他忙得不可开交。',
        vi: 'Anh ấy bận đến mức không thể dứt ra được.',
      },
    ],
  },
  '（1）表示存在、具有：主语+有+着+宾语': {
    explanationVi:
      '主语+有+着+宾语: 有 kết hợp với 着 nhấn mạnh trạng thái tồn tại/sở hữu đang kéo dài — thường dùng trong văn viết, mang tính miêu tả.',
    patterns: ['S + 有 + 着 + O'],
    examples: [
      {
        zh: '这座城市有着悠久的历史。',
        vi: 'Thành phố này có một lịch sử lâu đời.',
      },
    ],
  },
  '（2）表示附着：主语+动词+有+宾语': {
    explanationVi:
      '主语+动词+有+宾语: 有 đứng sau một động từ khác để diễn tả vật gì đó gắn/tồn tại trên bề mặt/ở vị trí nào đó — "có... trên/ở...".',
    patterns: ['S + Động từ + 有 + O'],
    examples: [
      { zh: '墙上挂有一幅画。', vi: 'Trên tường có treo một bức tranh.' },
      { zh: '桌子上放有几本书。', vi: 'Trên bàn có để mấy quyển sách.' },
    ],
  },
  '（1）主语+把+宾语+一+动词': {
    explanationVi:
      'Câu chữ 把 với 一 + động từ: diễn tả một hành động nhanh gọn, dứt khoát tác động lên tân ngữ — "...cái là xong".',
    patterns: ['S + 把 + O + 一 + Động từ'],
    examples: [
      { zh: '他把门一推就进去了。', vi: 'Anh ấy đẩy cửa cái là vào luôn.' },
    ],
  },
  '（2）主语+把+宾语1+动词+宾语2': {
    explanationVi:
      'Câu chữ 把 với động từ song tân ngữ: sau khi xử lý tân ngữ 1, còn có thêm tân ngữ 2 (thường là người nhận) — dùng với các động từ như 给/送/告诉/教….',
    patterns: ['S + 把 + O1 + Động từ + O2'],
    examples: [
      { zh: '他把这件事告诉了我。', vi: 'Anh ấy đã kể việc này cho tôi biết.' },
    ],
  },
  '前后两个动词性词语具有因果、转折、条件关系': {
    explanationVi:
      'Câu liên động nâng cao: hai cụm động từ liền kề không chỉ diễn tả hành động nối tiếp, mà còn ngầm mang quan hệ nhân-quả, chuyển ý hoặc điều kiện với nhau (không cần liên từ rõ ràng).',
    patterns: ['S + V1 + V2 (quan hệ nhân quả/chuyển ý/điều kiện ngầm)'],
    examples: [
      { zh: '他病了没去上班。', vi: 'Anh ấy bị ốm nên không đi làm.' },
    ],
  },
  'A+形容词+B+数量补语': {
    explanationVi:
      'Mẫu câu so sánh nêu rõ CHÊNH LỆCH cụ thể giữa hai đối tượng: A + 比 + B + tính từ + số lượng cụ thể — "A hơn B [bao nhiêu]".',
    patterns: ['A + 比 + B + Tính từ + số lượng'],
    examples: [
      { zh: '他比我大三岁。', vi: 'Anh ấy hơn tôi ba tuổi.' },
      {
        zh: '这个箱子比那个重五公斤。',
        vi: 'Chiếc hộp này nặng hơn chiếc kia năm cân.',
      },
    ],
  },
  '主语+被/叫/让+宾语+给+动词+其他成分': {
    explanationVi:
      'Câu bị động khẩu ngữ có thêm 给 chen trước động từ (không mang nghĩa riêng, chỉ nhấn mạnh) — dùng được với cả 被/叫/让.',
    patterns: ['S + 被/叫/让 + tác nhân + 给 + Động từ + …'],
    examples: [
      {
        zh: '我的钱包被小偷给偷走了。',
        vi: 'Ví tiền của tôi bị tên trộm lấy mất.',
      },
    ],
  },
  '……，便……': {
    explanationVi:
      '便: đồng nghĩa với 就 trong câu ghép tiếp nối, nhưng mang văn phong trang trọng/văn viết hơn.',
    patterns: ['A，便B'],
    examples: [
      {
        zh: '他一到家，便开始做作业。',
        vi: 'Anh ấy vừa về đến nhà liền bắt đầu làm bài tập.',
      },
    ],
  },
  '或是……，或是……': {
    explanationVi:
      '或是……，或是……: câu ghép lựa chọn mang tính văn viết, tương đương 要么…要么… trong khẩu ngữ — "hoặc là..., hoặc là...".',
    patterns: ['或是A，或是B'],
    examples: [
      {
        zh: '周末他或是看书，或是运动。',
        vi: 'Cuối tuần anh ấy hoặc là đọc sách, hoặc là tập thể dục.',
      },
    ],
  },
  '一旦……，就……': {
    explanationVi:
      '一旦……，就……: câu ghép giả thiết nhấn mạnh MỘT KHI điều kiện (thường chưa xảy ra) xảy ra thì kết quả sẽ lập tức xảy theo — "một khi... thì...".',
    patterns: ['一旦A，就B'],
    examples: [
      {
        zh: '一旦下定决心，他就不会改变。',
        vi: 'Một khi đã quyết tâm, anh ấy sẽ không thay đổi.',
      },
    ],
  },
  '假如……，（就）……': {
    explanationVi:
      '假如……，（就）……: câu ghép giả thiết mang tính văn viết, tương đương 如果…就…, thường dùng cho giả định trừu tượng/mang tính văn chương.',
    patterns: ['假如A，（就）B'],
    examples: [
      {
        zh: '假如明天不下雨，我们就去郊游。',
        vi: 'Giả sử mai không mưa, chúng ta sẽ đi dã ngoại.',
      },
    ],
  },
  '万一……，（就）……': {
    explanationVi:
      '万一……，（就）……: câu ghép giả thiết cho tình huống XẤU, khả năng xảy ra thấp nhưng vẫn cần đề phòng — "lỡ như... thì...".',
    patterns: ['万一A，（就）B'],
    examples: [
      {
        zh: '万一下雨，就把活动改在室内。',
        vi: 'Lỡ như trời mưa thì đổi hoạt động vào trong nhà.',
      },
    ],
  },
  '……，要不然/不然……': {
    explanationVi:
      '要不然/不然: đồng nghĩa với 否则, nêu hậu quả nếu không làm theo vế trước — mang tính khẩu ngữ hơn 否则.',
    patterns: ['A，要不然/不然B'],
    examples: [
      {
        zh: '快点儿走吧，要不然要迟到了。',
        vi: 'Đi nhanh lên, không thì trễ mất.',
      },
    ],
  },
  '……，因而……': {
    explanationVi:
      '因而: liên từ nhân quả mang tính trang trọng/văn viết, tương đương 因此 — "do đó, vì vậy".',
    patterns: ['A，因而B'],
    examples: [
      {
        zh: '他准备充分，因而考试很顺利。',
        vi: 'Anh ấy chuẩn bị kỹ càng, do đó kỳ thi diễn ra rất suôn sẻ.',
      },
    ],
  },
  '……，可见……': {
    explanationVi:
      '可见: nối vế sau để nêu KẾT LUẬN/SUY RA được từ thông tin ở vế trước — "qua đó có thể thấy...", "từ đó suy ra...".',
    patterns: ['A，可见B'],
    examples: [
      {
        zh: '他每次都考第一，可见他很努力。',
        vi: 'Lần nào anh ấy cũng đứng đầu, qua đó có thể thấy anh ấy rất nỗ lực.',
      },
    ],
  },
  '哪怕……，也……': {
    explanationVi:
      '哪怕……，也……: câu ghép nhượng bộ, tương đương 即使…也…, mang sắc thái khẩu ngữ, thường nhấn mạnh mức độ cực đoan.',
    patterns: ['哪怕A，也B'],
    examples: [
      {
        zh: '哪怕再苦再累，他也不会放弃。',
        vi: 'Dù có khổ có mệt đến đâu, anh ấy cũng sẽ không bỏ cuộc.',
      },
    ],
  },
  '不但不/不但没有……，反而……': {
    explanationVi:
      '不但不/不但没有……，反而……: câu ghép tăng tiến đảo ngược — kết quả không chỉ KHÔNG như mong đợi, mà còn ngược lại hoàn toàn — "chẳng những không..., mà ngược lại còn...".',
    patterns: ['不但不/不但没有A，反而B'],
    examples: [
      {
        zh: '他不但不生气，反而笑了。',
        vi: 'Anh ấy chẳng những không giận, mà ngược lại còn cười.',
      },
    ],
  },
  '不是……，还/还是……': {
    explanationVi:
      '不是……，还/还是……: câu ghép tăng tiến khẳng định, phủ định nhẹ vế đầu để nhấn mạnh vế sau còn hơn thế — "không chỉ là..., mà còn/vẫn là...".',
    patterns: ['不是A，还/还是B'],
    examples: [
      {
        zh: '这不是小问题，还是个大麻烦。',
        vi: 'Đây không phải chuyện nhỏ, mà còn là rắc rối lớn.',
      },
    ],
  },
  '……，为的是……': {
    explanationVi:
      '为的是: nối vế sau để nêu rõ MỤC ĐÍCH của hành động ở vế trước, mang tính trang trọng — "...là để...", "mục đích là...".',
    patterns: ['A，为的是B'],
    examples: [
      {
        zh: '他每天早起锻炼，为的是保持健康。',
        vi: 'Anh ấy mỗi ngày dậy sớm tập luyện, mục đích là để giữ gìn sức khỏe.',
      },
    ],
  },
  '没有……就没有……': {
    explanationVi:
      'Câu rút gọn song song nhấn mạnh mối quan hệ TIỀN ĐỀ TẤT YẾU: không có A thì không thể có B — "không có... thì không có...".',
    patterns: ['没有A就没有B'],
    examples: [
      {
        zh: '没有努力就没有成功。',
        vi: 'Không có nỗ lực thì không có thành công.',
      },
    ],
  },
  '不……不……': {
    explanationVi:
      'Câu rút gọn với hai từ phủ định song song, diễn tả điều kiện bắt buộc hoặc quyết tâm — "không... thì không...".',
    patterns: ['不A不B'],
    examples: [
      {
        zh: '不见不散。',
        vi: 'Không gặp thì không về (hẹn chắc chắn có mặt).',
      },
      {
        zh: '这件事不查清楚不罢休。',
        vi: 'Việc này chưa làm rõ thì chưa thôi.',
      },
    ],
  },
  '再……也……': {
    explanationVi:
      '再……也……: câu rút gọn nhượng bộ, dù mức độ có cao đến đâu thì kết quả vẫn không đổi — "dù có... đến mấy cũng...".',
    patterns: ['再A也B'],
    examples: [
      { zh: '再忙也要吃饭。', vi: 'Dù có bận đến mấy cũng phải ăn cơm.' },
    ],
  },
};
