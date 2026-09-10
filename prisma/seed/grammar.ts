import { PrismaClient } from '@prisma/client';
import { pinyin } from 'pinyin-pro';

/**
 * Điểm ngữ pháp HSK 1–3 — nội dung do Hanni soạn (dataset từ vựng không có
 * ngữ pháp). Pinyin của câu ví dụ sinh tự động khi seed.
 */
interface GP {
  slug: string;
  hskLevel: number;
  titleZh: string;
  titleVi: string;
  summaryVi: string;
  explanationVi: string;
  patterns: string[];
  examples: { zh: string; vi: string }[];
}

const GRAMMAR: GP[] = [
  // ---------- HSK 1 ----------
  {
    slug: 'shi',
    hskLevel: 1,
    titleZh: '是',
    titleVi: 'Câu với 是 — "A là B"',
    summaryVi: 'Dùng 是 để nối hai danh từ, khẳng định A chính là B. Phủ định: 不是.',
    explanationVi:
      '是 đứng giữa chủ ngữ và danh từ làm vị ngữ. KHÔNG dùng 是 trước tính từ (nói 我很高, không nói 我是高).\nPhủ định: 不是. Câu hỏi: thêm 吗 hoặc dùng 是不是.',
    patterns: ['A + 是 + B', 'A + 不是 + B'],
    examples: [
      { zh: '我是学生。', vi: 'Tôi là học sinh.' },
      { zh: '他不是老师。', vi: 'Anh ấy không phải giáo viên.' },
    ],
  },
  {
    slug: 'de-possessive',
    hskLevel: 1,
    titleZh: '的',
    titleVi: 'Trợ từ 的 — sở hữu và định ngữ',
    summaryVi: '的 đứng sau từ bổ nghĩa, trước danh từ trung tâm: "của tôi", "cái áo màu đỏ".',
    explanationVi:
      'Danh từ/đại từ + 的 + danh từ → quan hệ sở hữu (我的书 = sách của tôi).\nVới quan hệ thân thiết hoặc tập thể, thường lược 的: 我妈妈, 我们学校.\nTính từ nhiều âm tiết / cụm + 的 + danh từ → định ngữ (漂亮的衣服).',
    patterns: ['Đại từ/Danh từ + 的 + Danh từ', 'Tính từ + 的 + Danh từ'],
    examples: [
      { zh: '这是我的手机。', vi: 'Đây là điện thoại của tôi.' },
      { zh: '她是一个很好的朋友。', vi: 'Cô ấy là một người bạn rất tốt.' },
    ],
  },
  {
    slug: 'bu-negation',
    hskLevel: 1,
    titleZh: '不',
    titleVi: 'Phủ định với 不',
    summaryVi: '不 phủ định động từ/tính từ ở hiện tại, tương lai, hoặc thói quen, ý muốn.',
    explanationVi:
      '不 + động từ/tính từ. Dùng cho: hiện tại (我不忙), tương lai (明天我不去), thói quen (我不喝咖啡), ý chí (我不想去).\nRiêng "đã không xảy ra" thì dùng 没, không dùng 不.',
    patterns: ['不 + Động từ / Tính từ'],
    examples: [
      { zh: '我不喝酒。', vi: 'Tôi không uống rượu.' },
      { zh: '今天不冷。', vi: 'Hôm nay không lạnh.' },
    ],
  },
  {
    slug: 'meiyou-negation',
    hskLevel: 1,
    titleZh: '没(有)',
    titleVi: 'Phủ định với 没(有)',
    summaryVi: '没(有) phủ định hành động ĐÃ / CHƯA xảy ra, hoặc phủ định "có" (sở hữu, tồn tại).',
    explanationVi:
      '没(有) + động từ → việc chưa/không xảy ra trong quá khứ (我没去 = tôi đã không đi).\n没有 + danh từ → không có (我没有钱).\nSau 没 KHÔNG dùng 了.',
    patterns: ['没(有) + Động từ', 'A + 没有 + Danh từ'],
    examples: [
      { zh: '我昨天没上班。', vi: 'Hôm qua tôi không đi làm.' },
      { zh: '他没有孩子。', vi: 'Anh ấy không có con.' },
    ],
  },
  {
    slug: 'ma-question',
    hskLevel: 1,
    titleZh: '吗',
    titleVi: 'Câu hỏi có / không với 吗',
    summaryVi: 'Thêm 吗 vào cuối câu trần thuật để hỏi "có phải ... không?".',
    explanationVi:
      'Câu trần thuật + 吗？ Người nghe trả lời có (是/对/động từ) hoặc không (不/没).\nKhông dùng 吗 khi trong câu đã có từ nghi vấn khác (谁, 什么, 几...).',
    patterns: ['Câu trần thuật + 吗？'],
    examples: [
      { zh: '你是中国人吗？', vi: 'Bạn là người Trung Quốc à?' },
      { zh: '你吃饭了吗？', vi: 'Bạn ăn cơm chưa?' },
    ],
  },
  {
    slug: 'ne-question',
    hskLevel: 1,
    titleZh: '呢',
    titleVi: 'Câu hỏi với 呢 — "còn ... thì sao?"',
    summaryVi: 'Danh từ/đại từ + 呢 để hỏi lại cùng nội dung; hoặc hỏi vị trí "... đâu rồi?".',
    explanationVi:
      'A 呢？ sau một câu hỏi trước đó = "còn A thì sao?" (我很好，你呢？).\nDanh từ + 呢？ khi không có ngữ cảnh trước = hỏi vị trí (我的钥匙呢？ = chìa khoá của tôi đâu?).',
    patterns: ['Danh từ / Đại từ + 呢？'],
    examples: [
      { zh: '我喜欢咖啡，你呢？', vi: 'Tôi thích cà phê, còn bạn?' },
      { zh: '我的手机呢？', vi: 'Điện thoại của tôi đâu rồi?' },
    ],
  },
  {
    slug: 'zai-location',
    hskLevel: 1,
    titleZh: '在',
    titleVi: 'Động từ 在 — "ở tại"',
    summaryVi: 'Chủ ngữ + 在 + địa điểm: cho biết ai/cái gì ở đâu.',
    explanationVi:
      '在 làm động từ chính: 我在家 (tôi ở nhà). Phủ định: 不在 (他不在办公室).\nLưu ý phân biệt với 在 + động từ (đang làm) — xem điểm "正在".',
    patterns: ['Chủ ngữ + 在 + Địa điểm', 'Chủ ngữ + 不在 + Địa điểm'],
    examples: [
      { zh: '老师在教室里。', vi: 'Giáo viên ở trong lớp học.' },
      { zh: '爸爸现在不在家。', vi: 'Bây giờ bố không có ở nhà.' },
    ],
  },
  {
    slug: 'you-existence',
    hskLevel: 1,
    titleZh: '有',
    titleVi: 'Động từ 有 — tồn tại và sở hữu',
    summaryVi: 'Người + 有 + danh từ = sở hữu. Nơi chốn + 有 + danh từ = có tồn tại. Phủ định luôn là 没有.',
    explanationVi:
      '我有一辆车 (tôi có một chiếc xe). 桌子上有一本书 (trên bàn có một quyển sách).\nPhủ định KHÔNG dùng 不有, luôn là 没有.',
    patterns: ['Người + 有 + Danh từ', 'Nơi chốn + 有 + Danh từ', '… + 没有 + …'],
    examples: [
      { zh: '我们班有二十个学生。', vi: 'Lớp chúng tôi có hai mươi học sinh.' },
      { zh: '冰箱里没有水果。', vi: 'Trong tủ lạnh không có trái cây.' },
    ],
  },
  {
    slug: 'xiang-yao-want',
    hskLevel: 1,
    titleZh: '想 / 要',
    titleVi: 'Muốn làm gì: 想 và 要',
    summaryVi: '想 + động từ = muốn / dự định (nhẹ). 要 + động từ = muốn / sẽ (ý chí mạnh hơn).',
    explanationVi:
      '想 thiên về mong muốn, suy nghĩ: 我想去中国.\n要 thiên về quyết tâm, kế hoạch chắc chắn: 我要学好汉语.\nPhủ định của 要 (muốn) thường là 不想; 不要 nghĩa là "đừng".',
    patterns: ['想 + Động từ', '要 + Động từ', '不想 + Động từ'],
    examples: [
      { zh: '我想喝一杯茶。', vi: 'Tôi muốn uống một tách trà.' },
      { zh: '他要去北京工作。', vi: 'Anh ấy sẽ đi Bắc Kinh làm việc.' },
    ],
  },
  {
    slug: 'tai-le',
    hskLevel: 1,
    titleZh: '太…了',
    titleVi: 'Mức độ cao: 太 + Tính từ + 了',
    summaryVi: 'Diễn tả "quá ...", thường kèm cảm xúc (khen hoặc than).',
    explanationVi:
      '太 + tính từ + 了: 太好了！(tuyệt quá!), 太贵了 (đắt quá).\n太 + không + tính từ + 了 = "không ... lắm" một cách lịch sự: 太不方便了.',
    patterns: ['太 + Tính từ + 了'],
    examples: [
      { zh: '这个菜太辣了。', vi: 'Món này cay quá.' },
      { zh: '今天太热了！', vi: 'Hôm nay nóng quá!' },
    ],
  },
  {
    slug: 'ji-duoshao',
    hskLevel: 1,
    titleZh: '几 / 多少',
    titleVi: 'Hỏi số lượng: 几 và 多少',
    summaryVi: '几 hỏi số nhỏ (thường < 10) và LUÔN đi kèm lượng từ. 多少 hỏi số bất kỳ, có thể bỏ lượng từ.',
    explanationVi:
      '几 + lượng từ + danh từ: 你有几个孩子？\n多少 + (lượng từ) + danh từ: 这个多少钱？ 你们学校有多少学生？',
    patterns: ['几 + lượng từ + Danh từ', '多少 + (lượng từ) + Danh từ'],
    examples: [
      { zh: '现在几点？', vi: 'Bây giờ mấy giờ?' },
      { zh: '这些苹果多少钱？', vi: 'Những quả táo này bao nhiêu tiền?' },
    ],
  },
  {
    slug: 'he-and',
    hskLevel: 1,
    titleZh: '和',
    titleVi: 'Liên từ 和 — "và" (nối danh từ)',
    summaryVi: '和 chỉ nối danh từ / cụm danh từ, KHÔNG nối hai mệnh đề hay hai động từ.',
    explanationVi:
      '我和你 (tôi và bạn), 苹果和香蕉.\nSai: "我去和他来" — để nối hành động/mệnh đề, dùng 然后, 也, hoặc tách câu.',
    patterns: ['Danh từ + 和 + Danh từ'],
    examples: [
      { zh: '我和我的朋友去看电影。', vi: 'Tôi và bạn tôi đi xem phim.' },
      { zh: '我喜欢喝茶和咖啡。', vi: 'Tôi thích uống trà và cà phê.' },
    ],
  },

  // ---------- HSK 2 ----------
  {
    slug: 'le-completion',
    hskLevel: 2,
    titleZh: '了 (hoàn thành)',
    titleVi: 'Trợ từ 了 — hành động đã hoàn thành / xảy ra',
    summaryVi: '了 sau động từ cho biết hành động đã hoàn thành. Không đồng nghĩa với "thì quá khứ".',
    explanationVi:
      'Động từ + 了: 我买了一件衣服.\nNếu tân ngữ "trần" (không có số/định ngữ), thường cần thêm thành phần khác hoặc 了 cuối câu: 我吃饭了.\nPhủ định: bỏ 了, dùng 没: 我没买衣服.',
    patterns: ['Động từ + 了 + (số lượng) + tân ngữ', 'Câu + 了 (thay đổi / hoàn thành)'],
    examples: [
      { zh: '我昨天看了两部电影。', vi: 'Hôm qua tôi đã xem hai bộ phim.' },
      { zh: '下雨了，我们回家吧。', vi: 'Mưa rồi, chúng ta về nhà thôi.' },
    ],
  },
  {
    slug: 'guo-experience',
    hskLevel: 2,
    titleZh: '过',
    titleVi: 'Trợ từ 过 — từng trải nghiệm',
    summaryVi: 'Động từ + 过: đã từng làm việc gì đó (ít nhất một lần trong đời).',
    explanationVi:
      '我去过中国 (tôi đã từng đến Trung Quốc).\nPhủ định: 没(有) + động từ + 过: 我没去过.\nKhác 了: 过 nhấn mạnh kinh nghiệm, 了 nhấn mạnh sự hoàn thành.',
    patterns: ['Động từ + 过', '没(有) + Động từ + 过'],
    examples: [
      { zh: '你吃过北京烤鸭吗？', vi: 'Bạn từng ăn vịt quay Bắc Kinh chưa?' },
      { zh: '我没学过法语。', vi: 'Tôi chưa từng học tiếng Pháp.' },
    ],
  },
  {
    slug: 'zhengzai-progressive',
    hskLevel: 2,
    titleZh: '(正)在…(呢)',
    titleVi: 'Đang diễn ra: (正)在 + Động từ',
    summaryVi: 'Diễn tả hành động đang tiếp diễn ngay lúc nói hoặc lúc được nhắc tới.',
    explanationVi:
      '(正)在 + động từ + (呢): 他在打电话(呢).\n正在 nhấn mạnh "đúng vào lúc đó". Có thể chỉ dùng 呢 ở cuối câu.\nPhủ định: 没在 hoặc 不是在… (没在睡觉).',
    patterns: ['(正)在 + Động từ + (呢)'],
    examples: [
      { zh: '妈妈正在做饭呢。', vi: 'Mẹ đang nấu cơm đấy.' },
      { zh: '我给他打电话的时候，他在开车。', vi: 'Lúc tôi gọi cho anh ấy, anh ấy đang lái xe.' },
    ],
  },
  {
    slug: 'hui-neng-keyi',
    hskLevel: 2,
    titleZh: '会 / 能 / 可以',
    titleVi: 'Ba động từ năng nguyện: 会, 能, 可以',
    summaryVi: '会 = biết làm (kỹ năng học được). 能 = có khả năng / điều kiện. 可以 = được phép.',
    explanationVi:
      '会: 我会游泳 (tôi biết bơi) — cũng chỉ khả năng xảy ra (明天会下雨).\n能: 我今天不能来 (hôm nay tôi không đến được) — điều kiện, sức khoẻ, năng lực cụ thể.\n可以: 这里可以抽烟吗？ (ở đây được hút thuốc không?) — xin phép / cho phép.',
    patterns: ['会 / 能 / 可以 + Động từ'],
    examples: [
      { zh: '她会说三种语言。', vi: 'Cô ấy biết nói ba thứ tiếng.' },
      { zh: '我可以坐这儿吗？', vi: 'Tôi ngồi đây được không?' },
    ],
  },
  {
    slug: 'bi-comparison',
    hskLevel: 2,
    titleZh: '比',
    titleVi: 'So sánh hơn với 比',
    summaryVi: 'A + 比 + B + tính từ: "A ... hơn B". Không dùng 很/非常 trước tính từ.',
    explanationVi:
      '今天比昨天热 (hôm nay nóng hơn hôm qua).\nMức chênh lệch đặt SAU tính từ: 他比我大三岁 (anh ấy hơn tôi ba tuổi); 好一点儿 / 好得多.\nPhủ định thường dùng 没有: 我没有他高 (tôi không cao bằng anh ấy).',
    patterns: ['A + 比 + B + Tính từ (+ mức chênh lệch)', 'A + 没有 + B + Tính từ'],
    examples: [
      { zh: '这件衣服比那件贵一点儿。', vi: 'Cái áo này đắt hơn cái kia một chút.' },
      { zh: '坐地铁比坐公交车快得多。', vi: 'Đi tàu điện nhanh hơn đi xe buýt nhiều.' },
    ],
  },
  {
    slug: 'yi-jiu',
    hskLevel: 2,
    titleZh: '一…就…',
    titleVi: '一 … 就 … — "vừa ... là ..."',
    summaryVi: 'Hai việc nối nhau rất nhanh, hoặc quan hệ hễ ... thì ...',
    explanationVi:
      '一 + V1 …, 就 + V2 …: 我一到家就给你打电话 (tôi vừa về đến nhà là gọi cho bạn ngay).\nCũng diễn tả quy luật: 他一喝酒就脸红 (hễ uống rượu là mặt anh ấy đỏ).',
    patterns: ['一 + Mệnh đề 1, 就 + Mệnh đề 2'],
    examples: [
      { zh: '我一下课就去食堂。', vi: 'Tôi vừa tan học là đi căng tin ngay.' },
      { zh: '她一紧张就说不出话。', vi: 'Hễ căng thẳng là cô ấy không nói nên lời.' },
    ],
  },
  {
    slug: 'yinwei-suoyi',
    hskLevel: 2,
    titleZh: '因为…所以…',
    titleVi: '因为 … 所以 … — nguyên nhân, kết quả',
    summaryVi: 'Nêu lý do rồi nêu kết quả. Có thể lược một trong hai vế.',
    explanationVi:
      '因为下雨，所以我们没去公园.\nTrong tiếng Trung, dùng CẢ HAI 因为…所以… trong một câu là bình thường (khác tiếng Việt).\nCó thể chỉ dùng 因为 (đặt lý do sau) hoặc chỉ 所以.',
    patterns: ['因为 + lý do, 所以 + kết quả'],
    examples: [
      { zh: '因为今天是周末，所以路上人很多。', vi: 'Vì hôm nay là cuối tuần nên trên đường rất đông người.' },
      { zh: '我因为身体不舒服，没去上课。', vi: 'Vì tôi thấy trong người không khoẻ nên không đi học.' },
    ],
  },
  {
    slug: 'suiran-danshi',
    hskLevel: 2,
    titleZh: '虽然…但是…',
    titleVi: '虽然 … 但是 … — "tuy ... nhưng ..."',
    summaryVi: 'Vế sau trái với mong đợi từ vế trước. 但是 có thể thay bằng 可是.',
    explanationVi:
      '虽然天气很冷，但是他还是去跑步了.\nCũng thường dùng cả hai liên từ trong một câu.\n但是/可是 đứng đầu vế sau.',
    patterns: ['虽然 + Mệnh đề 1, 但是/可是 + Mệnh đề 2'],
    examples: [
      { zh: '虽然这个工作很累，但是我很喜欢。', vi: 'Tuy công việc này rất mệt nhưng tôi rất thích.' },
      { zh: '他虽然年轻，可是很有经验。', vi: 'Anh ấy tuy trẻ nhưng rất có kinh nghiệm.' },
    ],
  },
  {
    slug: 'de-degree',
    hskLevel: 2,
    titleZh: '得 (bổ ngữ trạng thái)',
    titleVi: 'Bổ ngữ mức độ: Động từ + 得 + Tính từ',
    summaryVi: 'Đánh giá hành động được thực hiện tốt / nhanh / như thế nào.',
    explanationVi:
      '他跑得很快 (anh ấy chạy rất nhanh).\nNếu động từ có tân ngữ, phải lặp động từ: 他说汉语说得很好.\nPhủ định đặt sau 得: 说得不好.',
    patterns: ['Động từ + 得 + (很/不) + Tính từ', '(Động từ + tân ngữ +) Động từ + 得 + Tính từ'],
    examples: [
      { zh: '你今天来得很早。', vi: 'Hôm nay bạn đến rất sớm.' },
      { zh: '她钢琴弹得非常好。', vi: 'Cô ấy chơi piano rất hay.' },
    ],
  },
  {
    slug: 'jiu-cai',
    hskLevel: 2,
    titleZh: '就 / 才',
    titleVi: '就 và 才 — sớm/nhanh so với muộn/chậm',
    summaryVi: '就 = sớm hơn, nhanh hơn, dễ hơn mong đợi. 才 = muộn hơn, khó hơn mong đợi.',
    explanationVi:
      '他六点就起床了 (mới 6 giờ anh ấy đã dậy — sớm).\n他八点才起床 (8 giờ anh ấy mới dậy — muộn).\nCâu có 就 thường kết thúc bằng 了; câu có 才 thường KHÔNG dùng 了.',
    patterns: ['… 就 + Động từ + 了', '… 才 + Động từ'],
    examples: [
      { zh: '我说一遍他就懂了。', vi: 'Tôi nói một lần là anh ấy hiểu ngay.' },
      { zh: '我等了一个小时，他才来。', vi: 'Tôi đợi một tiếng đồng hồ anh ấy mới đến.' },
    ],
  },
  {
    slug: 'ba-basic',
    hskLevel: 2,
    titleZh: '把',
    titleVi: 'Câu chữ 把 — xử lý tân ngữ',
    summaryVi: 'Đưa tân ngữ XÁC ĐỊNH lên trước động từ để nói hành động tác động thế nào lên nó.',
    explanationVi:
      'Chủ ngữ + 把 + tân ngữ + động từ + thành phần khác (了 / 结果 / 地点 …).\n把 dùng khi tân ngữ là vật cụ thể, xác định, và hành động làm nó THAY ĐỔI / DI CHUYỂN: 请把门关上.\nĐộng từ không đứng trơ — phải có thêm 了, bổ ngữ, hoặc lặp lại.',
    patterns: ['Chủ ngữ + 把 + tân ngữ + Động từ + thành phần khác'],
    examples: [
      { zh: '请把窗户打开。', vi: 'Làm ơn mở cửa sổ ra.' },
      { zh: '我把作业做完了。', vi: 'Tôi đã làm xong bài tập.' },
    ],
  },
  {
    slug: 'rang-jiao',
    hskLevel: 2,
    titleZh: '让 / 叫',
    titleVi: 'Câu kiêm ngữ: 让 / 叫 + ai + làm gì',
    summaryVi: 'A bảo / khiến B làm việc gì. B vừa là tân ngữ của 让/叫, vừa là chủ ngữ của động từ sau.',
    explanationVi:
      '妈妈让我早点儿回家 (mẹ bảo tôi về nhà sớm hơn).\n叫 mang sắc thái ra lệnh hơn 让.\nPhủ định: 不让 / 没让 (đặt trước 让).',
    patterns: ['A + 让/叫 + B + Động từ'],
    examples: [
      { zh: '老师让我们每天听录音。', vi: 'Giáo viên bảo chúng tôi nghe băng ghi âm mỗi ngày.' },
      { zh: '爸爸不让我玩游戏。', vi: 'Bố không cho tôi chơi game.' },
    ],
  },
  {
    slug: 'shi-de',
    hskLevel: 2,
    titleZh: '是…的',
    titleVi: 'Cấu trúc 是 … 的 — nhấn mạnh chi tiết của việc đã xảy ra',
    summaryVi: 'Với một việc đã xảy ra, dùng 是 … 的 để hỏi / nhấn mạnh thời gian, nơi chốn, cách thức, người thực hiện.',
    explanationVi:
      '我是昨天到的 (tôi đến VÀO HÔM QUA).\n是 đứng trước phần cần nhấn, 的 đứng cuối (hoặc trước tân ngữ).\nKhác 了: 是…的 tập trung vào "như thế nào", 了 tập trung vào "đã xong".',
    patterns: ['是 + (thời gian / nơi chốn / cách thức) + Động từ + 的'],
    examples: [
      { zh: '你是怎么来的？', vi: 'Bạn đến bằng cách nào?' },
      { zh: '这本书是在图书馆借的。', vi: 'Quyển sách này mượn ở thư viện.' },
    ],
  },
  {
    slug: 'cong-dao',
    hskLevel: 2,
    titleZh: '从…到…',
    titleVi: '从 … 到 … — "từ ... đến ..."',
    summaryVi: 'Chỉ khoảng thời gian hoặc quãng đường có điểm đầu và điểm cuối.',
    explanationVi:
      '从早上八点到下午五点 (từ 8 giờ sáng đến 5 giờ chiều).\n从北京到上海 (từ Bắc Kinh đến Thượng Hải).\nCó thể kết hợp: 从…到…都/一直….',
    patterns: ['从 + điểm đầu + 到 + điểm cuối'],
    examples: [
      { zh: '我从周一到周五都很忙。', vi: 'Từ thứ Hai đến thứ Sáu tôi đều rất bận.' },
      { zh: '从我家到公司要半个小时。', vi: 'Từ nhà tôi đến công ty mất nửa tiếng.' },
    ],
  },
  {
    slug: 'you-you',
    hskLevel: 2,
    titleZh: '又…又…',
    titleVi: '又 … 又 … — "vừa ... vừa ..."',
    summaryVi: 'Nêu hai tính chất / trạng thái cùng tồn tại. Sau 又 là tính từ hoặc động từ.',
    explanationVi:
      '这个房间又大又亮 (căn phòng này vừa rộng vừa sáng).\nHai vế thường cùng sắc thái (cùng khen hoặc cùng chê).\nKhác 一边…一边… (hai hành động đồng thời).',
    patterns: ['又 + A + 又 + B'],
    examples: [
      { zh: '他做的菜又好吃又便宜。', vi: 'Món anh ấy nấu vừa ngon vừa rẻ.' },
      { zh: '我又累又饿。', vi: 'Tôi vừa mệt vừa đói.' },
    ],
  },
  {
    slug: 'yidianr',
    hskLevel: 2,
    titleZh: '(有)一点儿 / 一点儿',
    titleVi: 'Phân biệt 有一点儿 và 一点儿',
    summaryVi: '有(一)点儿 + tính từ = "hơi ..." (thường ý không hài lòng). Tính từ + 一点儿 = "... hơn một chút".',
    explanationVi:
      '今天有点儿冷 (hôm nay hơi lạnh — đứng trước tính từ, ý than).\n请慢一点儿 (xin chậm hơn một chút — đứng sau tính từ, ý so sánh/đề nghị).\n一点儿 cũng làm tân ngữ: 我会说一点儿汉语.',
    patterns: ['有(一)点儿 + Tính từ', 'Tính từ + 一点儿'],
    examples: [
      { zh: '这双鞋有点儿小。', vi: 'Đôi giày này hơi nhỏ.' },
      { zh: '你能不能便宜一点儿？', vi: 'Bạn có thể bớt một chút được không?' },
    ],
  },

  // ---------- HSK 3 ----------
  {
    slug: 'bei-passive',
    hskLevel: 3,
    titleZh: '被',
    titleVi: 'Câu bị động với 被',
    summaryVi: 'A + 被 + (B) + động từ + thành phần khác: A bị B tác động. Người gây ra (B) có thể lược.',
    explanationVi:
      '我的自行车被(人)偷了 (xe đạp của tôi bị (người ta) lấy trộm).\nĐộng từ phải có thêm 了 / bổ ngữ, không đứng trơ.\nThường mang sắc thái việc không mong muốn (nhưng không bắt buộc).',
    patterns: ['A + 被 + (B) + Động từ + thành phần khác'],
    examples: [
      { zh: '蛋糕被弟弟吃完了。', vi: 'Bánh kem bị em trai ăn hết rồi.' },
      { zh: '他被老板批评了一顿。', vi: 'Anh ấy bị sếp mắng một trận.' },
    ],
  },
  {
    slug: 'yibian-yibian',
    hskLevel: 3,
    titleZh: '一边…一边…',
    titleVi: '一边 … 一边 … — làm hai việc cùng lúc',
    summaryVi: 'Hai hành động diễn ra song song, do cùng một chủ ngữ.',
    explanationVi:
      '他一边吃饭一边看电视 (anh ấy vừa ăn cơm vừa xem tivi).\nSau mỗi 一边 là một động từ.\nKhẩu ngữ có thể rút gọn thành 边…边….',
    patterns: ['一边 + Động từ 1, 一边 + Động từ 2'],
    examples: [
      { zh: '我喜欢一边跑步一边听音乐。', vi: 'Tôi thích vừa chạy bộ vừa nghe nhạc.' },
      { zh: '别一边开车一边打电话。', vi: 'Đừng vừa lái xe vừa gọi điện thoại.' },
    ],
  },
  {
    slug: 'yuelaiyue',
    hskLevel: 3,
    titleZh: '越来越…',
    titleVi: '越来越 … — "ngày càng ..."',
    summaryVi: 'Mức độ tăng dần theo thời gian. Sau 越来越 là tính từ hoặc động từ tâm lý.',
    explanationVi:
      '天气越来越冷了 (trời ngày càng lạnh).\nKhông dùng 很 sau 越来越.\nThường có 了 ở cuối câu để nhấn sự thay đổi.',
    patterns: ['越来越 + Tính từ / Động từ tâm lý'],
    examples: [
      { zh: '他的汉语越来越好了。', vi: 'Tiếng Trung của anh ấy ngày càng tốt.' },
      { zh: '我越来越喜欢这个城市。', vi: 'Tôi ngày càng thích thành phố này.' },
    ],
  },
  {
    slug: 'yue-yue',
    hskLevel: 3,
    titleZh: '越 A 越 B',
    titleVi: '越 … 越 … — "càng ... càng ..."',
    summaryVi: 'Mức độ của B thay đổi theo mức độ của A. Có thể cùng chủ ngữ hoặc khác chủ ngữ.',
    explanationVi:
      '雨越下越大 (mưa càng lúc càng to).\n你越着急越做不好 (bạn càng vội càng làm không tốt).\nKhác 越来越 (thay đổi theo thời gian, không có vế A).',
    patterns: ['越 + A + 越 + B'],
    examples: [
      { zh: '这本书越看越有意思。', vi: 'Quyển sách này càng đọc càng thú vị.' },
      { zh: '东西越贵不一定越好。', vi: 'Đồ càng đắt chưa chắc đã càng tốt.' },
    ],
  },
  {
    slug: 'budan-erqie',
    hskLevel: 3,
    titleZh: '不但…而且…',
    titleVi: '不但 … 而且 … — "không những ... mà còn ..."',
    summaryVi: 'Vế sau tăng tiến so với vế trước. Nếu cùng chủ ngữ, 不但 đứng sau chủ ngữ.',
    explanationVi:
      '他不但会说英语，而且会说法语.\nNếu khác chủ ngữ: 不但 đứng đầu câu — 不但孩子喜欢，而且大人也喜欢.\n而且 có thể thay bằng 并且; vế sau hay có 也/还.',
    patterns: ['不但 + A, 而且 + B (也/还)'],
    examples: [
      { zh: '这家餐厅不但菜好吃，而且服务也很好。', vi: 'Nhà hàng này không những món ngon mà phục vụ cũng rất tốt.' },
      { zh: '他不但没生气，而且还笑了。', vi: 'Anh ấy không những không giận mà còn cười.' },
    ],
  },
  {
    slug: 'ruguo-jiu',
    hskLevel: 3,
    titleZh: '如果…就…',
    titleVi: '如果 … 就 … — "nếu ... thì ..."',
    summaryVi: 'Nêu giả thiết ở vế trước, kết quả ở vế sau (có 就). 如果 có thể thay bằng 要是.',
    explanationVi:
      '如果明天不下雨，我们就去爬山.\n就 đứng đầu vế sau, sau chủ ngữ.\n如果 có thể kèm 的话 ở cuối vế giả thiết: 如果你有时间的话….',
    patterns: ['如果 + giả thiết, (chủ ngữ) 就 + kết quả'],
    examples: [
      { zh: '如果你累了，就休息一下。', vi: 'Nếu bạn mệt thì nghỉ một chút đi.' },
      { zh: '要是有问题，就给我打电话。', vi: 'Nếu có vấn đề gì thì gọi cho tôi.' },
    ],
  },
  {
    slug: 'weile',
    hskLevel: 3,
    titleZh: '为了',
    titleVi: '为了 … — "để / vì (mục đích)"',
    summaryVi: '为了 + mục đích, đặt ở ĐẦU câu, theo sau là hành động nhằm đạt mục đích đó.',
    explanationVi:
      '为了学好汉语，他每天听两个小时录音.\n为了 nêu mục đích; 因为 nêu nguyên nhân — đừng nhầm.\nNói "vì ai đó" cũng dùng được: 为了孩子，他们搬到了城里.',
    patterns: ['为了 + mục đích, + hành động'],
    examples: [
      { zh: '为了赶火车，我早上五点就起床了。', vi: 'Để kịp chuyến tàu, tôi dậy từ 5 giờ sáng.' },
      { zh: '为了身体健康，你应该多运动。', vi: 'Vì sức khoẻ, bạn nên vận động nhiều hơn.' },
    ],
  },
  {
    slug: 'zhe-state',
    hskLevel: 3,
    titleZh: '着',
    titleVi: 'Trợ từ 着 — trạng thái đang duy trì',
    summaryVi: 'Động từ + 着: một trạng thái / tư thế được giữ nguyên, không phải hành động đang tiến triển.',
    explanationVi:
      '门开着 (cửa đang mở). 他手里拿着一本书 (trong tay anh ấy đang cầm một quyển sách).\nHay dùng trong câu tồn tại: 墙上挂着一幅画.\nV1 着 V2 = làm V2 trong lúc giữ tư thế V1: 站着说话.',
    patterns: ['Động từ + 着', 'Động từ 1 + 着 + Động từ 2'],
    examples: [
      { zh: '外面下着雨，别出去了。', vi: 'Bên ngoài đang mưa, đừng ra ngoài nữa.' },
      { zh: '她笑着对我说谢谢。', vi: 'Cô ấy mỉm cười nói cảm ơn tôi.' },
    ],
  },
  {
    slug: 'directional-complement',
    hskLevel: 3,
    titleZh: '上/下/进/出/回/过 + 来/去',
    titleVi: 'Bổ ngữ xu hướng — hướng di chuyển',
    summaryVi: 'Sau động từ, thêm 上/下/进/出/回/过… và 来/去 để chỉ hướng so với vị trí người nói.',
    explanationVi:
      '来 = hướng về phía người nói; 去 = hướng ra xa.\n他走进来了 (anh ấy đi vào — về phía tôi). 请拿出去 (mang ra ngoài đi).\nTân ngữ nơi chốn đặt TRƯỚC 来/去: 走进房间来.',
    patterns: ['Động từ + 上/下/进/出/回/过 + 来/去'],
    examples: [
      { zh: '老师走进教室来了。', vi: 'Giáo viên đi vào lớp học.' },
      { zh: '天太热了，把外套脱下来吧。', vi: 'Trời nóng quá, cởi áo khoác ra đi.' },
    ],
  },
  {
    slug: 'resultative-complement',
    hskLevel: 3,
    titleZh: '完 / 好 / 到 / 见 …',
    titleVi: 'Bổ ngữ kết quả — kết quả của hành động',
    summaryVi: 'Động từ + 完/好/到/见/懂/错… cho biết hành động đạt kết quả gì.',
    explanationVi:
      '吃完 (ăn xong), 做好 (làm xong xuôi), 找到 (tìm thấy), 听懂 (nghe hiểu), 看见 (nhìn thấy), 写错 (viết sai).\nPhủ định dùng 没: 我没听懂.\nHỏi khả năng: 听得懂 / 听不懂.',
    patterns: ['Động từ + 完/好/到/见/懂/错…', '没 + Động từ + bổ ngữ kết quả'],
    examples: [
      { zh: '这本书我还没看完。', vi: 'Quyển sách này tôi vẫn chưa đọc xong.' },
      { zh: '你说的话我没听清楚。', vi: 'Lời bạn nói tôi nghe không rõ.' },
    ],
  },
  {
    slug: 'zhiyao-zhiyou',
    hskLevel: 3,
    titleZh: '只要…就… / 只有…才…',
    titleVi: '只要 … 就 … và 只有 … 才 …',
    summaryVi: '只要 = chỉ cần (một điều kiện là đủ). 只有 = chỉ có (điều kiện duy nhất, thiếu thì không được).',
    explanationVi:
      '只要努力，就一定能成功 (chỉ cần cố gắng là nhất định thành công).\n只有多练习，才能说得流利 (chỉ có luyện tập nhiều mới nói lưu loát được).\n只要 đi với 就; 只有 đi với 才.',
    patterns: ['只要 + điều kiện, 就 + kết quả', '只有 + điều kiện, 才 + kết quả'],
    examples: [
      { zh: '只要你想学，什么时候都不晚。', vi: 'Chỉ cần bạn muốn học thì lúc nào cũng không muộn.' },
      { zh: '只有亲眼看到，我才会相信。', vi: 'Chỉ khi tận mắt nhìn thấy tôi mới tin.' },
    ],
  },
  {
    slug: 'chadianr',
    hskLevel: 3,
    titleZh: '差点儿',
    titleVi: '差点儿 — "suýt nữa thì ..."',
    summaryVi: 'Một việc (thường là không mong muốn) gần xảy ra nhưng cuối cùng KHÔNG xảy ra.',
    explanationVi:
      '我差点儿迟到 (tôi suýt nữa thì đến muộn — nhưng không muộn).\n差点儿没 + động từ với việc MONG muốn = vẫn có nghĩa "suýt không làm được nhưng rồi làm được": 差点儿没赶上火车 (suýt lỡ tàu).\nThường kèm 了.',
    patterns: ['差点儿 + (没) + Động từ'],
    examples: [
      { zh: '路上太滑了，我差点儿摔倒。', vi: 'Đường trơn quá, tôi suýt nữa thì ngã.' },
      { zh: '这道题我差点儿就做对了。', vi: 'Câu này tôi suýt nữa thì làm đúng.' },
    ],
  },
];

export async function seedGrammar(prisma: PrismaClient): Promise<void> {
  let n = 0;
  for (const g of GRAMMAR) {
    const examples = g.examples.map((e) => ({
      zh: e.zh,
      pinyin: pinyin(e.zh, { toneType: 'symbol', nonZh: 'consecutive' }),
      vi: e.vi,
    }));
    await prisma.grammarPoint.upsert({
      where: { slug: g.slug },
      create: {
        slug: g.slug,
        hskLevel: g.hskLevel,
        orderIndex: n,
        titleVi: g.titleVi,
        titleZh: g.titleZh,
        summaryVi: g.summaryVi,
        explanationVi: g.explanationVi,
        patterns: g.patterns,
        examples,
      },
      update: {
        hskLevel: g.hskLevel,
        orderIndex: n,
        titleVi: g.titleVi,
        titleZh: g.titleZh,
        summaryVi: g.summaryVi,
        explanationVi: g.explanationVi,
        patterns: g.patterns,
        examples,
      },
    });
    n += 1;
  }
  console.log(`  ✓ ${n} điểm ngữ pháp HSK 1–3`);
}
