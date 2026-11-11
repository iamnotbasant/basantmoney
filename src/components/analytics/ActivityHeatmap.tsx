import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileSpreadsheet, 
  ChevronDown, 
  Info, 
  Smartphone, 
  Laptop, 
  Monitor, 
  Camera, 
  Tv, 
  MessageSquare, 
  FileText, 
  Heart, 
  Bell, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Search, 
  Layers, 
  SlidersHorizontal, 
  Download, 
  Settings, 
  ShieldCheck,
  Star
} from 'lucide-react';
import { ExpenseData, IncomeData } from '@/types/finance';

interface ActivityHeatmapProps {
  incomeData: IncomeData[];
  expenseData: ExpenseData[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  incomeData,
  expenseData,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Week');
  const [autoloadEnabled, setAutoloadEnabled] = useState<boolean>(true);
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: string } | null>({
    day: 'We 11',
    hour: '3 pm',
  });

  // 14 columns matching Reference 2: Mo 2 ... Su 15
  const days = [
    'Mo 2', 'Tu 3', 'We 4', 'Th 5', 'Fr 6', 'Sa 7', 'Su 8',
    'Mo 9', 'Tu 10', 'We 11', 'Th 12', 'Fr 13', 'Sa 14', 'Su 15'
  ];

  // 12 rows matching Reference 2: 7 pm down to 8 am
  const hours = [
    '7 pm', '6 pm', '5 pm', '4 pm', '3 pm', '2 pm',
    '1 pm', '12 pm', '11 am', '10 am', '9 am', '8 am'
  ];

  // Avito left sidebar menu items
  const menuItems = [
    { label: 'Summary', active: false },
    { label: 'Your listings', active: true, subItems: ['Active', 'Inactive', 'Templates'] },
    { label: 'Orders', badge: '2', active: false },
    { label: 'Analytics', hasSub: true, active: false },
    { label: 'Clients', hasSub: true, active: false },
    { label: 'Paid services', hasSub: true, active: false },
    { label: 'Finances and documents', hasSub: true, active: false },
    { label: 'Staff', active: false },
    { label: 'Profile and settings', hasSub: true, active: false },
  ];

  return (
    <div className="space-y-4">
      {/* Avito Full Application Shell (Reference 2) */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-[#F8F9FA] dark:bg-[#0B0C0E] shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
        
        {/* Top Avito Navigation Bar (Reference 2) */}
        <div className="px-6 py-3.5 bg-white dark:bg-[#121316] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* Avito Multi-Color Dots Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#97D700]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#00AAFF]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#8E34D9]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D55]" />
              </div>
              <span className="font-extrabold text-xl tracking-tight font-sans">
                Avito
              </span>
              <span className="text-xs text-zinc-500 font-medium flex items-center gap-1 ml-1 cursor-pointer">
                Moscow <ChevronDown className="h-3 w-3" />
              </span>
            </div>

            {/* Catalog Button */}
            <button className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              <span className="grid grid-cols-2 gap-0.5 w-3 h-3">
                <span className="bg-zinc-600 rounded-sm" />
                <span className="bg-zinc-600 rounded-sm" />
                <span className="bg-zinc-600 rounded-sm" />
                <span className="bg-zinc-600 rounded-sm" />
              </span>
              Catalog
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg hidden md:block">
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by listings"
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none"
                readOnly
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200">
              <Plus className="h-4 w-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center font-bold text-xs text-white">
              <span className="text-[10px] text-pink-400 font-mono">re:</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid: Left Sidebar + Right Main Activity Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[780px]">
          {/* Left Column Sidebar (Reference 2) */}
          <div className="lg:col-span-3 p-5 border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#101114] space-y-5">
            {/* re:Store Card */}
            <div className="p-4 rounded-2xl bg-black text-white flex flex-col items-center justify-center text-center shadow-lg">
              <div className="text-xl font-bold tracking-tight text-pink-400 font-mono mb-1">
                re:Store
              </div>
              <p className="text-xs font-semibold text-zinc-300">Apple Reseller</p>
            </div>

            {/* Seller Rating */}
            <div className="text-center">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">re:Store</h3>
              <p className="text-xs text-zinc-500 flex items-center justify-center gap-1 mt-0.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-zinc-800 dark:text-zinc-200">4.9</span>
                <span>• 857 reviews</span>
              </p>
            </div>

            {/* Wallet & Upfront Boxes */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Wallet</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">$780</span>
                <span className="text-[10px] text-zinc-400 block">78 bonuses</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Upfront</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">$3,480</span>
                <span className="text-[10px] text-zinc-400 block">~ for 30 days</span>
              </div>
            </div>

            {/* 4 Quick Action Buttons (Reference 2) */}
            <div className="grid grid-cols-4 gap-1.5 text-zinc-600 dark:text-zinc-400">
              <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
                <MessageSquare className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 px-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold">12</span>
              </button>
              <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
                <FileText className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 px-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold">1</span>
              </button>
              <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Heart className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 px-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold">12</span>
              </button>
            </div>

            {/* Sidebar Menu Items */}
            <div className="space-y-1 text-xs font-medium pt-2">
              {menuItems.map((item, idx) => (
                <div key={idx}>
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      item.active
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                    {item.hasSub && <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
                  </div>

                  {item.subItems && (
                    <div className="pl-6 space-y-1 mt-1 text-[11px] text-zinc-500">
                      {item.subItems.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          className={`py-1 cursor-pointer hover:text-black dark:hover:text-white ${
                            sub === 'Active' ? 'text-black dark:text-white font-bold' : ''
                          }`}
                        >
                          {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pro Support Button */}
            <div className="pt-4">
              <button className="w-full py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:bg-zinc-200 transition-colors">
                Pro Support
              </button>
            </div>
          </div>

          {/* Right Main Dashboard Area (Reference 2) */}
          <div className="lg:col-span-9 p-6 sm:p-8 space-y-6">
            {/* Title & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-sans">
                  Your listings
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  10 140 active • Last update on Dec 11 at 15:14
                </p>
              </div>

              {/* Time Filters & Spreadsheet Button */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-semibold self-start sm:self-auto">
                {(['Day', 'Week', 'Month', 'Year'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedTimeframe === tf
                        ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm font-bold'
                        : 'text-zinc-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {tf === 'Week' ? 'Week • 02 - 15 Dec, 24 ▾' : tf}
                  </button>
                ))}
                <button className="flex items-center gap-1.5 px-3 py-1 text-zinc-600 dark:text-zinc-300 hover:text-foreground pl-3 border-l border-zinc-200 dark:border-zinc-800">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Spreadsheet
                </button>
              </div>
            </div>

            {/* Two-Column Area: Left 14-Col Heatmap, Right Autoload Card */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Heatmap Matrix (Reference 2: 14 cols x 12 rows) */}
              <div className="xl:col-span-8 overflow-x-auto pb-2">
                <div className="min-w-[520px]">
                  {/* Hours (7 pm down to 8 am) */}
                  <div className="space-y-1.5">
                    {hours.map((hour, hIdx) => (
                      <div key={hour} className="grid grid-cols-[45px_repeat(14,1fr)] gap-1.5 items-center">
                        <span className="text-[10px] font-mono text-zinc-400 text-right pr-2">
                          {hour}
                        </span>

                        {days.map((day, dIdx) => {
                          // Left 10 days pink, right 4 days solid slate
                          const isPinkZone = dIdx < 10;
                          const isTargetCell = day === 'We 11' && hour === '3 pm';

                          let cellBg = isPinkZone
                            ? (dIdx + hIdx) % 3 === 0
                              ? 'bg-[#FF2D78]'
                              : (dIdx + hIdx) % 2 === 0
                              ? 'bg-[#FF6699]'
                              : 'bg-[#FFB3C6]'
                            : (dIdx + hIdx) % 3 === 0
                            ? 'bg-[#3A3D46]'
                            : (dIdx + hIdx) % 2 === 0
                            ? 'bg-[#626674]'
                            : 'bg-[#9297A6]';

                          return (
                            <div
                              key={`${day}-${hour}`}
                              onMouseEnter={() => setHoveredCell({ day, hour })}
                              className={`h-6 sm:h-7 rounded-[4px] cursor-pointer transition-all relative ${cellBg} ${
                                isTargetCell ? 'ring-2 ring-black dark:ring-white scale-105 z-20 shadow-lg' : 'hover:scale-105'
                              }`}
                            >
                              {/* Exact Reference 2 Pointer Tooltip on We 11, 3 pm */}
                              {isTargetCell && (
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-white dark:bg-black text-black dark:text-white font-bold text-[10px] shadow-xl flex items-center gap-1 z-30 pointer-events-none border border-zinc-200 dark:border-zinc-800">
                                  <span>417</span>
                                  {/* Tooltip triangle */}
                                  <div className="w-1.5 h-1.5 bg-white dark:bg-black rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Day labels below columns */}
                  <div className="grid grid-cols-[45px_repeat(14,1fr)] gap-1.5 mt-2.5 text-center text-[10px] font-mono text-zinc-500">
                    <div />
                    {days.map(d => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Autoload in Progress Card (Reference 2) */}
              <div className="xl:col-span-4 space-y-4">
                {/* Pastel Blue/Purple Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#E0F2FE] via-[#EDE9FE] to-[#FCE7F3] dark:from-[#1E293B] dark:via-[#2E1065] dark:to-[#4A044E] border border-blue-200 dark:border-purple-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Autoload in Progress
                    </h4>
                    {/* Toggle Switch */}
                    <button
                      onClick={() => setAutoloadEnabled(!autoloadEnabled)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        autoloadEnabled ? 'bg-black dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white dark:bg-black transition-transform ${
                          autoloadEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    The file is uploading (as of December 11, 15:14)
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className="w-2/3 h-full bg-black dark:bg-white rounded-full" />
                  </div>

                  {/* Stats (Clock 417, Info 26, Check 391) */}
                  <div className="flex items-center gap-4 text-xs font-mono font-semibold pt-1">
                    <span className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200">
                      <Clock className="h-3.5 w-3.5" /> 417
                    </span>
                    <span className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200">
                      <Info className="h-3.5 w-3.5" /> 26
                    </span>
                    <span className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 391
                    </span>
                  </div>
                </div>

                {/* Info Notice Box (Reference 2) */}
                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                    <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span>IMEI Rules Update</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    We have updated the rules regarding the smartphone IMEI parameter. Please update this information in 26 of your listings.
                  </p>
                  <a href="#rules" className="text-[11px] font-semibold text-black dark:text-white underline block pt-0.5">
                    Read more in the detailed report &gt;
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Section: Left 10 140 Active + Chunky 4-Slice Donut; Right Inactive/Templates */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              
              {/* Bottom Left: 10 140 Active & Separated 4-Slice Donut (Reference 2) */}
              <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Category List */}
                <div className="space-y-4 w-full md:w-1/2">
                  <div>
                    <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 font-sans">
                      10 140
                    </h3>
                    <span className="text-xs text-zinc-400 font-medium">Active</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5 text-zinc-500" /> Smartphones
                      </span>
                      <span className="font-bold">56%</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                      <span className="flex items-center gap-2">
                        <Laptop className="h-3.5 w-3.5 text-zinc-500" /> Laptops
                      </span>
                      <span className="font-bold">24%</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                      <span className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-zinc-500" /> Desktops
                      </span>
                      <span className="font-bold">13%</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                      <span className="flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-zinc-500" /> Cameras
                      </span>
                      <span className="font-bold">6%</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                      <span className="flex items-center gap-2">
                        <Tv className="h-3.5 w-3.5 text-zinc-500" /> TVs
                      </span>
                      <span className="font-bold">1%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Clear</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">7 300</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] block">With errors</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">2 840</span>
                    </div>
                  </div>
                </div>

                {/* THE AUTHENTIC 4-SLICE CHUNKY ROUNDED DONUT CHART (Reference 2) */}
                <div className="w-56 h-56 relative flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full select-none">
                    {/* Slice 1: 56% (Bottom big slice, #2F3138) */}
                    <path
                      d="M 50 140 A 70 70 0 0 0 170 120 L 145 110 A 45 45 0 0 1 65 125 Z"
                      fill="#2F3138"
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <text x="110" y="150" fill="white" fontSize="13" fontWeight="bold" textAnchor="middle">
                      56%
                    </text>

                    {/* Slice 2: 24% (Left slice, #5E626F) */}
                    <path
                      d="M 40 125 A 70 70 0 0 1 80 40 L 90 65 A 45 45 0 0 0 60 115 Z"
                      fill="#5E626F"
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <text x="60" y="95" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">
                      24%
                    </text>

                    {/* Slice 3: 13% (Top slice, #8E93A2) */}
                    <path
                      d="M 95 35 A 70 70 0 0 1 150 50 L 135 72 A 45 45 0 0 0 100 62 Z"
                      fill="#8E93A2"
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <text x="120" y="55" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">
                      13%
                    </text>

                    {/* Slice 4: 6% (Top-right slice, #D2D6DF) */}
                    <path
                      d="M 160 60 A 70 70 0 0 1 180 100 L 152 95 A 45 45 0 0 0 140 75 Z"
                      fill="#D2D6DF"
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <text x="160" y="85" fill="#2F3138" fontSize="10" fontWeight="bold" textAnchor="middle">
                      6%
                    </text>
                  </svg>
                </div>
              </div>

              {/* Bottom Right: Inactive & Templates Cards (Reference 2) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Inactive Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div>
                    <h4 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 font-sans">
                      8912
                    </h4>
                    <span className="text-xs text-zinc-400 font-medium">Inactive</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Rejected</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">2518</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Blocked</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">320</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Archived</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">5062</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Deleted</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">1012</span>
                    </div>
                  </div>
                </div>

                {/* Templates Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <h4 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 font-sans">
                    634
                  </h4>
                  <span className="text-xs text-zinc-400 font-medium block">Templates</span>
                  <p className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
                    Pre-made templates for quick posting with consistent formatting
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
