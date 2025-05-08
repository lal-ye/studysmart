'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateQuizAction } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { HelpCircle, Sparkles } from 'lucide-react';

export default function QuizzesPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [quizLength, setQuizLength] = useState(5);
  const [generatedQuiz, setGeneratedQuiz] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleGenerateQuiz = () => {
    if (!courseMaterial.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide course material to generate a quiz.',
        variant: 'destructive',
      });
      return;
    }
    if (quizLength < 1 || quizLength > 20) {
      toast({
        title: 'Invalid Quiz Length',
        description: 'Quiz length must be between 1 and 20 questions.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        const quiz = await generateQuizAction({ material: courseMaterial, quizLength });
        setGeneratedQuiz(quiz);
        toast({
          title: 'Quiz Generated!',
          description: 'Your quiz is ready below.',
        });
      } catch (error) {
        toast({
          title: 'Error Generating Quiz',
          description: (error as Error).message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setGeneratedQuiz('');
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
            <HelpCircle className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Quiz Generation</CardTitle>
              <CardDescription>
                Generate quizzes from your course material (e.g., .txt, .pdf file or paste text) to test your understanding.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload onFileRead={handleFileRead} />
          <div>
            <Label htmlFor="courseMaterialTextQuiz">Course Material (Paste Text)</Label>
            <Textarea
              id="courseMaterialTextQuiz"
              placeholder="Paste your course material here..."
              value={courseMaterial}
              onChange={(e) => setCourseMaterial(e.target.value)}
              rows={8}
              className="min-h-[150px]"
            />
          </div>
          <div>
            <Label htmlFor="quizLength">Number of Questions (1-20)</Label>
            <Input
              id="quizLength"
              type="number"
              value={quizLength}
              onChange={(e) => setQuizLength(parseInt(e.target.value, 10))}
              min="1"
              max="20"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateQuiz} disabled={isPending || !courseMaterial.trim()}>
            {isPending ? <LoadingSpinner className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Quiz
          </Button>
        </CardFooter>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating your quiz, please wait...</p>
          </CardContent>
        </Card>
      )}

      {generatedQuiz && !isPending && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Generated Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none p-4 bg-muted/30 rounded-md">
              <pre className="whitespace-pre-wrap font-sans text-sm">{generatedQuiz}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
