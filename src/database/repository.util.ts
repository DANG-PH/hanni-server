import type {
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/**
 * Thêm 1 dòng rồi đọc lại ĐỦ cột (cả cột null, cột mặc định do DB tự điền). `repo.save()` chỉ trả về các
 * cột đã truyền vào + cột có mặc định — trả thẳng cho client thì thiếu trường so với trước.
 */
export async function insertAndReturn<T extends ObjectLiteral>(
  repo: Repository<T>,
  values: DeepPartial<T>,
): Promise<T> {
  const { identifiers } = await repo.insert(
    values as QueryDeepPartialEntity<T>,
  );
  return repo.findOneByOrFail(identifiers[0] as FindOptionsWhere<T>);
}

/** Chuỗi người dùng gõ đưa vào LIKE/ILIKE: thoát `%`, `_`, `\` để khớp đúng nguyên văn (như Prisma `contains`). */
export function likeEscape(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Thêm 1 dòng nếu chưa có (ON CONFLICT DO NOTHING) — trả `true` nếu VỪA thêm, `false` nếu đã có sẵn.
 * Dùng cho việc chỉ được làm 1 lần (mở huy hiệu, nhận thưởng nhiệm vụ): DB tự chặn khi 2 request
 * chạy cùng lúc, không phải đọc-rồi-ghi.
 */
export async function insertIfAbsent<T extends ObjectLiteral>(
  repo: Repository<T>,
  values: QueryDeepPartialEntity<T>,
): Promise<boolean> {
  const result = await repo
    .createQueryBuilder()
    .insert()
    .values(values)
    .orIgnore()
    .returning('*') // có dòng trả về = vừa thêm; trùng thì DB bỏ qua, không trả gì
    .execute();
  return (result.raw as unknown[]).length > 0;
}

/**
 * Lấy dòng theo khoá, chưa có thì tạo với giá trị mặc định của DB — như Prisma `upsert({ create: key,
 * update: {} })`. An toàn khi 2 request cùng lúc (ON CONFLICT DO NOTHING rồi mới đọc).
 */
export async function findOrCreate<T extends ObjectLiteral>(
  repo: Repository<T>,
  key: FindOptionsWhere<T> & QueryDeepPartialEntity<T>,
): Promise<T> {
  await repo.createQueryBuilder().insert().values(key).orIgnore().execute();
  return repo.findOneByOrFail(key);
}
