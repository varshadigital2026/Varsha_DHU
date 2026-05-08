import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  TrendingDown, 
  TrendingUp,
  Activity,
  BarChart3,
  ClipboardList,
  Lightbulb,
  Filter
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Defect, AnalysisResult } from '../lib/gemini';
import { motion } from 'motion/react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Label } from './ui/label';

interface DashboardProps {
  result: AnalysisResult;
  unitsInspected: number;
  images?: string[];
}

const SEVERITY_COLORS = {
  Minor: '#fbbf24',
  Major: '#f97316',
  Critical: '#ef4444'
};

const CATEGORY_COLORS = {
  Stitching: '#3b82f6',
  Fabric: '#10b981',
  Measurement: '#8b5cf6',
  Finishing: '#f43f5e',
  Trims: '#64748b'
};

export function Dashboard({ result, unitsInspected, images }: DashboardProps) {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const garmentCategory = result.category || "Garment";

  const filteredDefects = useMemo(() => {
    if (filterCategory === "All") return result.defects;
    return result.defects.filter(d => d.type === filterCategory);
  }, [result.defects, filterCategory]);

  const totalDefects = filteredDefects.length;
  const dhu = (totalDefects / unitsInspected) * 100;

  const categoryData = Object.entries(
    result.defects.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const severityData = Object.entries(
    filteredDefects.reduce((acc, d) => {
      acc[d.severity] = (acc[d.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inspection Report: {garmentCategory}</h2>
          <p className="text-muted-foreground mt-1">Found {result.defects.length} total defects across {unitsInspected} units.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <Label htmlFor="defect-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter DHU by Type</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger id="defect-filter">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Defects</SelectItem>
                {Object.keys(CATEGORY_COLORS).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="px-4 py-2 text-lg h-full self-end">
            {unitsInspected} Units
          </Badge>
        </div>
      </div>

      {/* Visual References */}
      {images && images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Inspection References
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {images.map((img, idx) => (
              <Card key={idx} className="overflow-hidden group">
                <div className="aspect-square relative">
                  <img 
                    src={img} 
                    alt={`Reference ${idx}`} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-[10px] font-bold backdrop-blur-sm">
                    {idx === 0 ? 'RENDER (REF)' : 
                     idx === 1 ? 'PRESSURE' : 
                     idx === 2 ? 'FIT' : 
                     idx === 3 ? 'STRESS' : 'STRAIN'}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium opacity-80">DHU Score</p>
                  <h3 className="text-4xl font-bold mt-1">{dhu.toFixed(1)}%</h3>
                </div>
                <Activity className="w-8 h-8 opacity-50" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs">
                {dhu < 10 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                <span>{dhu < 10 ? 'Excellent Quality' : 'Needs Improvement'}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Defects</p>
                  <h3 className="text-4xl font-bold mt-1">{totalDefects}</h3>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">Across {unitsInspected} units</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                  <h3 className="text-4xl font-bold mt-1">
                    {filteredDefects.filter(d => d.severity === 'Critical').length}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">Require immediate action</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Batch Status</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {dhu < 5 ? 'PASSED' : dhu < 15 ? 'RE-INSPECT' : 'REJECTED'}
                  </h3>
                </div>
                {dhu < 5 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                )}
              </div>
              <Progress value={Math.max(0, 100 - dhu)} className="mt-4 h-2" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Defect Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="category">
              <TabsList className="mb-4">
                <TabsTrigger value="category">By Category</TabsTrigger>
                <TabsTrigger value="severity">By Severity</TabsTrigger>
              </TabsList>
              <TabsContent value="category" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="severity" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Root Causes & Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm leading-relaxed italic text-muted-foreground">
                "{result.summary}"
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-500" />
                Top Recommendations
              </h4>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-3">
                  {filteredDefects.slice(0, 5).map((defect, i) => (
                    <div key={i} className="text-xs p-3 rounded bg-primary/5 border-l-2 border-primary">
                      <p className="font-medium mb-1">{defect.type}: {defect.description}</p>
                      <p className="text-muted-foreground">💡 {defect.recommendation}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Defect List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Detailed Defect Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {filteredDefects.map((defect, index) => (
                <div key={index} className="group p-4 rounded-xl border hover:border-primary/50 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-muted">#{index + 1}</Badge>
                      <h4 className="font-bold text-lg">{defect.description}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Badge style={{ backgroundColor: CATEGORY_COLORS[defect.type] }} className="text-white">
                        {defect.type}
                      </Badge>
                      <Badge style={{ backgroundColor: SEVERITY_COLORS[defect.severity] }} className="text-white">
                        {defect.severity}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" /> Root Cause
                      </p>
                      <p className="text-sm bg-muted/30 p-3 rounded-lg border">{defect.rootCause}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> General Recommendation
                      </p>
                      <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/20">{defect.recommendation}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                      <p className="text-[10px] font-bold uppercase text-blue-600 mb-1">Pattern Adjustment</p>
                      <p className="text-xs text-blue-900">{defect.patternSuggestion}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                      <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Fabric & Material</p>
                      <p className="text-xs text-emerald-900">{defect.fabricSuggestion}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-600 mb-1">Trims & Accessories</p>
                      <p className="text-xs text-slate-900">{defect.trimSuggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
