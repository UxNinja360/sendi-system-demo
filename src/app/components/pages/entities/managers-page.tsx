import React, { useMemo, useState } from 'react';
import { ChevronLeft, Mail, Menu, Phone, Plus, Power, Shield, Star, UserCog, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ManagersToolbar } from './managers-toolbar';
import { ManagersInlineFilters } from './managers-inline-filters';
import { ManagersFilterChips } from './managers-filter-chips';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'supervisor' | 'support';
  status: 'active' | 'inactive';
  rating: number;
  totalActions: number;
  joinedDate: string;
  permissions: string[];
}

const initialManagers: Manager[] = [
  { id: 'm1', name: 'דני כהן', email: 'danny@example.com', phone: '050-1234567', role: 'admin', status: 'active', rating: 4.8, totalActions: 1250, joinedDate: '2024-01-15', permissions: ['all'] },
  { id: 'm2', name: 'שרה לוי', email: 'sara@example.com', phone: '052-9876543', role: 'supervisor', status: 'active', rating: 4.7, totalActions: 890, joinedDate: '2024-02-20', permissions: ['deliveries', 'couriers', 'reports'] },
  { id: 'm3', name: 'יוסי אברהם', email: 'yossi@example.com', phone: '054-5556666', role: 'support', status: 'active', rating: 4.9, totalActions: 2100, joinedDate: '2023-11-10', permissions: ['support', 'customers'] },
  { id: 'm4', name: 'רונית ברקוביץ', email: 'ronit@example.com', phone: '053-7778888', role: 'supervisor', status: 'active', rating: 4.6, totalActions: 650, joinedDate: '2024-03-05', permissions: ['restaurants', 'finance'] },
  { id: 'm5', name: 'עמית דהן', email: 'amit@example.com', phone: '050-3334444', role: 'support', status: 'inactive', rating: 4.4, totalActions: 320, joinedDate: '2024-01-25', permissions: ['support'] },
];

export const ManagersPage: React.FC = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'supervisor' | 'support'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'rating' | 'actions'>('name');
  const [newManager, setNewManager] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'support' as 'admin' | 'supervisor' | 'support',
  });

  const filteredManagers = useMemo(() => {
    let filtered = managers;
    if (searchQuery) {
      filtered = filtered.filter((manager) =>
        manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        manager.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        manager.phone.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter((manager) => manager.status === statusFilter);
    if (roleFilter !== 'all') filtered = filtered.filter((manager) => manager.role === roleFilter);

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'he');
      if (sortBy === 'role') return ({ admin: 0, supervisor: 1, support: 2 }[a.role] - { admin: 0, supervisor: 1, support: 2 }[b.role]);
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.totalActions - a.totalActions;
    });
  }, [managers, roleFilter, searchQuery, sortBy, statusFilter]);

  const stats = useMemo(() => ({
    total: managers.length,
    filtered: filteredManagers.length,
    active: managers.filter((m) => m.status === 'active').length,
    inactive: managers.filter((m) => m.status === 'inactive').length,
  }), [filteredManagers.length, managers]);

  const statusCounts = useMemo(() => ({
    all: managers.length,
    active: managers.filter((m) => m.status === 'active').length,
    inactive: managers.filter((m) => m.status === 'inactive').length,
  }), [managers]);

  const roleCounts = useMemo(() => ({
    all: managers.length,
    admin: managers.filter((m) => m.role === 'admin').length,
    supervisor: managers.filter((m) => m.role === 'supervisor').length,
    support: managers.filter((m) => m.role === 'support').length,
  }), [managers]);

  const hasActiveFilters = !!searchQuery || statusFilter !== 'all' || roleFilter !== 'all';

  const handleClearAll = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRoleFilter('all');
    setSortBy('name');
  };

  const getRoleLabel = (role: string) => role === 'admin' ? 'מנהל ראשי' : role === 'supervisor' ? 'מפקח' : 'תמיכה';
  const getRoleColor = (role: string) => role === 'admin'
    ? 'text-[#b45309] dark:text-[#fde68a]'
    : role === 'supervisor'
      ? 'text-[#1d4ed8] dark:text-[#93c5fd]'
      : 'text-[#7c3aed] dark:text-[#c4b5fd]';
  const getStatusLabel = (status: string) => status === 'active' ? 'פעיל' : 'לא פעיל';
  const getStatusColor = (status: string) => status === 'active'
    ? 'text-[#16a34a] dark:text-[#9fe870]'
    : 'text-[#737373] dark:text-[#a3a3a3]';

  const addManager = () => {
    if (!newManager.name.trim() || !newManager.email.trim() || !newManager.phone.trim()) return;
    setManagers((prev) => [...prev, {
      id: `m${Date.now()}`,
      name: newManager.name.trim(),
      email: newManager.email.trim(),
      phone: newManager.phone.trim(),
      role: newManager.role,
      status: 'active',
      rating: 5,
      totalActions: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      permissions: newManager.role === 'admin' ? ['all'] : ['support'],
    }]);
    setIsModalOpen(false);
    setNewManager({ name: '', email: '', phone: '', role: 'support' });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewManager({ name: '', email: '', phone: '', role: 'support' });
  };

  const toggleManagerStatus = (managerId: string, currentStatus: string) => {
    setManagers((prev) => prev.map((manager) =>
      manager.id === managerId ? { ...manager, status: currentStatus === 'active' ? 'inactive' : 'active' } : manager,
    ));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <div className="sticky top-0 z-20 shrink-0 h-16 flex items-center justify-between px-5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-start">

            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">מנהלים</span>
              <span className="text-[13px] text-[#737373] dark:text-[#a3a3a3]">{managers.length}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9fe870] hover:bg-[#8dd960] text-[#0d0d12] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>הוסף מנהל</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
            <div className="hidden md:flex items-center gap-1.5">
              <ManagersInlineFilters
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                roleFilter={roleFilter}
                onRoleChange={setRoleFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                statusCounts={statusCounts}
                roleCounts={roleCounts}
              />
            </div>
            <div className="flex-1" />
            <ManagersToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              stats={stats}
              onAddManager={() => setIsModalOpen(true)}
              onClearAll={handleClearAll}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          <div className="shrink-0 px-3 pb-3 bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#1f1f1f]">
            <div className="md:hidden mb-3">
              <ManagersInlineFilters
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                roleFilter={roleFilter}
                onRoleChange={setRoleFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                statusCounts={statusCounts}
                roleCounts={roleCounts}
              />
            </div>
            <ManagersFilterChips
              statusFilter={statusFilter}
              onClearStatus={() => setStatusFilter('all')}
              roleFilter={roleFilter}
              onClearRole={() => setRoleFilter('all')}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              onClearAll={handleClearAll}
            />
          </div>

          <div className="flex-1 overflow-auto relative">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-[#e5e5e5] dark:border-[#1f1f1f]">
                  <tr>
                    {['שם מנהל', 'תפקיד', 'סטטוס', 'אימייל', 'טלפון', 'דירוג', 'סך פעולות', 'פעולות'].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-medium text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap ${i === 7 ? 'text-center' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredManagers.map((manager) => {
                    const isActive = manager.status === 'active';
                    return (
                      <tr key={manager.id} onClick={() => navigate(`/manager/${manager.id}`)} className="bg-white dark:bg-[#171717] border-b border-[#f5f5f5] dark:border-[#1f1f1f] hover:bg-[#fafafa] dark:hover:bg-[#111111] transition-colors cursor-pointer">
                        <td className="px-4 py-2.5"><div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e] shrink-0" /><span className="font-medium text-xs text-[#0d0d12] dark:text-[#fafafa] whitespace-nowrap">{manager.name}</span></div></td>
                        <td className="px-4 py-2.5"><span className={`text-xs font-medium whitespace-nowrap ${getRoleColor(manager.role)}`}>{getRoleLabel(manager.role)}</span></td>
                        <td className="px-4 py-2.5"><span className={`text-xs font-medium whitespace-nowrap ${getStatusColor(manager.status)}`}>{getStatusLabel(manager.status)}</span></td>
                        <td className="px-4 py-2.5"><span className="text-xs text-[#666d80] dark:text-[#a3a3a3] direction-ltr whitespace-nowrap">{manager.email}</span></td>
                        <td className="px-4 py-2.5"><span className="text-xs text-[#666d80] dark:text-[#a3a3a3] direction-ltr whitespace-nowrap">{manager.phone}</span></td>
                        <td className="px-4 py-2.5"><div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" /><span className="text-xs text-[#0d0d12] dark:text-[#fafafa] font-medium whitespace-nowrap">{manager.rating.toFixed(1)}</span></div></td>
                        <td className="px-4 py-2.5"><span className="text-xs text-[#0d0d12] dark:text-[#fafafa] font-medium whitespace-nowrap">{manager.totalActions.toLocaleString()}</span></td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleManagerStatus(manager.id, manager.status); }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all text-xs ${isActive ? 'bg-[#ecfae2] dark:bg-[#163300] text-[#16a34a] dark:text-[#9fe870] hover:bg-[#dcf5d2] dark:hover:bg-[#1f4500]' : 'bg-[#f5f5f5] dark:bg-[#262626] hover:bg-[#e5e5e5] dark:hover:bg-[#404040] text-[#737373] dark:text-[#a3a3a3]'}`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredManagers.length === 0 && (
                <div className="p-12 text-center">
                  <UserCog className="w-12 h-12 text-[#d4d4d4] dark:text-[#404040] mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-[#0d0d12] dark:text-[#fafafa] mb-1">לא נמצאו מנהלים</h3>
                  <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">{searchQuery ? `לא נמצאו תוצאות לחיפוש "${searchQuery}"` : 'נסה לשנות את הפילטרים'}</p>
                </div>
              )}
            </div>
        </div>

      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={handleModalClose} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5] dark:border-[#262626]">
                <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">הוסף מנהל חדש</h2>
                <button onClick={handleModalClose} className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors"><X size={20} className="text-[#737373] dark:text-[#a3a3a3]" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] mb-2">שם מלא</label>
                  <input type="text" value={newManager.name} onChange={(e) => setNewManager({ ...newManager, name: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870]" placeholder="הכנס שם מלא" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] mb-2">אימייל</label>
                  <input type="email" value={newManager.email} onChange={(e) => setNewManager({ ...newManager, email: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870] direction-ltr text-right" placeholder="example@domain.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] mb-2">טלפון</label>
                  <input type="tel" value={newManager.phone} onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870] direction-ltr text-right" placeholder="050-1234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] mb-2">תפקיד</label>
                  <select value={newManager.role} onChange={(e) => setNewManager({ ...newManager, role: e.target.value as 'admin' | 'supervisor' | 'support' })} className="w-full px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870]">
                    <option value="support">תמיכה</option>
                    <option value="supervisor">מפקח</option>
                    <option value="admin">מנהל ראשי</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-6 border-t border-[#e5e5e5] dark:border-[#262626]">
                <button onClick={addManager} className="flex-1 bg-[#9fe870] hover:bg-[#8fd65f] text-[#0d0d12] py-2.5 rounded-lg font-medium transition-colors">הוסף מנהל</button>
                <button onClick={handleModalClose} className="flex-1 bg-[#f5f5f5] dark:bg-[#262626] hover:bg-[#e5e5e5] dark:hover:bg-[#404040] text-[#0d0d12] dark:text-[#fafafa] py-2.5 rounded-lg font-medium transition-colors">ביטול</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
