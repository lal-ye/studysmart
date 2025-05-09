'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, TrendingUp, TrendingDown, AlertTriangle, Activity, Eye, BookOpen, ListChecks, CalendarDays } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, LineChart as RechartsLineChart, Line as RechartsLine, Bar as RechartsBar } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { AnalyticsSummary, DatedScore, TopicPerformance, QuizScoreDistributionItem, StoredAttempt, Subject } from '@/lib/actions'; 
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import type { ToastProps } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const overallProgressChartConfig = {
  examScore: { label: "Exam Score", color: "hsl(var(--chart-2))" },
  quizScore: { label: "Quiz Score", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const topicPerformanceChartConfig = {
  accuracy: { label: "Accuracy", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const quizDistributionChartConfig = {
  count: { label: "Quizzes", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


interface ToastArgsForPage {
  title: string;
  description?: string;
  variant?: ToastProps['variant'];
}

const STUDY_SMARTS_HISTORY_KEY = 'studySmartsAttemptsHistory';
const SUBJECTS_STORAGE_KEY = 'studySmartsSubjects';


function computeAnalyticsSummary(attempts: StoredAttempt[], selectedSubjectId: string | null): AnalyticsSummary {
  const relevantAttempts = selectedSubjectId 
    ? attempts.filter(attempt => attempt.subjectId === selectedSubjectId)
    : attempts;

  const exams = relevantAttempts.filter(a => a.type === 'Exam');
  const quizzes = relevantAttempts.filter(a => a.type === 'Quiz');

  const overallAverageScore = exams.length > 0 
    ? exams.reduce((sum, exam) => sum + exam.overallScore, 0) / exams.length
    : 0;

  const overallScoreProgress: DatedScore[] = relevantAttempts
    .map(attempt => ({
      name: `${attempt.subjectName}: ${attempt.name}`, 
      score: attempt.overallScore,
      date: attempt.date,
      type: attempt.type,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const topicPerformanceMap = new Map<string, { correct: number; total: number }>();
  exams.forEach(exam => {
    exam.examResults.forEach(result => {
      const current = topicPerformanceMap.get(result.topic) || { correct: 0, total: 0 };
      current.total += 1;
      if (result.isCorrect) current.correct += 1;
      topicPerformanceMap.set(result.topic, current);
    });
  });

  const topicPerformance: TopicPerformance[] = Array.from(topicPerformanceMap.entries())
    .map(([topic, data]) => ({
      topic,
      correct: data.correct,
      total: data.total,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const areasForImprovement = topicPerformance
    .filter(topic => topic.accuracy < 100 && topic.total >= 3) // Consider topics with at least 3 questions
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const scoreBuckets = [
    { name: "0-59%", lo: 0, hi: 59.99, count: 0 },
    { name: "60-69%", lo: 60, hi: 69.99, count: 0 },
    { name: "70-79%", lo: 70, hi: 79.99, count: 0 },
    { name: "80-89%", lo: 80, hi: 89.99, count: 0 },
    { name: "90-100%", lo: 90, hi: 100, count: 0 },
  ];

  quizzes.forEach(quiz => {
    const bucket = scoreBuckets.find(b => quiz.overallScore >= b.lo && quiz.overallScore <= b.hi);
    if (bucket) bucket.count++;
  });
  const quizScoreDistribution = scoreBuckets.map(({name, count}) => ({name, count}));


  const lastActivityDate = relevantAttempts.length > 0 
    ? new Date(Math.max(...relevantAttempts.map(a => new Date(a.date).getTime()))).toLocaleDateString() 
    : null;

  return {
    overallAverageScore,
    quizzesTaken: quizzes.length,
    examsTaken: exams.length,
    lastActivityDate,
    overallScoreProgress,
    topicPerformance,
    areasForImprovement,
    quizScoreDistribution,
  };
}


export default function AnalyticsPage() {
  const [allAttempts, setAllAttempts] = useState<StoredAttempt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null); // null for "All Subjects"
  const [isLoading, setIsLoading] = useState(true);
  const [toastArgs, setToastArgs] = useState<ToastArgsForPage | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (toastArgs) {
      toast(toastArgs);
      setToastArgs(null);
    }
  }, [toastArgs, toast]);

  const loadData = () => {
     setIsLoading(true);
    try {
      const historyString = localStorage.getItem(STUDY_SMARTS_HISTORY_KEY);
      const loadedAttempts: StoredAttempt[] = historyString ? JSON.parse(historyString) : [];
      setAllAttempts(loadedAttempts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      const subjectsString = localStorage.getItem(SUBJECTS_STORAGE_KEY);
      const loadedSubjects: Subject[] = subjectsString ? JSON.parse(subjectsString) : [];
      setSubjects(loadedSubjects.sort((a,b) => a.name.localeCompare(b.name)));

    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
      setToastArgs({
        title: "Error Loading Data",
        description: (error as Error).message || "Could not load data from local storage.",
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
     loadData();
  }, []); 

  const analyticsData = useMemo(() => {
    return computeAnalyticsSummary(allAttempts, selectedSubjectId);
  }, [allAttempts, selectedSubjectId]);


  const handleDeleteAttempt = (attemptId: string) => {
    const historyString = localStorage.getItem(STUDY_SMARTS_HISTORY_KEY);
    if (historyString) {
        const currentAllAttempts: StoredAttempt[] = JSON.parse(historyString);
        const updatedHistory = currentAllAttempts.filter(attempt => attempt.id !== attemptId);
        localStorage.setItem(STUDY_SMARTS_HISTORY_KEY, JSON.stringify(updatedHistory));
        setAllAttempts(updatedHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setToastArgs({ title: "Attempt Deleted", variant: "destructive"});
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
  
  const {
    overallAverageScore,
    quizzesTaken,
    examsTaken,
    lastActivityDate,
    overallScoreProgress,
    topicPerformance,
    areasForImprovement,
    quizScoreDistribution,
  } = analyticsData;

  const PIE_CHART_COLORS = [ // Used for Quiz Distribution for now, can be expanded
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
    "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  ];

  const selectedSubjectName = selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId)?.name : "All Subjects";

  return (
    <div className="space-y-6">
      <Card className="shadow-neo-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChartIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="text-2xl font-bold">Analytics Dashboard: {selectedSubjectName}</CardTitle>
              <CardDescription>
                Track learning progress. Select a subject or view overall analytics.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs value={selectedSubjectId || "all"} onValueChange={(value) => setSelectedSubjectId(value === "all" ? null : value)}>
                <TabsList className="grid w-full grid-cols-min-1 md:grid-cols-min-3 lg:grid-cols-min-4 xl:grid-cols-min-5 bg-card border-2 border-border shadow-neo-sm mb-4 overflow-x-auto">
                    <TabsTrigger value="all">All Subjects</TabsTrigger>
                    {subjects.map(subject => (
                        <TabsTrigger key={subject.id} value={subject.id}>{subject.name}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="Avg. Exam Score" value={`${overallAverageScore.toFixed(1)}%`} icon={<Activity className="h-6 w-6 text-primary"/>} description="Based on completed exams"/>
        <InfoCard title="Quizzes Taken" value={quizzesTaken.toString()} icon={<ListChecks className="h-6 w-6 text-primary"/>} description="Total quizzes completed"/>
        <InfoCard title="Exams Taken" value={examsTaken.toString()} icon={<BookOpen className="h-6 w-6 text-primary"/>} description="Total exams completed"/>
        <InfoCard title="Last Activity" value={lastActivityDate || "N/A"} icon={<CalendarDays className="h-6 w-6 text-primary"/>} description="Date of last recorded activity"/>
      </div>

      <Card className="shadow-neo-md">
        <CardHeader>
          <CardTitle className="font-bold">Overall Score Progress</CardTitle>
          <CardDescription>Shows exam and quiz scores over time for {selectedSubjectName}.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] bg-card p-4 border-2 border-border">
          {overallScoreProgress.length > 0 ? (
            <ChartContainer config={overallProgressChartConfig} className="w-full h-full">
              <RechartsLineChart data={overallScoreProgress} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} aria-label="Line chart showing score progress">
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} stroke="hsl(var(--foreground))"/>
                <YAxis domain={[0, 100]} unit="%" stroke="hsl(var(--foreground))"/>
                <Tooltip content={<ChartTooltipContent indicator="line" labelKey="name" />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 2, strokeDasharray: '3 3' }}/>
                <Legend />
                <RechartsLine type="monotone" dataKey="score" name="Score (Exam)" strokeWidth={3} dot={{ r: 5, stroke: 'hsl(var(--border))', strokeWidth: 2 }} activeDot={{ r: 8 }}
                    strokeDasharray={(value) => value.payload.type === 'Quiz' ? "5 5" : "0"} /* Differentiate quiz line */
                    stroke={(value) => value.payload.type === 'Quiz' ? "var(--color-quizScore)" : "var(--color-examScore)"}
                    fill={(value) => value.payload.type === 'Quiz' ? "var(--color-quizScore)" : "var(--color-examScore)"}
                 />
              </RechartsLineChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No score progress data available for {selectedSubjectName}.</p>
          )}
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-neo-md">
          <CardHeader>
            <CardTitle className="font-bold">Topic Performance (Exam Accuracy %)</CardTitle>
            <CardDescription>Based on completed exams for {selectedSubjectName}.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] bg-card p-4 border-2 border-border">
          {topicPerformance.length > 0 ? (
              <ChartContainer config={topicPerformanceChartConfig} className="w-full h-full">
                <RechartsBarChart data={topicPerformance} layout="vertical" margin={{ right: 30, left: 10, bottom: 5, top:5 }} aria-label="Bar chart showing accuracy per topic">
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="hsl(var(--foreground))"/>
                  <YAxis dataKey="topic" type="category" width={120} tickLine={false} axisLine={false} stroke="hsl(var(--foreground))"/>
                  <Tooltip content={<ChartTooltipContent indicator="dot" />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }}/>
                  <Legend />
                    <RechartsBar dataKey="accuracy" fill="var(--color-accuracy)" radius={[0, 4, 4, 0]} name="Accuracy" barSize={20}/>
                </RechartsBarChart>
              </ChartContainer>
          ) : (
              <p className="text-center text-muted-foreground py-10">No exam topic performance data for {selectedSubjectName}.</p>
          )}
          </CardContent>
        </Card>

        <Card className="shadow-neo-md">
          <CardHeader>
            <CardTitle className="font-bold">Areas for Improvement (Exams)</CardTitle>
            <CardDescription>Top topics with the lowest accuracy for {selectedSubjectName}.</CardDescription>
          </CardHeader>
          <CardContent className="bg-card p-4 border-2 border-border min-h-[350px]">
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
                        "font-bold text-lg",
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
              relevantAttempts.filter(a => a.type === 'Exam').length > 0 ? ( 
                <p className="text-center text-green-600 font-semibold py-10">Great job! No specific areas for improvement based on current exam data for {selectedSubjectName}.</p>
              ) : (
                <p className="text-center text-muted-foreground py-10">Complete an exam for {selectedSubjectName} to identify areas for improvement.</p>
              )
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-neo-md">
        <CardHeader>
          <CardTitle className="font-bold">Quiz Score Distribution</CardTitle>
          <CardDescription>Distribution of quiz scores for {selectedSubjectName}.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] bg-card p-4 border-2 border-border flex items-center justify-center">
          {quizScoreDistribution.some(q => q.count > 0) ? (
            <ChartContainer config={quizDistributionChartConfig} className="w-full h-full">
                <RechartsBarChart data={quizScoreDistribution} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} aria-label="Bar chart of quiz score distribution">
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))"/>
                    <YAxis allowDecimals={false} stroke="hsl(var(--foreground))"/>
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }}/>
                    <Legend />
                    <RechartsBar dataKey="count" fill="var(--color-count)" name="Number of Quizzes" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No quiz score data available for {selectedSubjectName}. Complete some quizzes.</p>
          )}
        </CardContent>
      </Card>

      {(allAttempts.filter(a => selectedSubjectId ? a.subjectId === selectedSubjectId : true)).length > 0 && (
            <Card className="shadow-neo-lg">
                <CardHeader>
                    <CardTitle className="font-bold">Previous Attempts for {selectedSubjectName}</CardTitle>
                    <CardDescription>Review detailed results from past exams and quizzes.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full border-2 border-border shadow-neo-md">
                        {(allAttempts.filter(a => selectedSubjectId ? a.subjectId === selectedSubjectId : true)).map((attempt) => ( 
                            <AccordionItem value={attempt.id} key={attempt.id} className="border-b-2 border-border last:border-b-0">
                                <AccordionTrigger className="text-left hover:underline px-4 py-3">
                                    <div className="flex items-center justify-between w-full">
                                      <div>
                                        <span className="font-bold">{attempt.subjectName}: {attempt.name}</span>
                                        <Badge variant="outline" className="ml-2 border-2 border-border shadow-neo-sm">{attempt.type}</Badge>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{new Date(attempt.date).toLocaleDateString()}</span>
                                        <Badge variant={attempt.overallScore >= 70 ? "default" : attempt.overallScore >=50 ? "secondary" : "destructive"} className="border-2 border-border shadow-neo-sm">
                                            Score: {attempt.overallScore.toFixed(0)}%
                                        </Badge>
                                      </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-sm space-y-4 px-4 pb-4 bg-muted/30">
                                    <p><strong>Overall Score:</strong> {attempt.overallScore.toFixed(1)}%
                                      {attempt.type === 'Exam' && ` (${attempt.examResults.filter(r => r.isCorrect).length} / ${attempt.examQuestions.length})`}
                                    </p>
                                    {attempt.type === 'Exam' && attempt.topicsToReview.length > 0 && (
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
                                                <Button variant="destructive" size="sm" aria-label={`Delete attempt ${attempt.name}`}>
                                                    <Trash2 className="mr-1 h-4 w-4" /> Delete Attempt
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="shadow-neo-lg border-3 rounded-none">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="font-bold">Delete Attempt: {attempt.name}?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete this attempt record. This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteAttempt(attempt.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    {attempt.type === 'Exam' && (
                                      <>
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
                                      </>
                                    )}
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
    <Card className="shadow-neo-md hover:shadow-neo-lg transition-all duration-150 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

// Helper for TabsList grid columns - ensures at least 1 column, max 5, auto otherwise
const gridColsMinMax = (min:number, max:number) => {
    return `minmax(0, repeat(${max}, minmax(0, 1fr)))`;
}
// Add to tailwind.config.ts if not already there for dynamic grid columns
// theme: { extend: { gridTemplateColumns: { 'min-1': gridColsMinMax(1,1), ...up to 'min-5': gridColsMinMax(1,5) }}}
// For now, using Tailwind's built-in grid-cols-X and overflow-x-auto as a simpler approach.