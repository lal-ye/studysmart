'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateAndAnalyzeExamAction, getExtraReadingsAction } from '@/lib/actions';
import type { GenerateExamAndAnalyzeOutput, GenerateExamAndAnalyzeInput, ExamQuestion, ExamResult } from '@/ai/flows/generate-exam-and-analyze';
import type { Article } from '@/services/search-articles';
import FileUpload from '@/components/common/FileUpload';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, BookOpen, FileText, ExternalLink, ClipboardCheck } from 'lucide-react';

export default function ExamsPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [examData, setExamData] = useState<GenerateExamAndAnalyzeOutput | null>(null);
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isFetchingReadings, startFetchingReadingsTransition] = useTransition();
  const { toast } = useToast();

  const handleGenerateExam = () => {
    if (!courseMaterial.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide course material to generate an exam.',
        variant: 'destructive',
      });
      return;
    }

    startGeneratingTransition(async () => {
      setExamData(null); // Clear previous data
      try {
        const input: GenerateExamAndAnalyzeInput = { courseMaterial, numberOfQuestions: 70 }; // numberOfQuestions is fixed
        const result = await generateAndAnalyzeExamAction(input);
        setExamData(result);
        toast({
          title: 'Exam Generated & Analyzed!',
          description: 'Your exam and analysis are ready below.',
        });
      } catch (error) {
        toast({
          title: 'Error Generating Exam',
          description: (error as Error).message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleFetchExtraReadings = async (topic: string) => {
    startFetchingReadingsTransition(async () => {
      try {
        const readingsResult = await getExtraReadingsAction({ topic });
        // Merge new readings with existing ones, avoiding duplicates for the specific topic
        setExamData(prevData => {
          if (!prevData) return null;
          const updatedReadings = [...(prevData.extraReadings || [])];
          readingsResult.articles.forEach(newArticle => {
            if (!updatedReadings.some(exArticle => exArticle.url === newArticle.url && exArticle.title.includes(topic))) {
              updatedReadings.push({ ...newArticle, title: `${topic}: ${newArticle.title}`});
            }
          });
          return { ...prevData, extraReadings: updatedReadings };
        });
        toast({
          title: 'Extra Readings Fetched!',
          description: `Found readings for ${topic}.`,
        });
      } catch (error) {
        toast({
          title: `Error Fetching Readings for ${topic}`,
          description: (error as Error).message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    });
  };
  
  const handleFileRead = (content: string) => {
    setCourseMaterial(content);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Exam Generation & Analysis</CardTitle>
              <CardDescription>
                Generate a 70-question exam, get it graded, and receive a personalized study plan.
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
          <Button onClick={handleGenerateExam} disabled={isGenerating || !courseMaterial.trim()}>
            {isGenerating ? <LoadingSpinner className="mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate & Analyze Exam
          </Button>
        </CardFooter>
      </Card>

      {isGenerating && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating exam and analyzing results, please wait...</p>
          </CardContent>
        </Card>
      )}

      {examData && !isGenerating && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exam Questions ({examData.exam.length})</CardTitle>
              <CardDescription>Review the generated exam questions. User answers are mocked for this demo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {examData.exam.map((q, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="text-left hover:no-underline">
                        {index + 1}. {q.question} <Badge variant="secondary" className="ml-2">{q.topic}</Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {q.options.map((opt, i) => (
                          <li key={i} className={opt === q.correctAnswer ? 'font-semibold text-primary' : ''}>
                            {opt} {opt === q.correctAnswer && <CheckCircle className="inline ml-1 h-4 w-4 text-green-500" />}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
              <CardDescription>Detailed breakdown of your answers (mocked for demo).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {examData.results.map((r, index) => (
                  <Card key={index} className={r.isCorrect ? 'border-green-500' : 'border-red-500'}>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{index + 1}. {r.question}</span>
                        {r.isCorrect ? 
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Correct</Badge> : 
                          <Badge variant="destructive">Incorrect</Badge>
                        }
                      </CardTitle>
                      <CardDescription className="text-xs">Topic: {r.topic}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 text-xs">
                      <p>Your Answer: {r.userAnswer}</p>
                      {!r.isCorrect && <p>Correct Answer: {r.correctAnswer}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study Plan: Topics to Review</CardTitle>
            </CardHeader>
            <CardContent>
              {examData.topicsToReview.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {examData.topicsToReview.map((topic, index) => (
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

          {examData.extraReadings && examData.extraReadings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Extra Readings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {examData.extraReadings.map((article: Article, index: number) => (
                    <li key={index} className="text-sm border p-3 rounded-md hover:bg-muted/50">
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                        {article.title}
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
