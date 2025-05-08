'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getAnalyticsDataAction, type AnalyticsSummary, type DatedScore, type TopicPerformance, type QuizScoreDistributionItem } from '@/lib/actions';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

const overallProgressChartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig;

const topicPerformanceChartConfig = {
  accuracy: {
    label: "Accuracy",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);
  const [isFetching, startFetchingTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    startFetchingTransition(async () => {
      try {
        const data = await getAnalyticsDataAction();
        setAnalyticsData(data);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
        toast({
          title: "Error Fetching Analytics",
          description: (error as Error).message || "Could not load analytics data.",
          variant: "destructive",
        });
        setAnalyticsData(null); // Reset or handle error state
      }
    });
  }, [toast]);

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <LoadingSpinner size={48} />
        <p className="ml-4 text-lg">Loading analytics dashboard...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No analytics data available or failed to load.</p>
          <p className="text-sm text-muted-foreground mt-2">Please try again later or ensure there are completed quizzes/exams.</p>
        </CardContent>
      </Card>
    );
  }
  
  const {
    overallAverageScore,
    quizzesTaken,
    examsTaken,
    overallScoreProgress,
    topicPerformance,
    areasForImprovement,
    quizScoreDistribution,
  } = analyticsData;

  const PIE_CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChartIcon className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
              <CardDescription>
                Track your learning progress, quiz and exam scores, and identify areas for improvement.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Overall Average Score" value={`${overallAverageScore.toFixed(1)}%`} icon={<Activity className="h-6 w-6 text-primary" />} />
        <InfoCard title="Quizzes Taken" value={quizzesTaken.toString()} icon={<TrendingUp className="h-6 w-6 text-primary" />} />
        <InfoCard title="Exams Taken" value={examsTaken.toString()} icon={<TrendingDown className="h-6 w-6 text-primary" />} />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Overall Score Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          {overallScoreProgress.length > 0 ? (
            <ChartContainer config={overallProgressChartConfig} className="w-full h-full">
              <RechartsLineChart data={overallScoreProgress} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-score)" }} activeDot={{ r: 6 }} name="Score" />
              </RechartsLineChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No score progress data available.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Topic Performance (Accuracy %)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
         {topicPerformance.length > 0 ? (
            <ChartContainer config={topicPerformanceChartConfig} className="w-full h-full">
              <RechartsBarChart data={topicPerformance} layout="vertical" margin={{ right: 30 }}>
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis dataKey="topic" type="category" width={100} tickLine={false} axisLine={false}/>
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Legend />
                <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={4} name="Accuracy" />
              </RechartsBarChart>
            </ChartContainer>
         ) : (
            <p className="text-center text-muted-foreground py-10">No topic performance data available.</p>
         )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quiz Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {quizScoreDistribution.length > 0 ? (
              <ChartContainer config={{}} className="w-full h-full">
                  <RechartsPieChart>
                      <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                      <Pie data={quizScoreDistribution} dataKey="score" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {quizScoreDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                          ))}
                      </Pie>
                      <Legend/>
                  </RechartsPieChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">No quiz score data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
            <CardDescription>Top topics with the lowest accuracy based on exam performance.</CardDescription>
          </CardHeader>
          <CardContent>
            {areasForImprovement.length > 0 ? (
              <ul className="space-y-2">
                {areasForImprovement.map(item => (
                    <li key={item.topic} className="flex justify-between items-center p-3 bg-muted/50 rounded-md shadow-sm">
                      <div>
                        <span className="font-medium">{item.topic}</span>
                        <p className="text-xs text-muted-foreground">
                          {item.correct} / {item.total} correct
                        </p>
                      </div>
                      <span className={`font-semibold ${item.accuracy < 50 ? 'text-destructive' : item.accuracy < 75 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {item.accuracy.toFixed(1)}%
                      </span>
                    </li>
                ))}
              </ul>
            ) : (
              topicPerformance.length > 0 ? (
                <p className="text-center text-green-600 font-semibold py-10">Great job! No specific areas for improvement based on current data.</p>
              ) : (
                <p className="text-center text-muted-foreground py-10">No data available to determine areas for improvement.</p>
              )
              
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


interface InfoCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}

function InfoCard({ title, value, icon, description }: InfoCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}