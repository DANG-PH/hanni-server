/**
 * Cache trong tiến trình cho dữ liệu nội dung ít đổi và giống nhau với mọi người.
 *
 * Giữ Promise chứ không giữ kết quả: 100 request cùng lúc lúc cache hết hạn chỉ tạo 1 lượt đọc CSDL, 99 lượt còn lại chờ
 * chung. Không có bước này thì đúng lúc đông nhất, hết hạn cache lại dồn cả 100 lượt vào CSDL.
 *
 * Mỗi tiến trình 1 bản và không xoá chủ động nên dữ liệu có thể cũ tối đa bằng hạn cache: chỉ dùng cho nội dung chấp nhận được
 * điều đó, không dùng cho tiến độ của người học.
 */
export class TtlMemo<T> {
  private readonly entries = new Map<
    string | number,
    { at: number; value: Promise<T> }
  >();

  constructor(private readonly ttlMs: number) {}

  get(
    key: string | number,
    load: () => Promise<T>,
    now = Date.now(),
  ): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && now - hit.at < this.ttlMs) return hit.value;
    const value = load();
    this.entries.set(key, { at: now, value });
    // Lỗi tạm thời không được nằm lại trong cache tới hết hạn.
    value.catch(() => this.entries.delete(key));
    return value;
  }
}
