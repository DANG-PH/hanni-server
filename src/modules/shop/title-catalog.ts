export interface Title {
  key: string;
  label: string;
  price: number;
}

/**
 * Danh hiệu — vật phẩm trang trí THỨ HAI (sau khung avatar), hiện dạng CHỮ
 * cạnh tên trên hồ sơ công khai thay vì viền quanh avatar. Cùng lý do mua
 * đứt bằng xu, KHÔNG dùng cơ chế rương/random reward như `frame-catalog.ts`
 * đã giải thích — xu ở đây có thể nạp bằng tiền thật qua payOS.
 */
export const TITLE_CATALOG: Title[] = [
  { key: 'diligent', label: 'Chăm chỉ', price: 100 },
  { key: 'night_owl', label: 'Cú đêm', price: 100 },
  { key: 'bookworm', label: 'Mọt sách', price: 200 },
  { key: 'rising_star', label: 'Ngôi sao mới nổi', price: 200 },
  { key: 'vocab_master', label: 'Bậc thầy từ vựng', price: 400 },
  { key: 'legend', label: 'Huyền thoại', price: 800 },
];
