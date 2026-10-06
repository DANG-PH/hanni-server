import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const OPTIONAL_AUTH_KEY = 'optionalAuth';

/** Đánh dấu route không cần đăng nhập (JwtAuthGuard sẽ bỏ qua). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Khách gọi được, nhưng NẾU có token thì phải hợp lệ và `@CurrentUser()` có
 * giá trị (vd đề thi thử: khách làm được, người đăng nhập được lưu điểm). Token
 * hết hạn thì trả 401 để client tự làm mới rồi gửi lại — không âm thầm coi như
 * khách, mất điểm của người đã đăng nhập. `@Public()` thì không đọc token. */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
