const LOGO_URL = 'https://hanni.dangpham.id.vn/brand/hanni.png';
const BRAND_RED = '#dc3526';

/** HTML email — bảng + style inline cho tương thích rộng (Outlook/Gmail
 * không hỗ trợ flexbox/grid hay <style> ngoài <head> đáng tin cậy). */
function layout(opts: {
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footNote: string;
}): string {
  return `<!DOCTYPE html>
<html lang="vi">
<body style="margin:0;padding:0;background:#f7f3f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eee0da;">
          <tr>
            <td style="background:${BRAND_RED};padding:28px 32px;text-align:center;">
              <img src="${LOGO_URL}" width="48" height="48" alt="Hanni" style="border-radius:50%;display:block;margin:0 auto 8px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;">Hanni</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#2b2b2b;">${opts.heading}</h1>
              <div style="font-size:15px;line-height:1.6;color:#4a4a4a;">${opts.bodyHtml}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px;background:${BRAND_RED};">
                    <a href="${opts.ctaUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${opts.ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#9a9a9a;word-break:break-all;">
                Nếu nút không hoạt động, sao chép đường dẫn này vào trình duyệt:<br>
                <a href="${opts.ctaUrl}" style="color:${BRAND_RED};">${opts.ctaUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#faf7f5;border-top:1px solid #eee0da;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9a9a;">${opts.footNote}</p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#b3b3b3;">Hanni — Học tiếng Trung theo HSK 3.0</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verifyEmailHtml(link: string): string {
  return layout({
    heading: 'Xác minh email của bạn',
    bodyHtml:
      'Chào bạn! Bấm nút bên dưới để xác minh địa chỉ email và bắt đầu hành trình học tiếng Trung cùng Hanni.',
    ctaLabel: 'Xác minh email',
    ctaUrl: link,
    footNote:
      'Nếu bạn không tạo tài khoản Hanni, có thể bỏ qua email này một cách an toàn.',
  });
}

export function passwordResetHtml(link: string): string {
  return layout({
    heading: 'Đặt lại mật khẩu',
    bodyHtml:
      'Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Hanni này. Bấm nút bên dưới để chọn mật khẩu mới — liên kết có hiệu lực trong thời gian ngắn.',
    ctaLabel: 'Đặt lại mật khẩu',
    ctaUrl: link,
    footNote:
      'Nếu bạn không yêu cầu điều này, có thể bỏ qua email — mật khẩu hiện tại của bạn vẫn an toàn.',
  });
}

function statRow(label: string, value: string, last = false): string {
  const border = last ? '' : 'border-bottom:1px solid #eee0da;';
  return `<tr>
    <td style="padding:10px 0;${border}">${label}</td>
    <td style="padding:10px 0;${border}text-align:right;font-weight:700;">${value}</td>
  </tr>`;
}

export function weeklyDigestHtml(opts: {
  displayName: string;
  daysStudied: number;
  wordsReviewed: number;
  wordsLearned: number;
  currentStreak: number;
  appUrl: string;
}): string {
  const active = opts.daysStudied > 0;
  const bodyHtml = active
    ? `Chào ${opts.displayName}! Đây là tổng kết tuần học tiếng Trung của bạn trên Hanni:
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        ${statRow('📅 Số ngày đã học', `${opts.daysStudied}/7 ngày`)}
        ${statRow('📖 Từ đã ôn', String(opts.wordsReviewed))}
        ${statRow('✨ Từ mới đã thuộc', String(opts.wordsLearned))}
        ${statRow('🔥 Chuỗi ngày hiện tại', `${opts.currentStreak} ngày`, true)}
      </table>
      Tiếp tục giữ nhịp học này nhé!`
    : `Chào ${opts.displayName}! Tuần này bạn chưa ghi nhận buổi học nào trên Hanni. Chỉ cần vài phút mỗi ngày là đủ để giữ vốn từ vựng không bị quên — quay lại học ngay nhé!`;

  return layout({
    heading: active
      ? 'Tổng kết tuần học của bạn'
      : 'Đã lâu không gặp bạn trên Hanni',
    bodyHtml,
    ctaLabel: active ? 'Tiếp tục học' : 'Quay lại học ngay',
    ctaUrl: opts.appUrl,
    footNote:
      'Bạn nhận được email này vì đã bật "Email tổng kết tuần" trong Cài đặt trên Hanni — có thể tắt bất cứ lúc nào tại mục Cài đặt.',
  });
}
