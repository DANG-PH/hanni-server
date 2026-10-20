/**
 * Giải thích cho các mục "句子的类型/句子成分/固定格式/特殊表达法" HSK6 trong đại
 * cương chính thức — cùng cách làm với grammar-explained-hsk4.ts.
 */
import type { ExplainedEntry } from './grammar-explained-hsk4';

export const HSK6_EXPLAINED: Record<string, ExplainedEntry> = {
  'A一+量词，B一+量词': {
    explanationVi:
      'A一+lượng từ，B一+lượng từ: cấu trúc song song liệt kê nhiều chủ thể cùng làm một việc rải rác, không đồng bộ — "người A một [ĐV], người B một [ĐV]".',
    patterns: ['A一+LT，B一+LT'],
    examples: [
      {
        zh: '大家你一言，我一语，讨论得很热闹。',
        vi: 'Mọi người người này một câu, người kia một câu, bàn luận rất sôi nổi.',
      },
    ],
  },
  '东一A，西一A': {
    explanationVi:
      '东一A，西一A: diễn tả hành động A diễn ra rải rác, lộn xộn, không có trật tự — "chỗ này một A, chỗ kia một A".',
    patterns: ['东一A，西一A'],
    examples: [
      {
        zh: '他说话东一句西一句，让人听不明白。',
        vi: 'Anh ấy nói năng lộn xộn chỗ này một câu chỗ kia một câu, khiến người khác không hiểu nổi.',
      },
    ],
  },
  '到……为止': {
    explanationVi:
      '到 + thời điểm/mốc + 为止: đánh dấu điểm kết thúc của một khoảng thời gian/phạm vi — "cho đến... thì dừng/kết thúc".',
    patterns: ['到 + Thời điểm + 为止'],
    examples: [
      {
        zh: '报名到本周五为止。',
        vi: 'Đăng ký đến hết thứ Sáu tuần này thì kết thúc.',
      },
    ],
  },
  X到Y头上来了: {
    explanationVi:
      'X到Y头上来了: diễn tả trách nhiệm/hậu quả (X) bất ngờ đổ lên đầu Y một cách vô lý/không công bằng — "đổ lên đầu... rồi".',
    patterns: ['X + 到 + Y + 头上来了'],
    examples: [
      {
        zh: '这事儿怎么怪到我头上来了？',
        vi: 'Chuyện này sao lại đổ lỗi lên đầu tôi thế?',
      },
    ],
  },
  '不X不……，一X……': {
    explanationVi:
      '不X不……，一X……: nhấn mạnh chỉ khi làm X thì mới nhận ra/xảy ra điều gì — "không X thì không..., hễ X thì...".',
    patterns: ['不X不……，一X……'],
    examples: [
      {
        zh: '不比不知道，一比吓一跳。',
        vi: 'Không so thì không biết, hễ so là giật mình.',
      },
    ],
  },
  好你个X: {
    explanationVi:
      '好你个 + tên/đại từ: cảm thán khẩu ngữ, tỏ vẻ bất ngờ/nửa trách móc nửa nể phục trước hành động táo bạo của ai đó — "giỏi cho cậu đấy!", "cậu hay thật đấy!".',
    patterns: ['好你个 + Đại từ/Tên riêng'],
    examples: [
      {
        zh: '好你个小子，竟然骗我！',
        vi: 'Giỏi cho cậu nhóc này, dám lừa cả tôi!',
      },
    ],
  },
  '早（也）不X，晚（也）不X': {
    explanationVi:
      '早（也）不X，晚（也）不X: than phiền về thời điểm xảy ra không đúng lúc — "sớm không X, muộn không X (lại đúng lúc này)".',
    patterns: ['早（也）不X，晚（也）不X'],
    examples: [
      {
        zh: '你早不来晚不来，偏偏这时候来。',
        vi: 'Cậu sớm không đến muộn không đến, lại đúng lúc này mới đến.',
      },
    ],
  },
  '看/瞧+把+宾语（施事）+X得': {
    explanationVi:
      '看/瞧+把+宾语+X得: khẩu ngữ, chỉ ra hậu quả/trạng thái ai đó bị rơi vào (thường phóng đại, có sắc thái xót xa hoặc mỉa mai) — "nhìn xem [ai đó] bị/được... đến nỗi...".',
    patterns: ['看/瞧 + 把 + O + X + 得'],
    examples: [
      {
        zh: '瞧把他高兴得，跟个孩子似的。',
        vi: 'Nhìn xem anh ta vui đến mức nào, y như trẻ con.',
      },
    ],
  },
  放着X不Y: {
    explanationVi:
      '放着X不Y: phê phán việc không tận dụng X (vốn có sẵn/thuận tiện) để làm Y, lại chọn cách khác — "có X sẵn đấy mà không chịu Y".',
    patterns: ['放着X不Y'],
    examples: [
      {
        zh: '放着电梯不坐，非要爬楼梯。',
        vi: 'Có thang máy sẵn đấy không đi, cứ nhất định leo cầu thang bộ.',
      },
    ],
  },
  'X了就X了，（没）有……': {
    explanationVi:
      'X了就X了，（没）有……: chấp nhận một việc đã rồi, không cần bận tâm thêm — "X rồi thì X rồi, (không) có gì...".',
    patterns: ['X了就X了，（没）有……'],
    examples: [
      {
        zh: '说了就说了，有什么大不了的。',
        vi: 'Nói rồi thì nói rồi, có gì to tát đâu.',
      },
    ],
  },
  '这/那也不X，那/这也不Y': {
    explanationVi:
      '这也不X，那也不Y: diễn tả sự kén chọn/khó tính quá mức, cái gì cũng chê — "cái này cũng không X, cái kia cũng không Y".',
    patterns: ['这也不X，那也不Y'],
    examples: [
      {
        zh: '他挑东西，这也不好，那也不满意。',
        vi: 'Anh ấy chọn đồ, cái này cũng không tốt, cái kia cũng không vừa ý.',
      },
    ],
  },
  'X归X，Y归Y': {
    explanationVi:
      'X归X，Y归Y: khẳng định X và Y là hai chuyện tách biệt, không nên trộn lẫn (thân mật hơn "X是X，Y是Y") — "X là chuyện X, Y là chuyện Y".',
    patterns: ['X归X，Y归Y'],
    examples: [
      {
        zh: '朋友归朋友，工作归工作，公私要分明。',
        vi: 'Bạn bè là chuyện bạn bè, công việc là chuyện công việc, phải rạch ròi công tư.',
      },
    ],
  },
  '看你X的/瞧他X的': {
    explanationVi:
      '看你X的/瞧他X的: khẩu ngữ nửa trách móc nửa trìu mến về dáng vẻ/hành động của ai đó — "nhìn cậu/anh ta X kìa".',
    patterns: ['看/瞧 + đại từ + X + 的'],
    examples: [
      {
        zh: '看你紧张的，其实没什么好怕的。',
        vi: 'Nhìn cậu căng thẳng kìa, thực ra chẳng có gì đáng sợ đâu.',
      },
    ],
  },
  '动词/形容词+透+了': {
    explanationVi:
      'Động từ/tính từ + 透 + 了: bổ ngữ mức độ, diễn tả mức độ đạt tới cực điểm, thấu suốt — "...thấu trời", "cực kỳ...".',
    patterns: ['Động từ/Tính từ + 透 + 了'],
    examples: [
      {
        zh: '这件事我看透了他的为人。',
        vi: 'Qua việc này tôi đã nhìn thấu con người anh ta.',
      },
      { zh: '衣服都湿透了。', vi: 'Quần áo ướt sũng hết rồi.' },
    ],
  },
  '（1）主语（非生物体）+把+宾语+动词+其他成分': {
    explanationVi:
      'Câu chữ 把 với chủ ngữ là VẬT VÔ TRI (không phải người), diễn tả vật đó gây tác động lên tân ngữ một cách khách quan/tự nhiên — cách dùng nâng cao, ít gặp trong câu 把 thông thường.',
    patterns: ['S(vật) + 把 + O + Động từ + …'],
    examples: [{ zh: '大风把树刮倒了。', vi: 'Gió lớn thổi làm cây đổ.' }],
  },
  '（2）主语+把+宾语（施事）+动词+其他成分': {
    explanationVi:
      'Câu chữ 把 đặc biệt: tân ngữ sau 把 lại chính là CHỦ THỂ thực hiện hành động phía sau (không phải bị động như thường lệ) — cách dùng nâng cao diễn tả sự khiến/để cho.',
    patterns: ['S + 把 + O(chủ thể hành động) + Động từ + …'],
    examples: [
      {
        zh: '这件事把他急得团团转。',
        vi: 'Việc này khiến anh ấy sốt ruột đến mức xoay như chong chóng.',
      },
    ],
  },
  '一时……一时……': {
    explanationVi:
      '一时……一时……: diễn tả trạng thái thay đổi qua lại liên tục trong thời gian ngắn — "lúc thì..., lúc thì...".',
    patterns: ['一时A，一时B'],
    examples: [
      {
        zh: '天气一时晴，一时阴，让人捉摸不定。',
        vi: 'Thời tiết lúc thì nắng, lúc thì âm u, khiến người ta khó đoán.',
      },
    ],
  },
  '要么……，要么……': {
    explanationVi:
      '要么……，要么……: câu ghép lựa chọn khẩu ngữ, nêu hai (hoặc nhiều) phương án, chọn một trong số đó — "hoặc là..., hoặc là...".',
    patterns: ['要么A，要么B'],
    examples: [
      {
        zh: '要么现在就走，要么再等一会儿。',
        vi: 'Hoặc là đi ngay bây giờ, hoặc là đợi thêm một lát.',
      },
    ],
  },
  '虽……，但/可/却/也……': {
    explanationVi:
      'Dạng rút gọn của 虽然, kết hợp linh hoạt với nhiều từ chuyển ý khác nhau ở vế sau (但/可/却/也) tùy sắc thái mong muốn nhấn mạnh.',
    patterns: ['虽A，但/可/却/也B'],
    examples: [
      {
        zh: '房间虽小，却很温馨。',
        vi: 'Căn phòng tuy nhỏ, nhưng lại rất ấm cúng.',
      },
    ],
  },
  '凡是……，都……': {
    explanationVi:
      '凡是……，都……: nêu MỌI trường hợp thuộc phạm vi được nói tới đều có chung một kết quả — "phàm là..., đều...".',
    patterns: ['凡是A，都B'],
    examples: [
      {
        zh: '凡是来过这里的人，都很喜欢这个地方。',
        vi: 'Phàm là ai từng đến đây, đều rất thích nơi này.',
      },
    ],
  },
  '除非……，才……': {
    explanationVi:
      '除非……，才……: nêu điều kiện DUY NHẤT để kết quả xảy ra — "chỉ khi..., mới...". Nhấn mạnh tính bắt buộc, không có cách nào khác.',
    patterns: ['除非A，才B'],
    examples: [
      {
        zh: '除非你亲自去请，他才会来。',
        vi: 'Chỉ khi cậu đích thân đi mời, anh ấy mới đến.',
      },
    ],
  },
  '除非……，否则/不然……': {
    explanationVi:
      '除非……，否则/不然……: nêu điều kiện DUY NHẤT, nếu không đáp ứng thì hậu quả xấu sẽ xảy ra — "trừ phi..., nếu không thì...".',
    patterns: ['除非A，否则/不然B'],
    examples: [
      {
        zh: '除非下大雨，否则比赛照常进行。',
        vi: 'Trừ phi mưa to, nếu không trận đấu vẫn diễn ra như thường.',
      },
    ],
  },
  '就算……，也……': {
    explanationVi:
      '就算……，也……: câu ghép nhượng bộ khẩu ngữ, tương đương 即使…也…/哪怕…也… — "cho dù... cũng...".',
    patterns: ['就算A，也B'],
    examples: [
      {
        zh: '就算失败了，也不后悔。',
        vi: 'Cho dù có thất bại, cũng không hối hận.',
      },
    ],
  },
  '……，以便……': {
    explanationVi:
      '以便: nối vế sau nêu mục đích thuận tiện cho việc gì đó xảy ra dễ dàng hơn, mang tính trang trọng, văn viết — "để tiện cho việc...".',
    patterns: ['A，以便B'],
    examples: [
      {
        zh: '请提前预约，以便安排接待。',
        vi: 'Vui lòng đặt hẹn trước, để tiện sắp xếp tiếp đón.',
      },
    ],
  },
};
