'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateAndAnalyzeExamAction, getExtraReadingsAction } from '@/lib/actions';
import type { GenerateAndAnalyzeExamActionInput, GenerateExamAndAnalyzeOutput, ExamQuestion, ExamResult, StoredExamAttempt, Article } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, BookOpen, FileText, ExternalLink, ClipboardCheck, ArrowLeft, ArrowRight, Send, Trash2, Eye } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { ToastProps } from '@/components/ui/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ExamsManagerProps {
  subjectId: string;
  subjectName: string;
}

type ExamState = 'idle' | 'generating_exam' | 'taking_exam' | 'grading_exam' | 'showing_results' | 'viewing_history';

const EXAMS_HISTORY_KEY = 'studySmartsExamHistory';


export default function ExamsManager({ subjectId, subjectName }: ExamsManagerProps) {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [examState, setExamState] = useState<ExamState>('idle');
  
  const [currentExamQuestions, setCurrentExamQuestions] = useState<ExamQuestion[]>([]);
  const [persistedExamQuestions, setPersistedExamQuestions] = useState<ExamQuestion[]>([]); 
  const [examResultsData, setExamResultsData] = useState<GenerateExamAndAnalyzeOutput | null>(null); // For current exam being taken/graded
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [examName, setExamName] = useState<string>('');

  const [examHistory, setExamHistory] = useState<StoredExamAttempt[]>([]);
  const [viewingExamAttempt, setViewingExamAttempt] = useState<StoredExamAttempt | null>(null);


  const [isProcessingAction, startProcessingActionTransition] = useTransition();
  const [isFetchingReadings, startFetchingReadingsTransition] = useTransition();
  const [toastArgs, setToastArgs] = useState<Parameters<typeof useToast>[0] | null>(null);
  const { toast } = useToast();


  const loadExamHistory = useCallback(() => {
    try {
      const historyString = localStorage.getItem(EXAMS_HISTORY_KEY);
      const allAttempts: StoredExamAttempt[] = historyString ? JSON.parse(historyString) : [];
      setExamHistory(allAttempts.filter(attempt => attempt.subjectId === subjectId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Failed to load exam history:", error);
      toast({ title: "Error", description: "Could not load exam history.", variant: "destructive" });
      setExamHistory([]);
    }
  }, [subjectId, toast]);

  useEffect(() => { loadExamHistory(); }, [loadExamHistory]);
  useEffect(() => { if (toastArgs) { toast(toastArgs); setToastArgs(null); }}, [toastArgs, toast]);


  const handleGenerateExam = () => {
    if (!courseMaterial.trim()) {
      setToastArgs({ title: 'Input Required', description: 'Please provide course material to generate an exam.', variant: 'destructive' });
      return;
    }
    if (!examName.trim()) {
      setToastArgs({ title: 'Exam Name Required', description: 'Please provide a name for this exam attempt.', variant: 'destructive'});
      return;
    }
    setExamState('generating_exam');
    setCurrentExamQuestions([]);
    setPersistedExamQuestions([]); 
    setExamResultsData(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setViewingExamAttempt(null);

    startProcessingActionTransition(async () => {
      try {
        const input: GenerateAndAnalyzeExamActionInput = { courseMaterial, numberOfQuestions: 30 };
        const result = await generateAndAnalyzeExamAction(input);
        if (result.exam && result.exam.length > 0) {
          setCurrentExamQuestions(result.exam);
          setPersistedExamQuestions(result.exam); 
          setExamState('taking_exam');
          setToastArgs({ title: 'Exam Ready!', description: `You can now start the exam "${examName}".` });
        } else {
          setToastArgs({ title: 'Generation Issue', description: 'No questions were generated. Try different material.', variant: 'destructive' });
          setExamState('idle');
        }
      } catch (error) {
        setToastArgs({ title: 'Error Generating Exam', description: (error as Error).message || 'An unexpected error occurred.', variant: 'destructive' });
        setExamState('idle');
      }
    });
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmitExam = () => {
    if (persistedExamQuestions.length === 0) {
        setToastArgs({ title: 'Error', description: 'No exam questions found to submit.', variant: 'destructive'});
        setExamState('idle'); 
        return;
    }
    setExamState('grading_exam');
    startProcessingActionTransition(async () => {
      try {
        const answersArray = persistedExamQuestions.map((_, index) => userAnswers[index] || ""); 
        const input: GenerateAndAnalyzeExamActionInput = { 
          courseMaterial, // Course material might not be strictly needed if exam is pre-generated, but flow expects it
          numberOfQuestions: persistedExamQuestions.length, 
          userAnswers: answersArray,
          exam: persistedExamQuestions, 
        };
        const result = await generateAndAnalyzeExamAction(input);
        
        const finalResults = result.results;
        const overallScore = finalResults.filter(r => r.isCorrect).length / result.exam.length * 100;
        const attemptId = Date.now().toString();
        
        const newAttempt: StoredExamAttempt = {
            id: attemptId,
            subjectId,
            subjectName, // Store subject name for convenience
            name: examName.trim() || `Exam - ${new Date().toLocaleString()}`, // Use the name set before generation
            date: new Date().toISOString().split('T')[0], 
            examQuestions: result.exam,
            examResults: finalResults,
            overallScore: overallScore,
            topicsToReview: result.topicsToReview,
        };

        try {
            const allHistoryString = localStorage.getItem(EXAMS_HISTORY_KEY);
            const allHistory: StoredExamAttempt[] = allHistoryString ? JSON.parse(allHistoryString) : [];
            allHistory.push(newAttempt);
            localStorage.setItem(EXAMS_HISTORY_KEY, JSON.stringify(allHistory));
            // Update local state for immediate display
            setExamHistory(prev => [newAttempt, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setToastArgs({ title: 'Exam Graded & Saved!', description: 'Your results are ready and saved to your history.' });
        } catch (e) {
            console.error("Failed to save exam to localStorage", e);
            setToastArgs({ title: 'Exam Graded (Save Failed)', description: 'Results ready, but failed to save to history.', variant: 'destructive' });
        }

        setExamResultsData(result); // For current result display
        setExamState('showing_results');

      } catch (error) {
        setToastArgs({ title: 'Error Grading Exam', description: (error as Error).message || 'An unexpected error occurred.', variant: 'destructive' });
        setExamState('taking_exam'); 
      }
    });
  };

  const handleFetchExtraReadings = async (topic: string, isCurrentExam: boolean = true) => {
    startFetchingReadingsTransition(async () => {
      try {
        const readingsResult = await getExtraReadingsAction({ topic });
        
        if (isCurrentExam && examResultsData) {
          setExamResultsData(prevData => {
            if (!prevData) return null;
            const existingUrls = new Set((prevData.extraReadings || []).map(ar => ar.url));
            const newArticlesToAdd = readingsResult.articles.filter(newArticle => !existingUrls.has(newArticle.url));
            if (newArticlesToAdd.length === 0) {
              toast({ title: `No New Readings Found`, description: `Could not find any new articles for "${topic}". They might already be listed.`, variant: "default" });
              return prevData;
            }
            const updatedReadings = [...(prevData.extraReadings || []), ...newArticlesToAdd];
            toast({ title: 'Extra Readings Fetched!', description: `Found ${newArticlesToAdd.length} new reading(s) for ${topic}.` });
            return { ...prevData, extraReadings: updatedReadings };
          });
        } else if (!isCurrentExam && viewingExamAttempt) {
          // Logic to add to historical attempt - requires updating that object if we want to persist this
          // For now, just toast and maybe show them, but they won't be saved with the old attempt unless explicitly handled
           toast({ title: 'Readings Found (Not Saved to History)', description: `Found ${readingsResult.articles.length} readings for ${topic}. These are not saved with the historical exam record.` });
           // Potentially display these in a temporary modal or section
           // If we wanted to save, we'd update localStorage and the viewingExamAttempt state
        } else {
           toast({ title: "Error", description: "Exam data not available to add readings.", variant: "destructive" });
        }

      } catch (error) {
        setToastArgs({ title: `Error Fetching Readings for ${topic}`, description: (error as Error).message, variant: 'destructive' });
      }
    });
  };
  
  const handleFileRead = (content: string) => { setCourseMaterial(content); };
  
  const handleStartNewExamProcess = () => {
    setExamState('idle'); 
    setCourseMaterial(''); 
    setExamResultsData(null);
    setCurrentExamQuestions([]);
    setPersistedExamQuestions([]);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setExamName(''); 
    setViewingExamAttempt(null);
  };

  const handleViewExamHistoryItem = (attempt: StoredExamAttempt) => {
    setViewingExamAttempt(attempt);
    setExamState('viewing_history');
  };
  
  const handleDeleteExamAttempt = (attemptId: string) => {
    const allHistoryString = localStorage.getItem(EXAMS_HISTORY_KEY);
    if (allHistoryString) {
        const allHistory: StoredExamAttempt[] = JSON.parse(allHistoryString);
        const updatedHistory = allHistory.filter(attempt => attempt.id !== attemptId);
        localStorage.setItem(EXAMS_HISTORY_KEY, JSON.stringify(updatedHistory));
        setExamHistory(prev => prev.filter(a => a.id !== attemptId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        if (viewingExamAttempt?.id === attemptId) {
            setViewingExamAttempt(null);
            setExamState('idle'); // Or back to list of historical exams if that's a state
        }
        toast({ title: "Exam Attempt Deleted", variant: "destructive"});
    }
  };

  const currentQuestion = currentExamQuestions[currentQuestionIndex];
  const progress = currentExamQuestions.length > 0 ? (Object.keys(userAnswers).length / currentExamQuestions.length) * 100 : 0;

  if (examState === 'generating_exam' || examState === 'grading_exam') {
    return <Card><CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]"><LoadingSpinner size={48} /><p className="mt-4 text-muted-foreground">{examState === 'generating_exam' ? `Generating exam "${examName}"...` : 'Grading your exam...'}</p></CardContent></Card>;
  }
  
  if (examState === 'taking_exam' && currentQuestion) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{examName}</CardTitle>
          <CardDescription>Question {currentQuestionIndex + 1} of {currentExamQuestions.length} (Topic: {currentQuestion.topic})</CardDescription>
          <Progress value={progress} className="w-full mt-2" aria-label={`Exam progress: ${progress.toFixed(0)}%`} /><p className="text-sm text-muted-foreground mt-1">{Object.keys(userAnswers).length} / {currentExamQuestions.length} answered</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-semibold text-lg">{currentQuestion.question}</p>
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (<RadioGroup value={userAnswers[currentQuestionIndex] || ""} onValueChange={(value) => handleAnswerChange(currentQuestionIndex, value)} className="space-y-2">{currentQuestion.options.map((option, optIndex) => (<div key={optIndex} className="flex items-center space-x-2"><RadioGroupItem value={option} id={`q${currentQuestionIndex}-opt${optIndex}`} /><Label htmlFor={`q${currentQuestionIndex}-opt${optIndex}`}>{option}</Label></div>))}</RadioGroup>)}
          {currentQuestion.type === 'true_false' && (<RadioGroup value={userAnswers[currentQuestionIndex] || ""} onValueChange={(value) => handleAnswerChange(currentQuestionIndex, value)} className="space-y-2"><div className="flex items-center space-x-2"><RadioGroupItem value="true" id={`q${currentQuestionIndex}-true`} /><Label htmlFor={`q${currentQuestionIndex}-true`}>True</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="false" id={`q${currentQuestionIndex}-false`} /><Label htmlFor={`q${currentQuestionIndex}-false`}>False</Label></div></RadioGroup>)}
          {currentQuestion.type === 'short_answer' && (<Textarea placeholder="Type your answer..." value={userAnswers[currentQuestionIndex] || ""} onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)} rows={4}/>)}
        </CardContent>
        <CardFooter className="flex justify-between"><Button onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>{currentQuestionIndex < currentExamQuestions.length - 1 ? (<Button onClick={() => setCurrentQuestionIndex(prev => Math.min(currentExamQuestions.length - 1, prev + 1))}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>) : (<Button onClick={handleSubmitExam} className="bg-green-600 hover:bg-green-700"><Send className="mr-2 h-4 w-4" /> Submit Exam</Button>)}</CardFooter>
      </Card>
    );
  }

  const renderExamResultsView = (resultsOutput: GenerateExamAndAnalyzeOutput | StoredExamAttempt, isHistoryView: boolean) => {
    const examData = 'overallScore' in resultsOutput ? resultsOutput : null; // Historical data
    const currentData = 'results' in resultsOutput ? resultsOutput : null; // Current exam data

    const questions = examData ? examData.examQuestions : currentData!.exam;
    const results = examData ? examData.examResults : currentData!.results;
    const topicsToReview = examData ? examData.topicsToReview : currentData!.topicsToReview;
    const extraReadings = examData ? [] : (currentData!.extraReadings || []); // History items don't store fetched readings
    const overallScore = examData ? examData.overallScore : results.filter(r => r.isCorrect).length / questions.length * 100;
    const displayName = examData ? examData.name : examName;

    return (
        <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-2xl font-bold">{displayName} - Results</CardTitle><CardDescription>Score: {overallScore.toFixed(1)}% ({results.filter(r => r.isCorrect).length} / {questions.length})</CardDescription></CardHeader></Card>
            <Card><CardHeader><CardTitle>Detailed Breakdown</CardTitle></CardHeader><CardContent><Accordion type="single" collapsible className="w-full">{questions.map((q, index) => {const result = results[index] || {} as ExamResult; return (<AccordionItem value={`item-${index}`} key={index}><AccordionTrigger className="text-left hover:no-underline"><div className="flex items-center justify-between w-full"><span className="flex-1">{index + 1}. {q.question}</span><div className="flex items-center ml-4"><Badge variant="secondary" className="mr-2">{q.topic}</Badge>{result.isCorrect ? <Badge variant="default" className="bg-green-500 hover:bg-green-600">Correct</Badge> : <Badge variant="destructive">Incorrect</Badge>}</div></div></AccordionTrigger><AccordionContent className="text-sm space-y-1"><p><strong>Type:</strong> {q.type.replace('_', ' ')}</p><p><strong>Your Answer:</strong> {result.userAnswer || "Not answered"}</p>{!result.isCorrect && <p><strong>Correct Answer:</strong> {q.correctAnswer}</p>}{q.type === 'multiple_choice' && q.options && (<ul className="list-disc pl-5 mt-1">{q.options.map((opt, i) => (<li key={i} className={opt === q.correctAnswer ? 'font-semibold text-primary' : ''}>{opt}{opt === result.userAnswer && opt !== q.correctAnswer && <XCircle className="inline ml-1 h-4 w-4 text-red-500" />}{opt === q.correctAnswer && <CheckCircle className="inline ml-1 h-4 w-4 text-green-500" />}</li>))}</ul>)}</AccordionContent></AccordionItem>);})}</Accordion></CardContent></Card>
            <Card><CardHeader><CardTitle>Study Plan: Topics to Review</CardTitle></CardHeader><CardContent>{topicsToReview.length > 0 ? (<ul className="list-disc pl-5 space-y-2">{topicsToReview.map((topic, index) => (<li key={index} className="flex items-center justify-between"><span>{topic}</span><Button size="sm" variant="outline" onClick={() => handleFetchExtraReadings(topic, !isHistoryView)} disabled={isFetchingReadings}><BookOpen className="mr-2 h-4 w-4" />Find Readings</Button></li>))}</ul>) : (<p className="text-green-600 font-semibold">Great job! No specific topics flagged for review.</p>)}</CardContent></Card>
            {extraReadings.length > 0 && (<Card><CardHeader><CardTitle>Extra Readings</CardTitle><CardDescription>Articles related to topics you need to review.</CardDescription></CardHeader><CardContent>{extraReadings.filter(article => article.title !== "No Relevant Articles Found").length > 0 ? (<ul className="space-y-2">{extraReadings.filter(article => article.title !== "No Relevant Articles Found").map((article: Article, index: number) => (<li key={article.url + index} className="text-sm border p-3 rounded-md hover:bg-muted/50"><a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">{article.title}<ExternalLink className="ml-2 h-3 w-3" /></a></li>))}</ul>) : (<p className="text-muted-foreground">No extra readings available. Click "Find Readings" above.</p>)}</CardContent></Card>)}
            <CardFooter className="justify-start">
                {isHistoryView ? (
                     <Button onClick={() => setExamState('idle')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Exam List</Button>
                ) : (
                     <Button onClick={handleStartNewExamProcess} variant="outline">Start New Exam</Button>
                )}
            </CardFooter>
      </div>
    );
  }

  if (examState === 'showing_results' && examResultsData) {
    return renderExamResultsView(examResultsData, false);
  }
  
  if (examState === 'viewing_history' && viewingExamAttempt) {
    return renderExamResultsView(viewingExamAttempt, true);
  }

  // Initial page load / Idle state (shows history or generation form)
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader><div className="flex items-center gap-3"><ClipboardCheck className="h-8 w-8 text-primary" /><CardTitle className="text-2xl font-bold">New Exam for "{subjectName}"</CardTitle></div><CardDescription>Provide material to generate a 30-question exam. Name your attempt to track it.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <FileUpload onFileRead={handleFileRead} />
          <div><Label htmlFor="examNameExams">Exam Attempt Name</Label><Input id="examNameExams" placeholder="e.g., Midterm Prep, Final Review" value={examName} onChange={(e) => setExamName(e.target.value)} aria-label="Name for this exam attempt"/></div>
          <div><Label htmlFor="courseMaterialTextExam">Course Material (Paste Text)</Label><Textarea id="courseMaterialTextExam" placeholder="Paste course material..." value={courseMaterial} onChange={(e) => setCourseMaterial(e.target.value)} rows={10} className="min-h-[150px]" aria-label="Paste course material"/></div>
        </CardContent>
        <CardFooter><Button onClick={handleGenerateExam} disabled={isProcessingAction || !courseMaterial.trim() || !examName.trim()}><FileText className="mr-2 h-4 w-4" />Generate Exam</Button></CardFooter>
      </Card>

      {examHistory.length > 0 && (
        <Card className="shadow-md">
            <CardHeader><CardTitle>Previous Exam Attempts for "{subjectName}" ({examHistory.length})</CardTitle><CardDescription>Review your past exam performance.</CardDescription></CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {examHistory.map(attempt => (
                        <li key={attempt.id} className="p-4 border rounded-md hover:shadow-md transition-shadow flex justify-between items-center">
                             <div>
                                <h3 className="font-medium">{attempt.name}</h3>
                                <p className="text-xs text-muted-foreground">Date: {new Date(attempt.date).toLocaleDateString()} | Score: {attempt.overallScore.toFixed(1)}%</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewExamHistoryItem(attempt)} aria-label={`View exam attempt ${attempt.name}`}>
                                    <Eye className="mr-1 h-4 w-4" /> View Results
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" aria-label={`Delete exam attempt ${attempt.name}`}>
                                            <Trash2 className="mr-1 h-4 w-4" /> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Exam Attempt: {attempt.name}?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete this exam attempt record. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteExamAttempt(attempt.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
      )}
       {!isProcessingAction && examHistory.length === 0 && (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No exam history found for "{subjectName}". Generate your first exam above.</p>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
