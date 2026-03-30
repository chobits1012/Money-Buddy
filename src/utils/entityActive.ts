/**
 * 軟刪除（tombstone）：以 deletedAt 是否存在判斷實體是否仍參與計算與 UI。
 */
export function isActive<T extends { deletedAt?: string }>(entity: T | null | undefined): boolean {
    return entity != null && !entity.deletedAt;
}

export function filterActive<T extends { deletedAt?: string }>(items: T[] | undefined | null): T[] {
    if (!items?.length) return [];
    return items.filter(isActive);
}
