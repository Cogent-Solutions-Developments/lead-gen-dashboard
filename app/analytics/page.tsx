"use client";

import { motion } from "framer-motion";
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  Cell 
} from "recharts";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  Calendar as CalendarIcon, 
  Download, 
  Mail, 
  MousePointerClick, 
  Users, 
  TrendingUp,
  DollarSign
} from "lucide-react";

// --- MOCK DATA (B2B Corporate Style) ---

const engagementData = [
  { date: "Mon", sent: 1200, opened: 800, replied: 120 },
  { date: "Tue", sent: 1500, opened: 950, replied: 180 },
  { date: "Wed", sent: 1100, opened: 700, replied: 90 },
  { date: "Thu", sent: 1800, opened: 1200, replied: 250 },
  { date: "Fri", sent: 1400, opened: 850, replied: 140 },
  { date: "Sat", sent: 400, opened: 200, replied: 20 },
  { date: "Sun", sent: 300, opened: 150, replied: 15 },
];

const leadQualityData = [
  { name: "Qualified", value: 65, color: "#2563eb" }, // Blue-600
  { name: "Interested", value: 45, color: "#60a5fa" }, // Blue-400
  { name: "Nurturing", value: 30, color: "#93c5fd" },  // Blue-300
  { name: "Unqualified", value: 15, color: "#cbd5e1" }, // Slate-300
];

const kpiData = [
  {
    title: "Pipeline Value",
    value: "$42,500",
    change: "+12.5%",
    icon: DollarSign,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Total Emails Sent",
    value: "8,432",
    change: "+8.2%",
    icon: Mail,
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
  {
    title: "Open Rate",
    value: "64.2%",
    change: "+4.1%",
    icon: MousePointerClick,
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    title: "Lead Conversion",
    value: "3.8%",
    change: "+1.2%",
    icon: TrendingUp,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
];

// --- CUSTOM TOOLTIP COMPONENT (Premium Look) ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-slate-700">
              {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}:
            </span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-transparent p-6 font-sans">
      
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics (Experimental Preview) </h1>
          <p className="mt-1 text-sm text-slate-500">
This is an early look at upcoming analytics features. Full functionality will be rolled out later.          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="h-9 border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            Last 7 Days
          </Button>
          <Button className="h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* KPI GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <ArrowUpRight className="h-3 w-3" />
                    {kpi.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.title}</p>
                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{kpi.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* MAIN CHARTS SECTION */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        
        {/* LEFT: Outreach Engagement (Area Chart) */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Email Engagement</CardTitle>
              <CardDescription>Volume of emails sent vs. open rate trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engagementData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="sent" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSent)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="opened" 
                      stroke="#60a5fa" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorOpened)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* RIGHT: Lead Quality (Bar Chart) */}
        <motion.div 
          className="lg:col-span-1"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Lead Quality Score</CardTitle>
              <CardDescription>Distribution of scraped leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadQualityData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                      width={80}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-md bg-slate-900 p-2 text-xs text-white shadow-lg">
                              <span className="font-bold">{payload[0].value}%</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                      {leadQualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* CAMPAIGN PERFORMANCE TABLE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">Top Performing Campaigns</CardTitle>
                <CardDescription>Based on engagement and response rates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                View All Campaigns
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Campaign Name</th>
                  <th className="px-6 py-4 font-medium">Sent</th>
                  <th className="px-6 py-4 font-medium">Open Rate</th>
                  <th className="px-6 py-4 font-medium">Reply Rate</th>
                  <th className="px-6 py-4 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { name: "Oil & Gas Vendors - Nigeria", sent: "1,240", open: "68%", reply: "12%", roi: "High" },
                  { name: "Tech Startups - UAE", sent: "850", open: "54%", reply: "8.5%", roi: "Med" },
                  { name: "Healthcare Summit - MENA", sent: "2,100", open: "71%", reply: "15%", roi: "Very High" },
                  { name: "Global Stadiums Congress", sent: "640", open: "42%", reply: "4.2%", roi: "Low" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
                    <td className="px-6 py-4 text-slate-600">{row.sent}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: row.open }}></div>
                        </div>
                        {row.open}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.reply}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.roi === 'Very High' || row.roi === 'High' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.roi === 'Med' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {row.roi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

    </div>
  );
}
