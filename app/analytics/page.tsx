"use client";

import { motion } from "framer-motion";
import { 
  Bar, 
  BarChart, 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Area,
  AreaChart
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
  ArrowDownRight, 
  Download, 
  Calendar as CalendarIcon,
  Filter,
  Mail,
  Linkedin,
  MessageCircle,
  Users,
  Target,
  MousePointerClick
} from "lucide-react";

// --- MOCK DATA ---

const outreachData = [
  { name: "Mon", email: 240, linkedin: 130, whatsapp: 40 },
  { name: "Tue", email: 139, linkedin: 200, whatsapp: 90 },
  { name: "Wed", email: 980, linkedin: 390, whatsapp: 200 },
  { name: "Thu", email: 390, linkedin: 480, whatsapp: 150 },
  { name: "Fri", email: 480, linkedin: 380, whatsapp: 120 },
  { name: "Sat", email: 180, linkedin: 120, whatsapp: 30 },
  { name: "Sun", email: 200, linkedin: 150, whatsapp: 50 },
];

const funnelData = [
  { stage: "Identified", count: 12500, fill: "#18181b" }, // Zinc-900
  { stage: "Enriched", count: 8900, fill: "#52525b" },   // Zinc-600
  { stage: "Contacted", count: 6400, fill: "#a1a1aa" },  // Zinc-400
  { stage: "Replied", count: 1200, fill: "var(--sidebar-primary)" }, // Brand Color
  { stage: "Meetings", count: 340, fill: "#22c55e" },    // Green-500
];

const kpiData = [
  {
    title: "Total Leads Generated",
    value: "12,543",
    change: "+12.5%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Avg. Open Rate",
    value: "48.2%",
    change: "+4.1%",
    trend: "up",
    icon: Mail,
  },
  {
    title: "Reply Rate",
    value: "8.4%",
    change: "-1.2%",
    trend: "down",
    icon: MessageCircle,
  },
  {
    title: "Meetings Booked",
    value: "342",
    change: "+18.2%",
    trend: "up",
    icon: Target,
  },
];

export default function AnalyticsPage() {
  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      
      {/* --- Header Section --- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-zinc-100 pb-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Performance Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Real-time insights into your lead generation and outreach engines.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
          <Button variant="outline" className="h-10 border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {/* --- KPI Grid --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpiData.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white hover:border-zinc-300 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100">
                    <item.icon className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.trend === 'up' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {item.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {item.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-zinc-500">{item.title}</p>
                  <h3 className="text-3xl font-bold text-zinc-900 mt-1 tracking-tight">{item.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* --- Charts Section 1: Outreach Volume vs Funnel --- */}
      <div className="grid gap-6 md:grid-cols-7 mb-8">
        
        {/* Left: Outreach Volume (Area Chart) */}
        <motion.div 
          className="md:col-span-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="rounded-xl border border-zinc-200 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-900">Outreach Volume</CardTitle>
              <CardDescription>Messages sent across all channels this week</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={outreachData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEmail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      stroke="#a1a1aa" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#a1a1aa" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value}`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e4e4e7" }}
                      itemStyle={{ color: "#18181b", fontSize: "12px", fontWeight: "bold" }}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <Area 
                      type="monotone" 
                      dataKey="email" 
                      stroke="#18181b" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEmail)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="linkedin" 
                      stroke="var(--sidebar-primary)" 
                      strokeWidth={2}
                      fillOpacity={0} 
                      fill="var(--sidebar-primary)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Funnel Efficiency (Bar Chart) */}
        <motion.div 
          className="md:col-span-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="rounded-xl border border-zinc-200 shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-900">Pipeline Funnel</CardTitle>
              <CardDescription>Conversion from identification to meeting</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-5 mt-2">
                {funnelData.map((item, i) => (
                  <div key={item.stage} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-zinc-700">{item.stage}</span>
                      <span className="font-bold text-zinc-900">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.count / 12500) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* --- Charts Section 2: Channel Breakdown --- */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        
        {/* Channel Cards */}
        {[
          { name: "Cold Email", icon: Mail, sent: "8,432", reply: "4.2%", color: "bg-zinc-900 text-white" },
          { name: "LinkedIn", icon: Linkedin, sent: "2,104", reply: "12.5%", color: "bg-[#0077b5] text-white" },
          { name: "WhatsApp", icon: MessageCircle, sent: "840", reply: "28.4%", color: "bg-[#25D366] text-white" },
        ].map((channel, i) => (
          <motion.div
            key={channel.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + (i * 0.1) }}
          >
            <Card className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${channel.color}`}>
                    <channel.icon className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-zinc-400">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">{channel.name}</h3>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Sent</p>
                    <p className="text-xl font-bold text-zinc-900 mt-0.5">{channel.sent}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Reply Rate</p>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">{channel.reply}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

    </div>
  );
}