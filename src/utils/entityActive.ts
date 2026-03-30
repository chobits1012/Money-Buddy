import type { SoftDeletable } from '../types';

export function isActive<T extends SoftDeletable>(item: T): boolean {
    return !item.deletedAt;
}

export function filterActive<T extends SoftDeletable>(items: T[]): T[] {
    return items.filter(isActive);
}
