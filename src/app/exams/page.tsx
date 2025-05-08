
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateAndAnalyzeExamAction, getExtraReadingsAction } from '@/lib/actions';
import type { GenerateAndAnalyzeExamActionInput, GenerateExamAndAnalyzeOutput, ExamQuestion, ExamResult, StoredExamAttempt } from '@/lib/actions';
import type { Article } from '@/services/search-articles';
import FileUpload from '@/components/common/FileUpload';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, BookOpen, FileText, ExternalLink, ClipboardCheck, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { ToastProps } from '@/components/ui/toast'; 

type ExamState = 'idle' | 'generating_exam' | 'taking_exam' | 'grading_exam' | 'showing_results';

interface ToastArgsForPage {
  title: string;
  description: string;
  variant?: ToastProps['variant'];
}


export default function ExamsPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [examState, setExamState] = useState<ExamState>('idle');
  
  const [currentExamQuestions, setCurrentExamQuestions] = useState<ExamQuestion[]>([]);
  const [persistedExamQuestions, setPersistedExamQuestions] = useState<ExamQuestion[]>([]); 
  const [examResultsData, setExamResultsData] = useState<GenerateExamAndAnalyzeOutput | null>(null);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [examName, setExamName] = useState<string>('');


  const [isProcessingAction, startProcessingActionTransition] = useTransition();
  const [isFetchingReadings, startFetchingReadingsTransition] = useTransition();
  const { toast } = useToast();
  const [toastArgs, setToastArgs] = useState<ToastArgsForPage | null>(null);


  useEffect(() => {
    if (toastArgs) {
      toast(toastArgs);
      setToastArgs(null); 
    }
  }, [toastArgs, toast]);


  const handleGenerateExam = () => {
    if (!courseMaterial.trim()) {
      setToastArgs({ title: 'Input Required', description: 'Please provide course material to generate an exam.', variant: 'destructive' });
      return;
    }
    setExamState('generating_exam');
    setCurrentExamQuestions([]);
    setPersistedExamQuestions([]); 
    setExamResultsData(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    // Do not reset examName here, allow user to set it before starting or keep previous if desired for re-attempts.

    startProcessingActionTransition(async () => {
      try {
        const input: GenerateAndAnalyzeExamActionInput = { 
            courseMaterial, 
            numberOfQuestions: 30 
        };
        const result = await generateAndAnalyzeExamAction(input);
        if (result.exam && result.exam.length > 0) {
          setCurrentExamQuestions(result.exam);
          setPersistedExamQuestions(result.exam); 
          setExamState('taking_exam');
          setToastArgs({ title: 'Exam Ready!', description: 'You can now start the exam. Feel free to name your exam attempt.' });
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
          courseMaterial, 
          numberOfQuestions: persistedExamQuestions.length, 
          userAnswers: answersArray,
          exam: persistedExamQuestions, 
        };
        const result = await generateAndAnalyzeExamAction(input);
        
        // Store exam results
        const finalResults = result.results;
        const overallScore = finalResults.filter(r => r.isCorrect).length / result.exam.length * 100;
        const attemptId = Date.now().toString();
        const finalExamName = examName.trim() || `Exam - ${new Date().toLocaleString()}`;

        const newAttempt: StoredExamAttempt = {
            id: attemptId,
            name: finalExamName,
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            examQuestions: result.exam,
            examResults: finalResults,
            overallScore: overallScore,
            topicsToReview: result.topicsToReview,
        };

        try {
            const historyString = localStorage.getItem('studySmartsExamHistory');
            const history: StoredExamAttempt[] = historyString ? JSON.parse(historyString) : [];
            history.push(newAttempt);
            localStorage.setItem('studySmartsExamHistory', JSON.stringify(history));
            setToastArgs({ title: 'Exam Graded & Saved!', description: 'Your results are ready and saved to your history.' });
        } catch (e) {
            console.error("Failed to save exam to localStorage", e);
            setToastArgs({ title: 'Exam Graded (Save Failed)', description: 'Results ready, but failed to save to local history.', variant: 'destructive' });
        }

        setExamResultsData(result);
        setExamState('showing_results');

      } catch (error) {
        setToastArgs({ title: 'Error Grading Exam', description: (error as Error).message || 'An unexpected error occurred.', variant: 'destructive' });
        setExamState('taking_exam'); 
      }
    });
  };

  const handleFetchExtraReadings = async (topic: string) => {
    startFetchingReadingsTransition(async () => {
      try {
        const readingsResult = await getExtraReadingsAction({ topic });
        
        setExamResultsData(prevData => {
          if (!prevData) { 
            setToastArgs({ title: "Error", description: "Exam data not available to add readings.", variant: "destructive" });
            return null;
          }

          const existingUrls = new Set((prevData.extraReadings || []).map(ar => ar.url));
          const newArticlesToAdd = readingsResult.articles.filter(newArticle => !existingUrls.has(newArticle.url));


          if (newArticlesToAdd.length === 0) {
            if (readingsResult.articles.length > 0) {
                 setToastArgs({ title: `Readings for ${topic} may already be listed or none found.`, description: "No new unique articles found." });
            } else {
                 setToastArgs({ title: `No New Readings Found`, description: `Could not find any articles for "${topic}".` });
            }
            return prevData;
          }
          
          const processedNewArticles = newArticlesToAdd.map(article => ({
            ...article,
            title: article.title.toLowerCase().startsWith(topic.toLowerCase() + ":") || article.title.toLowerCase().startsWith(topic.toLowerCase()+" -") 
                   ? article.title 
                   : `${topic}: ${article.title}`,
          }));
          
          const updatedReadings = [...(prevData.extraReadings || []), ...processedNewArticles];
          
          setToastArgs({ title: 'Extra Readings Fetched!', description: `Found ${processedNewArticles.length} new reading(s) for ${topic}.` });
          return { ...prevData, extraReadings: updatedReadings };
        });
      } catch (error) {
        setToastArgs({ title: `Error Fetching Readings for ${topic}`, description: (error as Error).message, variant: 'destructive' });
      }
    });
  };
  
  const handleFileRead = (content: string, fileName?: string) => {
    setCourseMaterial(content);
  };

  const handleStartNewExam = () => {
    setExamState('idle'); 
    setCourseMaterial(''); 
    setExamResultsData(null);
    setCurrentExamQuestions([]);
    setPersistedExamQuestions([]);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setExamName(''); // Reset exam name for new exam
  };

  const currentQuestion = currentExamQuestions[currentQuestionIndex];
  const progress = currentExamQuestions.length > 0 ? (Object.keys(userAnswers).length / currentExamQuestions.length) * 100 : 0;

  if (examState === 'generating_exam' || examState === 'grading_exam') {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <LoadingSpinner size={48} />
          <p className="mt-4 text-muted-foreground">
            {examState === 'generating_exam' ? 'Generating your 30-question exam...' : 'Grading your exam, please wait...'}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (examState === 'taking_exam' && currentQuestion) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            {examName.trim() || `Exam Attempt - ${new Date().toLocaleDateString()}`}
          </CardTitle>
          <CardDescription>Question {currentQuestionIndex + 1} of {currentExamQuestions.length} (Topic: {currentQuestion.topic})</CardDescription>
          <Progress value={progress} className="w-full mt-2" />
           <p className="text-sm text-muted-foreground mt-1">{Object.keys(userAnswers).length} / {currentExamQuestions.length} answered</p>
            <div className="mt-4">
                <Label htmlFor="examNameInput" className="text-sm font-medium">Exam Name (Optional)</Label>
                <Input
                    id="examNameInput"
                    placeholder="e.g., Midterm Prep, Chapter 5 Review"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="mt-1"
                />
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-semibold text-lg">{currentQuestion.question}</p>
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
            <RadioGroup 
              value={userAnswers[currentQuestionIndex] || ""} 
              onValueChange={(value) => handleAnswerChange(currentQuestionIndex, value)}
              className="space-y-2"
            >
              {currentQuestion.options.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`q${currentQuestionIndex}-opt${optIndex}`} />
                  <Label htmlFor={`q${currentQuestionIndex}-opt${optIndex}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {currentQuestion.type === 'true_false' && (
             <RadioGroup 
              value={userAnswers[currentQuestionIndex] || ""} 
              onValueChange={(value) => handleAnswerChange(currentQuestionIndex, value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`q${currentQuestionIndex}-true`} />
                <Label htmlFor={`q${currentQuestionIndex}-true`}>True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`q${currentQuestionIndex}-false`} />
                <Label htmlFor={`q${currentQuestionIndex}-false`}>False</Label>
              </div>
            </RadioGroup>
          )}
          {currentQuestion.type === 'short_answer' && (
            <Textarea
              placeholder="Type your answer here..."
              value={userAnswers[currentQuestionIndex] || ""}
              onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
              rows={4}
            />
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} 
            disabled={currentQuestionIndex === 0}
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          {currentQuestionIndex < currentExamQuestions.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(currentExamQuestions.length - 1, prev + 1))}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmitExam} className="bg-green-600 hover:bg-green-700">
              <Send className="mr-2 h-4 w-4" /> Submit Exam
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  if (examState === 'showing_results' && examResultsData) {
    const overallScore = examResultsData.results.filter(r => r.isCorrect).length / examResultsData.exam.length * 100;
    return (
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">{examName || "Exam Results"}</CardTitle>
                <CardDescription>
                    Your Score: {overallScore.toFixed(1)}% ({examResultsData.results.filter(r => r.isCorrect).length} / {examResultsData.exam.length})
                </CardDescription>
            </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {examResultsData.exam.map((q, index) => {
                const result = examResultsData.results[index] || {} as ExamResult; 
                return (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center justify-between w-full">
                        <span className="flex-1">{index + 1}. {q.question}</span>
                        <div className="flex items-center ml-4">
                            <Badge variant="secondary" className="mr-2">{q.topic}</Badge>
                            {result.isCorrect ? 
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">Correct</Badge> : 
                              <Badge variant="destructive">Incorrect</Badge>
                            }
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-1">
                      <p><strong>Type:</strong> {q.type.replace('_', ' ')}</p>
                      <p><strong>Your Answer:</strong> {result.userAnswer || "Not answered"}</p>
                      {!result.isCorrect && <p><strong>Correct Answer:</strong> {q.correctAnswer}</p>}
                      {q.type === 'multiple_choice' && q.options && (
                        <ul className="list-disc pl-5 mt-1">
                           {q.options.map((opt, i) => (
                            <li key={i} className={opt === q.correctAnswer ? 'font-semibold text-primary' : ''}>
                                {opt}
                                {opt === result.userAnswer && opt !== q.correctAnswer && <XCircle className="inline ml-1 h-4 w-4 text-red-500" />}
                                {opt === q.correctAnswer && <CheckCircle className="inline ml-1 h-4 w-4 text-green-500" />}
                            </li>
                            ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study Plan: Topics to Review</CardTitle>
          </CardHeader>
          <CardContent>
            {examResultsData.topicsToReview.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {examResultsData.topicsToReview.map((topic, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span>{topic}</span>
                    <Button size="sm" variant="outline" onClick={() => handleFetchExtraReadings(topic)} disabled={isFetchingReadings}>
                      {isFetchingReadings ? <LoadingSpinner size={16} /> : <BookOpen className="mr-2 h-4 w-4" />}
                      Find Readings
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-green-600 font-semibold">Great job! No specific topics flagged for review based on this exam.</p>
            )}
          </CardContent>
        </Card>

        {examResultsData.extraReadings && 
          examResultsData.extraReadings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Extra Readings</CardTitle>
              <CardDescription>
                Articles related to topics you need to review. These were fetched based on the topics identified in your study plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {examResultsData.extraReadings.filter(article => article.title !== "No Relevant Articles Found").length > 0 ? (
                  <ul className="space-y-2">
                    {examResultsData.extraReadings
                      .filter(article => article.title !== "No Relevant Articles Found")
                      .map((article: Article, index: number) => (
                      <li key={article.url + index} className="text-sm border p-3 rounded-md hover:bg-muted/50">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                          {article.title}
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                   <p className="text-muted-foreground">No extra readings available for the topics reviewed, or none were found. Click "Find Readings" above to search.</p>
                )
              }
            </CardContent>
          </Card>
        )}
        <CardFooter>
             <Button onClick={handleStartNewExam} variant="outline">
                Start New Exam
            </Button>
        </CardFooter>
      </div>
    );
  }

  // Initial page load / Idle state
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Exam Generation & Analysis</CardTitle>
              <CardDescription>
                Provide your course material (e.g., .txt, .pdf file or paste text) to generate a 30-question exam.
                The exam will include 15 multiple-choice, 10 true/false, and 5 short answer questions.
                Name your exam attempt to track it in your analytics.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload onFileRead={handleFileRead} />
          <div>
            <label htmlFor="courseMaterialTextExam" className="block text-sm font-medium mb-1">
              Course Material (Paste Text)
            </label>
            <Textarea
              id="courseMaterialTextExam"
              placeholder="Paste your course material here for exam generation..."
              value={courseMaterial}
              onChange={(e) => setCourseMaterial(e.target.value)}
              rows={10}
              className="min-h-[200px]"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateExam} disabled={isProcessingAction || !courseMaterial.trim()}>
            {isProcessingAction ? <LoadingSpinner className="mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate 30-Question Exam
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
