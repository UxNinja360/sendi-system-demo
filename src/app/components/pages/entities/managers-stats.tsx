import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, UserCog, Shield, Activity } from 'lucide-react';

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

interface ManagersStatsProps {
  managers: Manager[];
}

export const ManagersStats: React.FC<ManagersStatsProps> = ({ managers }) => {
  // חישוב נתונים
  const activeManagers = managers.filter(m => m.status === 'active').length;
  const totalActions = managers.reduce((sum, m) => sum + m.totalActions, 0);
  const avgRating = managers.reduce((sum, m) => sum + m.rating, 0) / managers.length || 0;
  const adminCount = managers.filter(m => m.role === 'admin').length;
  const supervisorCount = managers.filter(m => m.role === 'supervisor').length;
  const supportCount = managers.filter(m => m.role === 'support').length;

  // נתונים לפי תפקיד
  const roleData = [
    { name: 'מנהל ראשי', value: adminCount, color: '#fbbf24' },
    { name: 'מפקח', value: supervisorCount, color: '#3b82f6' },
    { name: 'תמיכה', value: supportCount, color: '#a855f7' },
  ];

  // נתונים לפי חודש (דמה)
  const monthlyData = [
    { month: 'ינואר', actions: 850 },
    { month: 'פברואר', actions: 920 },
    { month: 'מרץ', actions: 1100 },
    { month: 'אפריל', actions: 980 },
    { month: 'מאי', actions: 1250 },
    { month: 'יוני', actions: 1340 },
  ];

  // Top מנהלים
  const topManagers = [...managers]
    .sort((a, b) => b.totalActions - a.totalActions)
    .slice(0, 5);

  // נתונים לפי דירוג
  const ratingData = [
    { range: '4.8-5.0', count: managers.filter(m => m.rating >= 4.8).length },
    { range: '4.5-4.7', count: managers.filter(m => m.rating >= 4.5 && m.rating < 4.8).length },
    { range: '4.0-4.4', count: managers.filter(m => m.rating >= 4.0 && m.rating < 4.5).length },
    { range: 'מתחת ל-4.0', count: managers.filter(m => m.rating < 4.0).length },
  ];

  return (
    <div className="space-y-6">
      {/* כרטיסי סיכום */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* סך מנהלים */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#dbeafe] dark:bg-[#1e3a8a] rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <TrendingUp className="w-4 h-4 text-[#16a34a]" />
          </div>
          <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{managers.length}</div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">סך מנהלים</div>
        </div>

        {/* מנהלים פעילים */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#dcfce7] dark:bg-[#14532d] rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#16a34a]" />
            </div>
            <div className="text-xs font-medium text-[#16a34a] dark:text-[#22c55e] bg-[#dcfce7] dark:bg-[#14532d] px-2 py-1 rounded-full">
              {((activeManagers / managers.length) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{activeManagers}</div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">מנהלים פעילים</div>
        </div>

        {/* סך פעולות */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#fef3c7] dark:bg-[#451a03] rounded-lg flex items-center justify-center">
              <UserCog className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <TrendingUp className="w-4 h-4 text-[#16a34a]" />
          </div>
          <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{totalActions.toLocaleString()}</div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">סך פעולות</div>
        </div>

        {/* דירוג ממוצע */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#fef3c7] dark:bg-[#451a03] rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg text-[#ffa94d]">★</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{avgRating.toFixed(1)}</div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">דירוג ממוצע</div>
        </div>
      </div>

      {/* גרפים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* חלוקה לפי תפקיד */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">חלוקה לפי תפקיד</h3>
          <ResponsiveContainer width="100%" height={250} key={`pie-chart-${roleData.length}`}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #171717)',
                  border: '1px solid var(--tooltip-border, #262626)',
                  borderRadius: '8px',
                  color: 'var(--tooltip-text, #fafafa)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* פעולות לפי חודש */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">פעולות לפי חודש</h3>
          <ResponsiveContainer width="100%" height={250} key={`line-chart-${monthlyData.length}`}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="month" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #171717)',
                  border: '1px solid var(--tooltip-border, #262626)',
                  borderRadius: '8px',
                  color: 'var(--tooltip-text, #fafafa)',
                }}
              />
              <Line type="monotone" dataKey="actions" stroke="#9fe870" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* טבלאות נוספות */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top מנהלים */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">מנהלים מובילים</h3>
          <div className="space-y-3">
            {topManagers.map((manager, index) => (
              <div key={manager.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#9fe870] rounded-full flex items-center justify-center text-sm font-bold text-[#0d0d12]">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{manager.name}</div>
                    <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                      {manager.role === 'admin' ? 'מנהל ראשי' : manager.role === 'supervisor' ? 'מפקח' : 'תמיכה'}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                  {manager.totalActions.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* התפלגות דירוגים */}
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">התפלגות דירוגים</h3>
          <ResponsiveContainer width="100%" height={250} key={`bar-chart-${ratingData.length}`}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="range" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #171717)',
                  border: '1px solid var(--tooltip-border, #262626)',
                  borderRadius: '8px',
                  color: 'var(--tooltip-text, #fafafa)',
                }}
              />
              <Bar dataKey="count" fill="#9fe870" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
