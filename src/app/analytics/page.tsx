
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, TrendingUp, TrendingDown, AlertTriangle, Activity, Eye } from 'lucide-react'; // Added Eye
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, LineChart as RechartsLineChart, Line as RechartsLine, Bar as RechartsBar } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { AnalyticsSummary, DatedScore, TopicPerformance, QuizScoreDistributionItem, StoredExamAttempt } from '@/lib/actions'; 
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import type { ToastProps } from '@/components/ui/toast';
import { Button } from '@/components/ui/button'; // Added Button import
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Added AlertDialog
import { Trash2 } from 'lucide-react'; // Added Trash2

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

interface ToastArgsForPage {
  title: string;
  description?: string;
  variant?: ToastProps['variant'];
}

const EXAMS_HISTORY_KEY = 'studySmartsExamHistory'; // Key for storing/retrieving exam history


export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);
  const [storedExamAttempts, setStoredExamAttempts] = useState<StoredExamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastArgs, setToastArgs] = useState<ToastArgsForPage | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (toastArgs) {
      toast(toastArgs);
      setToastArgs(null);
    }
  }, [toastArgs, toast]);

  const loadAnalyticsData = () => {
     setIsLoading(true);
    try {
      const historyString = localStorage.getItem(EXAMS_HISTORY_KEY);
      const loadedAttempts: StoredExamAttempt[] = historyString ? JSON.parse(historyString) : [];
      setStoredExamAttempts(loadedAttempts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())); // Store sorted attempts

      if (loadedAttempts.length > 0) {
        const overallScores: DatedScore[] = loadedAttempts.map(attempt => ({
          name: `${attempt.subjectName}: ${attempt.name}`, 
          score: attempt.overallScore,
          date: attempt.date, // Use the date string directly
          type: 'Exam',
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalScoreSum = 0;
        loadedAttempts.forEach(attempt => totalScoreSum += attempt.overallScore); // Sum up scores from all attempts
        const overallAverageScore = loadedAttempts.length > 0 ? totalScoreSum / loadedAttempts.length : 0;

        const topicPerformanceMap = new Map<string, { correct: number; total: number }>();
        loadedAttempts.forEach(attempt => {
          attempt.examResults.forEach(result => {
            const current = topicPerformanceMap.get(result.topic) || { correct: 0, total: 0 };
            current.total += 1;
            if (result.isCorrect) {
              current.correct += 1;
            }
            topicPerformanceMap.set(result.topic, current);
          });
        });

        const topicPerformance: TopicPerformance[] = Array.from(topicPerformanceMap.entries()).map(([topic, data]) => ({
          topic,
          correct: data.correct,
          total: data.total,
          accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        })).sort((a,b) => b.accuracy - a.accuracy); 

        const areasForImprovement = [...topicPerformance]
          .filter(topic => topic.accuracy < 100) 
          .sort((a, b) => a.accuracy - b.accuracy) 
          .slice(0, 5); 
        
        const quizScoreDistribution: QuizScoreDistributionItem[] = []; 
        const quizzesTaken = 0; // Placeholder


        setAnalyticsData({
          overallAverageScore,
          quizzesTaken, 
          examsTaken: loadedAttempts.length,
          overallScoreProgress: overallScores,
          topicPerformance,
          areasForImprovement,
          quizScoreDistribution, 
        });
      } else {
        setAnalyticsData({
            overallAverageScore: 0,
            quizzesTaken: 0,
            examsTaken: 0,
            overallScoreProgress: [],
            topicPerformance: [],
            areasForImprovement: [],
            quizScoreDistribution: [],
        });
      }
    } catch (error) {
      console.error("Failed to load or process analytics data from localStorage:", error);
      setToastArgs({
        title: "Error Loading Analytics",
        description: (error as Error).message || "Could not load analytics data from local storage.",
        variant: "destructive",
      });
      setAnalyticsData(null); 
    } finally {
        setIsLoading(false);
    }
  };
  
  // Load data on initial mount
  useEffect(() => {
     loadAnalyticsData();
  }, []); 


  const handleDeleteExamAttempt = (attemptId: string) => {
    const allHistoryString = localStorage.getItem(EXAMS_HISTORY_KEY);
    if (allHistoryString) {
        const allHistory: StoredExamAttempt[] = JSON.parse(allHistoryString);
        const updatedHistory = allHistory.filter(attempt => attempt.id !== attemptId);
        localStorage.setItem(EXAMS_HISTORY_KEY, JSON.stringify(updatedHistory));
        // Reload analytics data to reflect the deletion
        loadAnalyticsData(); 
        setToastArgs({ title: "Exam Attempt Deleted", variant: "destructive"});
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]" role="status" aria-live="polite">
        <LoadingSpinner size={48} />
        <p className="ml-4 text-lg">Loading analytics dashboard...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Card className="shadow-neo-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No analytics data available or failed to load.</p>
          <p className="text-sm text-muted-foreground mt-2">Please complete some exams to see your analytics.</p>
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
      <Card className="shadow-neo-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChartIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
              <CardDescription>
                Track your learning progress, exam scores, and identify areas for improvement.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Overall Average Exam Score" value={`${overallAverageScore.toFixed(1)}%`} icon={<Activity className="h-6 w-6 text-primary" aria-hidden="true"/>} description="Based on all completed exams"/>
        <InfoCard title="Quizzes Taken" value={quizzesTaken.toString()} icon={<TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />} description="Feature coming soon"/>
        <InfoCard title="Exams Taken" value={examsTaken.toString()} icon={<TrendingDown className="h-6 w-6 text-primary" aria-hidden="true"/>} />
      </div>

      <Card className="shadow-neo-md">
        <CardHeader>
          <CardTitle className="font-bold">Overall Exam Score Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] bg-card p-4 border-2 border-border">
          {overallScoreProgress.length > 0 ? (
            <ChartContainer config={overallProgressChartConfig} className="w-full h-full">
              <RechartsLineChart data={overallScoreProgress} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} aria-label="Line chart showing overall exam score progress over time">
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} stroke="hsl(var(--foreground))"/>
                <YAxis domain={[0, 100]} unit="%" stroke="hsl(var(--foreground))"/>
                <Tooltip content={<ChartTooltipContent indicator="line" labelKey="name" />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 2, strokeDasharray: '3 3' }}/>
                <Legend />
                   <RechartsLine type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={3} dot={{ r: 5, fill: "var(--color-score)", stroke: 'hsl(var(--border))', strokeWidth: 2 }} activeDot={{ r: 8 }} name="Score" />
              </RechartsLineChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No exam score progress data available. Complete an exam to see progress.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-neo-md">
        <CardHeader>
          <CardTitle className="font-bold">Topic Performance (Accuracy %)</CardTitle>
          <CardDescription>Based on all completed exams.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] bg-card p-4 border-2 border-border">
         {topicPerformance.length > 0 ? (
            <ChartContainer config={topicPerformanceChartConfig} className="w-full h-full">
              <RechartsBarChart data={topicPerformance} layout="vertical" margin={{ right: 30, left: 10 }} aria-label="Bar chart showing accuracy percentage per topic">
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="hsl(var(--foreground))"/>
                <YAxis dataKey="topic" type="category" width={120} tickLine={false} axisLine={false} stroke="hsl(var(--foreground))"/>
                <Tooltip content={<ChartTooltipContent indicator="dot" />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }}/>
                <Legend />
                   <RechartsBar dataKey="accuracy" fill="var(--color-accuracy)" radius={[0, 4, 4, 0]} name="Accuracy" barSize={20}/> {/* Adjusted radius for Neo look */}
              </RechartsBarChart>
            </ChartContainer>
         ) : (
            <p className="text-center text-muted-foreground py-10">No topic performance data available. Complete an exam to see performance.</p>
         )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-neo-md">
          <CardHeader>
            <CardTitle className="font-bold">Quiz Score Distribution</CardTitle>
            <CardDescription>Feature coming soon (Quizzes are not yet integrated with subject-based analytics).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] bg-card p-4 border-2 border-border flex items-center justify-center">
            {quizScoreDistribution.length > 0 ? (
              <ChartContainer config={{}} className="w-full h-full">
                  <RechartsPieChart aria-label="Pie chart showing quiz score distribution">
                      <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                      <Pie data={quizScoreDistribution} dataKey="score" nameKey="name" cx="50%" cy="50%" outerRadius={100} label stroke="hsl(var(--border))" strokeWidth={2}>
                          {quizScoreDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                          ))}
                      </Pie>
                      <Legend/>
                  </RechartsPieChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">No quiz score data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-neo-md">
          <CardHeader>
            <CardTitle className="font-bold">Areas for Improvement</CardTitle>
            <CardDescription>Top topics with the lowest accuracy based on exam performance.</CardDescription>
          </CardHeader>
          <CardContent className="bg-card p-4 border-2 border-border">
            {areasForImprovement.length > 0 ? (
              <ul className="space-y-2">
                {areasForImprovement.map(item => (
                    <li key={item.topic} className="flex justify-between items-center p-3 bg-muted/50 rounded-none border-2 border-border shadow-neo-sm">
                      <div>
                        <span className="font-bold">{item.topic}</span>
                        <p className="text-xs text-muted-foreground">
                          {item.correct} / {item.total} correct
                        </p>
                      </div>
                      <span className={cn(
                        "font-bold text-lg", // Made score bigger and bolder
                        item.accuracy < 50 ? 'text-destructive' : 
                        item.accuracy < 75 ? 'text-yellow-600 dark:text-yellow-400' : 
                        'text-green-600 dark:text-green-400'
                      )}>
                        {item.accuracy.toFixed(0)}%
                      </span>
                    </li>
                ))}
              </ul>
            ) : (
              examsTaken > 0 ? ( 
                <p className="text-center text-green-600 font-semibold py-10">Great job! No specific areas for improvement based on current exam data.</p>
              ) : (
                <p className="text-center text-muted-foreground py-10">Complete an exam to identify areas for improvement.</p>
              )
              
            )}
          </CardContent>
        </Card>
      </div>
        {storedExamAttempts.length > 0 && (
            <Card className="shadow-neo-lg">
                <CardHeader>
                    <CardTitle className="font-bold">Previous Exam Attempts</CardTitle>
                    <CardDescription>Review detailed results from your past exams across all subjects.</CardDescription>
                </CardHeader>
                <CardContent className="p-0"> {/* Remove padding for full-width accordion */}
                    <Accordion type="single" collapsible className="w-full border-2 border-border shadow-neo-md">
                        {storedExamAttempts.map((attempt) => ( 
                            <AccordionItem value={attempt.id} key={attempt.id} className="border-b-2 border-border last:border-b-0">
                                <AccordionTrigger className="text-left hover:underline px-4 py-3">
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-bold">{attempt.subjectName}: {attempt.name} - {new Date(attempt.date).toLocaleDateString()}</span>
                                        <Badge variant={attempt.overallScore >= 70 ? "default" : attempt.overallScore >=50 ? "secondary" : "destructive"} className="border-2 border-border shadow-neo-sm">
                                            Score: {attempt.overallScore.toFixed(0)}%
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-sm space-y-4 px-4 pb-4 bg-muted/30">
                                    <p><strong>Overall Score:</strong> {attempt.overallScore.toFixed(1)}% ({attempt.examResults.filter(r => r.isCorrect).length} / {attempt.examQuestions.length})</p>
                                    {attempt.topicsToReview.length > 0 && (
                                        <div>
                                            <h4 className="font-bold mb-1">Topics to Review:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {attempt.topicsToReview.map(topic => <Badge key={topic} variant="outline" className="border-2 border-border shadow-neo-sm">{topic}</Badge>)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end pt-2">
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" aria-label={`Delete exam attempt ${attempt.name}`}>
                                                    <Trash2 className="mr-1 h-4 w-4" /> Delete Attempt
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="shadow-neo-lg border-3 rounded-none">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="font-bold">Delete Exam Attempt: {attempt.name}?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete this exam attempt record. This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteExamAttempt(attempt.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    <h4 className="font-bold mt-3">Detailed Results:</h4>
                                    <ul className="space-y-3">
                                        {attempt.examQuestions.map((question, i) => {
                                            const result = attempt.examResults[i];
                                            return (
                                                <li key={question.question + i} className="p-3 border-2 border-border rounded-none bg-card shadow-neo-sm">
                                                    <p className="font-bold">Q{i+1}: {question.question}</p>
                                                    <p className="text-xs text-muted-foreground">Topic: {question.topic} | Type: {question.type.replace('_', ' ')}</p>
                                                    <p><strong>Your Answer:</strong> {result.userAnswer || <span className="italic text-muted-foreground">Not answered</span>}</p>
                                                    {!result.isCorrect && <p><strong>Correct Answer:</strong> {question.correctAnswer}</p>}
                                                     <Badge variant={result.isCorrect ? "default" : "destructive"} className={cn("border-2 border-border shadow-neo-sm mt-1", result.isCorrect ? "bg-green-500 hover:bg-green-600" : "")}>
                                                        {result.isCorrect ? "Correct" : "Incorrect"}
                                                    </Badge>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        )}
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
    <Card className="shadow-neo-md hover:shadow-neo-lg transition-all duration-150 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5"> {/* Added hover effect */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold">{title}</CardTitle> {/* Font bold */}
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
