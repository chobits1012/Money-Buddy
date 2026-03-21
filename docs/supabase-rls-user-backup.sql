-- user_backup：僅允許登入使用者讀寫自己的列（auth.uid() = id）
-- 請在 Supabase SQL Editor 依實際 schema 調整欄位名稱後執行。

-- 若尚未啟用 RLS：
-- alter table public.user_backup enable row level security;

-- SELECT：僅能讀自己的備份
create policy "user_backup_select_own"
  on public.user_backup
  for select
  to authenticated
  using (auth.uid() = id);

-- INSERT：僅能以自己的 uid 作為 id 新增
create policy "user_backup_insert_own"
  on public.user_backup
  for insert
  to authenticated
  with check (auth.uid() = id);

-- UPDATE：僅能更新自己的列
create policy "user_backup_update_own"
  on public.user_backup
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- DELETE（若需要讓使用者刪除自己的備份）
-- create policy "user_backup_delete_own"
--   on public.user_backup
--   for delete
--   to authenticated
--   using (auth.uid() = id);
