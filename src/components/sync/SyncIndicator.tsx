import type { SyncStatus } from '../../hooks/useSupabaseSync';

interface SyncIndicatorProps {
  status: SyncStatus;
  variant?: 'compact' | 'full';
}

const STATUS_CONFIG: Record<SyncStatus, { icon: string; color: string; label: string }> = {
  synced:  { icon: 'cloud_done', color: '#7a8266', label: '已同步' },
  syncing: { icon: 'sync',       color: '#a69486', label: '同步中…' },
  offline: { icon: 'cloud_off',  color: '#b46b4d', label: '離線' },
  error:   { icon: 'error',      color: '#b46b4d', label: '同步異常' },
};

export function SyncIndicator({ status, variant = 'compact' }: SyncIndicatorProps) {
  const config = STATUS_CONFIG[status];

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1${status === 'syncing' ? ' sync-spin' : ''}`}
        title={config.label}
      >
        <span
          className="material-symbols-outlined text-sm"
          style={{ color: config.color }}
        >
          {config.icon}
        </span>
      </span>
    );
  }

  // variant === 'full'
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl glass-panel">
      <span
        className={`material-symbols-outlined text-2xl${status === 'syncing' ? ' sync-spin' : ''}`}
        style={{ color: config.color }}
      >
        {config.icon}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-textPrimary">{config.label}</span>
        <span className="text-xs text-textSecondary">
          {status === 'synced' && '資料已與雲端同步'}
          {status === 'syncing' && '正在與雲端同步資料…'}
          {status === 'offline' && '目前離線，恢復連線後自動同步'}
          {status === 'error' && '同步發生錯誤，請稍後重試'}
        </span>
      </div>
    </div>
  );
}
