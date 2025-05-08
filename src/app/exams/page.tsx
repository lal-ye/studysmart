
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateAndAnalyzeExamAction, getExtraReadingsAction } from '@/lib/actions';
import type { GenerateAndAnalyzeExamActionInput, GenerateExamAndAnalyzeOutput, ExamQuestion, ExamResult } from '@/lib/actions';
import type { Article } from '@/services/search-articles';
import FileUpload from '@/components/common/FileUpload';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, BookOpen, FileText, ExternalLink, ClipboardCheck, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type ExamState = 'idle' | 'generating_exam' | 'taking_exam' | 'grading_exam' | 'showing_results';

export default function ExamsPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [examState, setExamState] = useState<ExamState>('idle');
  
  const [currentExamQuestions, setCurrentExamQuestions] = useState<ExamQuestion[]>([]);
  const [persistedExamQuestions, setPersistedExamQuestions] = useState<ExamQuestion[]>([]); // To store the exact questions the user took
  const [examResultsData, setExamResultsData] = useState<GenerateExamAndAnalyzeOutput | null>(null);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  const [isProcessingAction, startProcessingActionTransition] = useTransition();
  const [isFetchingReadings, startFetchingReadingsTransition] = useTransition();
  const { toast } = useToast();


  const handleGenerateExam = () => {
    if (!courseMaterial.trim()) {
      toast({ title: 'Input Required', description: 'Please provide course material to generate an exam.', variant: 'destructive' });
      return;
    }
    setExamState('generating_exam');
    setCurrentExamQuestions([]);
    setPersistedExamQuestions([]); // Reset persisted questions
    setExamResultsData(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);

    startProcessingActionTransition(async () => {
      try {
        // For initial generation, only courseMaterial and numberOfQuestions are needed.
        // No userAnswers and no pre-existing exam.
        const input: GenerateAndAnalyzeExamActionInput = { 
            courseMaterial, 
            numberOfQuestions: 30 
            // userAnswers and exam are omitted for generation phase
        };
        const result = await generateAndAnalyzeExamAction(input);
        if (result.exam && result.exam.length > 0) {
          setCurrentExamQuestions(result.exam);
          setPersistedExamQuestions(result.exam); // Persist the generated questions
          setExamState('taking_exam');
          toast({ title: 'Exam Ready!', description: 'You can now start the exam.' });
        } else {
          toast({ title: 'Generation Issue', description: 'No questions were generated. Try different material.', variant: 'destructive' });
          setExamState('idle');
        }
      } catch (error) {
        toast({ title: 'Error Generating Exam', description: (error as Error).message || 'An unexpected error occurred.', variant: 'destructive' });
        setExamState('idle');
      }
    });
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmitExam = () => {
    if (persistedExamQuestions.length === 0) {
        toast({ title: 'Error', description: 'No exam questions found to submit.', variant: 'destructive'});
        setExamState('idle'); // Or back to taking_exam if appropriate
        return;
    }
    setExamState('grading_exam');
    startProcessingActionTransition(async () => {
      try {
        const answersArray = persistedExamQuestions.map((_, index) => userAnswers[index] || ""); 
        const input: GenerateAndAnalyzeExamActionInput = { 
          courseMaterial, // Still pass course material, might be needed by LLM for context/analysis
          numberOfQuestions: persistedExamQuestions.length, // Number of questions is from the persisted exam
          userAnswers: answersArray,
          exam: persistedExamQuestions, // Pass the exact questions the user took
        };
        const result = await generateAndAnalyzeExamAction(input);
        setExamResultsData(result);
        setExamState('showing_results');
        toast({ title: 'Exam Graded!', description: 'Your results are ready below.' });
      } catch (error) {
        toast({ title: 'Error Grading Exam', description: (error as Error).message || 'An unexpected error occurred.', variant: 'destructive' });
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
            toast({ title: "Error", description: "Exam data not available to add readings.", variant: "destructive" });
            return null;
          }

          const existingUrls = new Set((prevData.extraReadings || []).map(ar => ar.url));
          const newArticlesToAdd = readingsResult.articles.filter(newArticle => !existingUrls.has(newArticle.url) && newArticle.title !== "No Relevant Articles Found");

          if (readingsResult.articles.length === 0 || (readingsResult.articles.length === 1 && readingsResult.articles[0].title === "No Relevant Articles Found" && newArticlesToAdd.length === 0) ) {
             toast({ title: `No New Readings Found`, description: `Could not find any new articles for "${topic}".` });
             return prevData; 
          }
          
          if (newArticlesToAdd.length === 0 && readingsResult.articles.length > 0 && readingsResult.articles[0].title !== "No Relevant Articles Found") { 
            toast({ title: `Readings for ${topic} already listed.`, description: "No new unique articles found." });
            return prevData; 
          }

          const processedNewArticles = newArticlesToAdd.map(article => ({
            ...article,
            title: article.title.toLowerCase().startsWith(topic.toLowerCase() + ":") || article.title.toLowerCase().startsWith(topic.toLowerCase()+" -") 
                   ? article.title 
                   : `${topic}: ${article.title}`,
          }));
          
          const updatedReadings = [...(prevData.extraReadings || []).filter(ar => ar.title !== "No Relevant Articles Found"), ...processedNewArticles];
          
          if (processedNewArticles.length > 0) {
            toast({ title: 'Extra Readings Fetched!', description: `Found ${processedNewArticles.length} new reading(s) for ${topic}.` });
          }
          return { ...prevData, extraReadings: updatedReadings };
        });
      } catch (error) {
        toast({ title: `Error Fetching Readings for ${topic}`, description: (error as Error).message, variant: 'destructive' });
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
          <CardTitle className="text-xl">Exam in Progress: Question {currentQuestionIndex + 1} of {currentExamQuestions.length}</CardTitle>
          <CardDescription>Topic: {currentQuestion.topic}</CardDescription>
          <Progress value={progress} className="w-full mt-2" />
           <p className="text-sm text-muted-foreground mt-1">{Object.keys(userAnswers).length} / {currentExamQuestions.length} answered</p>
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
    return (
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Exam Results</CardTitle>
                <CardDescription>
                    Review your performance. Score: {examResultsData.results.filter(r => r.isCorrect).length} / {examResultsData.exam.length}
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
          examResultsData.extraReadings.length > 0 && 
          examResultsData.extraReadings.filter(article => article.title !== "No Relevant Articles Found").length > 0 && (
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
                   <p className="text-muted-foreground">No extra readings available for the topics reviewed, or none were found.</p>
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