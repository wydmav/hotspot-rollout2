import React from 'react';
import {
  LayoutDashboard,
  Radio,
  CreditCard,
  Smartphone,
  Terminal,
  Repeat,
  Clock,
  UserCheck,
  ShieldAlert,
  Check
} from 'lucide-react';
import { DepartmentName, PermissionTabId } from '../../types';
import {
  DEPARTMENT_PRESETS,
  PERMISSION_TABS,
  TOWER_DOMAIN
} from '../../utils/permissions';

interface TabPermissionsSelectorProps {
  department: DepartmentName;
  onDepartmentChange: (dept: DepartmentName) => void;
  allowedTabs: PermissionTabId[];
  onAllowedTabsChange: (tabs: PermissionTabId[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

const TAB_ICON_MAP: Record<PermissionTabId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  fleet: Radio,
  billing: CreditCard,
  portal: Smartphone,
  terminal: Terminal,
  roaming: Repeat,
  sessions: Clock,
  leads: UserCheck
};

export const TabPermissionsSelector: React.FC<TabPermissionsSelectorProps> = ({
  department,
  onDepartmentChange,
  allowedTabs,
  onAllowedTabsChange,
  disabled = false,
  compact = false
}) => {
  const isSuperAdminDept = department === 'Super Admin';
  const activePreset = DEPARTMENT_PRESETS.find((p) => p.department === department);

  const handleDepartmentSelect = (nextDept: DepartmentName) => {
    onDepartmentChange(nextDept);
    const preset = DEPARTMENT_PRESETS.find((p) => p.department === nextDept);
    if (preset) {
      onAllowedTabsChange([...preset.defaultTabs]);
    }
  };

  const toggleTab = (tabId: PermissionTabId) => {
    if (disabled || isSuperAdminDept) return;
    if (allowedTabs.includes(tabId)) {
      onAllowedTabsChange(allowedTabs.filter((t) => t !== tabId));
    } else {
      onAllowedTabsChange([...allowedTabs, tabId]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onAllowedTabsChange(PERMISSION_TABS.map((t) => t.id));
  };

  const handleResetDefaults = () => {
    if (disabled || !activePreset) return;
    onAllowedTabsChange([...activePreset.defaultTabs]);
  };

  return (
    <div className="space-y-4">
      {/* Department Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200">
            Department
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            @{TOWER_DOMAIN} handle
          </span>
        </div>
        <select
          value={department}
          disabled={disabled}
          onChange={(e) => handleDepartmentSelect(e.target.value as DepartmentName)}
          className="w-full px-3 py-2 bg-[#141b2e] border border-[#26324d] rounded-lg text-white text-xs font-medium focus:outline-none focus:border-[#f05e17] transition-colors cursor-pointer disabled:opacity-60"
        >
          {DEPARTMENT_PRESETS.map((preset) => (
            <option key={preset.department} value={preset.department}>
              {preset.department} — {preset.summary}
            </option>
          ))}
        </select>
        {activePreset && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {activePreset.summary}. Choosing a department pre-ticks its recommended tabs below — you can freely tick or untick any tab.
          </p>
        )}
      </div>

      {/* Tab Checkboxes with Clear Contents Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Allowed Tabs &amp; What Lives Inside Each Tab
            </div>
            <div className="text-[11px] text-slate-400">
              {isSuperAdminDept
                ? 'Super Admin has unrestricted access to all tabs, Team Dashboard & Activity Audit Log.'
                : `${allowedTabs.length} of ${PERMISSION_TABS.length} tabs enabled for this teammate`}
            </div>
          </div>

          {!isSuperAdminDept && !disabled && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2 py-1 rounded-md bg-[#161d31] hover:bg-[#202942] border border-[#26324d] text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Dept Defaults
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-1 rounded-md bg-[#161d31] hover:bg-[#202942] border border-[#26324d] text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Select All
              </button>
            </div>
          )}
        </div>

        <div
          className={`grid grid-cols-1 ${
            compact ? 'sm:grid-cols-2 gap-2' : 'sm:grid-cols-2 gap-2.5'
          } max-h-[300px] overflow-y-auto pr-1`}
        >
          {PERMISSION_TABS.map((tab) => {
            const Icon = TAB_ICON_MAP[tab.id];
            const isChecked = isSuperAdminDept || allowedTabs.includes(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                disabled={disabled || isSuperAdminDept}
                onClick={() => toggleTab(tab.id)}
                className={`text-left p-2.5 rounded-lg border transition-colors flex items-start gap-2.5 cursor-pointer disabled:cursor-default ${
                  isChecked
                    ? 'bg-[#172138] border-[#f05e17]/70 text-white'
                    : 'bg-[#101626] border-[#1f283d] text-slate-400 hover:border-[#2e3b59] hover:text-slate-200'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                    isChecked
                      ? 'bg-[#f05e17] border-[#f05e17] text-white'
                      : 'bg-[#0b101d] border-[#334263]'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isChecked ? 'text-[#f05e17]' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-white truncate">
                      {tab.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug font-normal">
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Super Admin Exclusive Lock Notice */}
        {!isSuperAdminDept && (
          <div className="px-3 py-2 rounded-lg bg-[#0d1220] border border-[#1f283d] flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-[#f05e17] shrink-0" />
            <span>
              <strong className="text-slate-200">Team Dashboard</strong> and the{' '}
              <strong className="text-slate-200">Activity &amp; Audit Log</strong> are strictly reserved for Super Admin and are never granted to invited staff.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
