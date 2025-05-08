'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react'; // Removed PieChartIcon and LineChartIcon as they are not directly used as page icons
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, LineChart as RechartsLineChart, Line as RechartsLine, Bar as RechartsBar } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { AnalyticsSummary, DatedScore, TopicPerformance, QuizScoreDistributionItem, StoredExamAttempt } from '@/lib/actions'; // ExamResult no longer needed directly here
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import type { ToastProps } from '@/components/ui/toast';


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

  useEffect(() => {
    setIsLoading(true);
    try {
      const historyString = localStorage.getItem('studySmartsExamHistory');
      const loadedAttempts: StoredExamAttempt[] = historyString ? JSON.parse(historyString) : [];
      setStoredExamAttempts(loadedAttempts); // Store all attempts for detailed view

      if (loadedAttempts.length > 0) {
        const overallScores: DatedScore[] = loadedAttempts.map(attempt => ({
          name: `${attempt.subjectName} - ${attempt.name}`, // Combine subject and exam name
          score: attempt.overallScore,
          date: attempt.date,
          type: 'Exam',
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalScoreSum = 0;
        overallScores.forEach(s => totalScoreSum += s.score);
        const overallAverageScore = overallScores.length > 0 ? totalScoreSum / overallScores.length : 0;

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
        })).sort((a,b) => b.accuracy - a.accuracy); // Sort by accuracy descending

        const areasForImprovement = [...topicPerformance]
          .filter(topic => topic.accuracy < 100) // Only include if not perfect
          .sort((a, b) => a.accuracy - b.accuracy) // Sort by accuracy ascending (worst first)
          .slice(0, 5); // Top 5 areas
        
        // Quiz analytics are not yet implemented with subjects, so these remain placeholder/empty
        const quizScoreDistribution: QuizScoreDistributionItem[] = []; 
        const quizzesTaken = 0; 


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
        // No attempts, set to default empty state
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
      setAnalyticsData(null); // Set to null to show error state
    } finally {
        setIsLoading(false);
    }
  }, [toast]); // Removed analyticsData from dependencies to avoid re-triggering on its own update.

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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden="true" />
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
      <Card className="shadow-lg">
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

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Overall Exam Score Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          {overallScoreProgress.length > 0 ? (
            <ChartContainer config={overallProgressChartConfig} className="w-full h-full">
              <RechartsLineChart data={overallScoreProgress} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} aria-label="Line chart showing overall exam score progress over time">
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltipContent indicator="line" labelKey="name" />} />
                <Legend />
                   <RechartsLine type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-score)" }} activeDot={{ r: 6 }} name="Score" />
              </RechartsLineChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No exam score progress data available. Complete an exam to see progress.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Topic Performance (Accuracy %)</CardTitle>
          <CardDescription>Based on all completed exams.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
         {topicPerformance.length > 0 ? (
            <ChartContainer config={topicPerformanceChartConfig} className="w-full h-full">
              <RechartsBarChart data={topicPerformance} layout="vertical" margin={{ right: 30 }} aria-label="Bar chart showing accuracy percentage per topic">
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis dataKey="topic" type="category" width={120} tickLine={false} axisLine={false}/>
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Legend />
                   <RechartsBar dataKey="accuracy" fill="var(--color-accuracy)" radius={4} name="Accuracy" />
              </RechartsBarChart>
            </ChartContainer>
         ) : (
            <p className="text-center text-muted-foreground py-10">No topic performance data available. Complete an exam to see performance.</p>
         )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quiz Score Distribution</CardTitle>
            <CardDescription>Feature coming soon (Quizzes are not yet integrated with subject-based analytics).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {quizScoreDistribution.length > 0 ? (
              <ChartContainer config={{}} className="w-full h-full">
                  <RechartsPieChart aria-label="Pie chart showing quiz score distribution">
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
              <p className="text-center text-muted-foreground py-10">No quiz score data available yet.</p>
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
                      <span className={cn(
                        "font-semibold",
                        item.accuracy < 50 ? 'text-destructive' : 
                        item.accuracy < 75 ? 'text-yellow-500 dark:text-yellow-400' : 
                        'text-green-500 dark:text-green-400'
                      )}>
                        {item.accuracy.toFixed(1)}%
                      </span>
                    </li>
                ))}
              </ul>
            ) : (
              examsTaken > 0 ? ( // Only show "Great job" if exams have been taken
                <p className="text-center text-green-600 font-semibold py-10">Great job! No specific areas for improvement based on current exam data.</p>
              ) : (
                <p className="text-center text-muted-foreground py-10">Complete an exam to identify areas for improvement.</p>
              )
              
            )}
          </CardContent>
        </Card>
      </div>
        {storedExamAttempts.length > 0 && (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Previous Exam Attempts</CardTitle>
                    <CardDescription>Review detailed results from your past exams across all subjects.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full" aria-label="Previous Exam Attempts">
                        {storedExamAttempts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((attempt) => ( 
                            <AccordionItem value={attempt.id} key={attempt.id}>
                                <AccordionTrigger className="text-left hover:no-underline">
                                    <div className="flex items-center justify-between w-full">
                                        <span>{attempt.subjectName}: {attempt.name} - {new Date(attempt.date).toLocaleDateString()}</span>
                                        <Badge variant={attempt.overallScore >= 70 ? "default" : attempt.overallScore >=50 ? "secondary" : "destructive"}>
                                            Score: {attempt.overallScore.toFixed(1)}%
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-sm space-y-4">
                                    <p><strong>Overall Score:</strong> {attempt.overallScore.toFixed(1)}% ({attempt.examResults.filter(r => r.isCorrect).length} / {attempt.examQuestions.length})</p>
                                    {attempt.topicsToReview.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-1">Topics to Review:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {attempt.topicsToReview.map(topic => <Badge key={topic} variant="outline">{topic}</Badge>)}
                                            </div>
                                        </div>
                                    )}
                                    <h4 className="font-semibold mt-3">Detailed Results:</h4>
                                    <ul className="space-y-3">
                                        {attempt.examQuestions.map((question, i) => {
                                            const result = attempt.examResults[i];
                                            return (
                                                <li key={question.question + i} className="p-3 border rounded-md bg-muted/30">
                                                    <p className="font-medium">Q{i+1}: {question.question}</p>
                                                    <p className="text-xs text-muted-foreground">Topic: {question.topic} | Type: {question.type.replace('_', ' ')}</p>
                                                    <p><strong>Your Answer:</strong> {result.userAnswer || <span className="italic text-muted-foreground">Not answered</span>}</p>
                                                    {!result.isCorrect && <p><strong>Correct Answer:</strong> {question.correctAnswer}</p>}
                                                     <Badge variant={result.isCorrect ? "default" : "destructive"} className={cn(result.isCorrect ? "bg-green-500 hover:bg-green-600" : "")}>
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
