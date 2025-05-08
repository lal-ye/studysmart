'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateQuizAction, type Flashcard } from '@/lib/actions'; // Import Flashcard type
import FileUpload from '@/components/common/FileUpload';
import { HelpCircle, Sparkles, Tags, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FlashcardComponentProps {
  flashcard: Flashcard;
}

const difficultyColors: Record<Flashcard['difficulty'], string> = {
  Easy: 'bg-green-500 hover:bg-green-600',
  Medium: 'bg-yellow-500 hover:bg-yellow-600',
  Hard: 'bg-red-500 hover:bg-red-600',
};

function FlashcardComponent({ flashcard }: FlashcardComponentProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const cardStyle: CSSProperties = {
    perspective: '1000px',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };

  const faceStyle: CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden', // Safari
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1.5rem', // p-6
    borderRadius: '0.5rem', // rounded-lg
  };

  const frontStyle: CSSProperties = {
    ...faceStyle,
    background: 'hsl(var(--card))',
    color: 'hsl(var(--card-foreground))',
    zIndex: 2, // Ensure front is on top initially
  };

  const backStyle: CSSProperties = {
    ...faceStyle,
    background: 'hsl(var(--secondary))', // Use secondary for back
    color: 'hsl(var(--secondary-foreground))',
    transform: 'rotateY(180deg)',
  };

  return (
    <div
      className="relative w-full h-full"
      style={cardStyle}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {/* Front of the card */}
      <div
        className="absolute w-full h-full"
        style={frontStyle}
      >
        <div>
          <p className="text-sm text-muted-foreground">Question ID: {flashcard.id}</p>
          <h3 className="text-lg font-semibold mt-2 mb-4">{flashcard.question}</h3>
        </div>
        <div className="flex justify-between items-center">
          <Badge className={difficultyColors[flashcard.difficulty]}>{flashcard.difficulty}</Badge>
          <RotateCcw className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Back of the card */}
      <div
        className="absolute w-full h-full"
        style={backStyle}
      >
        <div>
          <h4 className="text-md font-semibold mb-2">Answer:</h4>
          <p className="text-sm leading-relaxed">{flashcard.answer}</p>
        </div>
        <div className="flex justify-between items-center">
          {flashcard.tags && flashcard.tags.length > 0 && (
            <div className="flex items-center">
              <Tags className="h-4 w-4 mr-1 self-center" />
              {flashcard.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function QuizzesPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [quizLength, setQuizLength] = useState(5);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleGenerateQuiz = () => {
    if (!courseMaterial.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide course material to generate a quiz.',
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
      });
      return;
    }
    if (quizLength < 1 || quizLength > 20) {
      toast({
        title: 'Invalid Quiz Length',
        description: 'Quiz length must be between 1 and 20 questions.',
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
      });
      return;
    }

    startTransition(async () => {
      setGeneratedFlashcards([]); // Clear previous flashcards
      try {
        const flashcards = await generateQuizAction({ courseMaterial, quizLength });
        setGeneratedFlashcards(flashcards);
        toast({
          title: 'Quiz Generated!',
          description: `Your ${flashcards.length} flashcards are ready below.`,
          icon: <CheckCircle className="h-5 w-5" />,
        });
      } catch (error) {
        toast({
          title: 'Error Generating Quiz',
          description: (error as Error).message || 'An unexpected error occurred.',
          variant: 'destructive',
          icon: <AlertTriangle className="h-5 w-5" />,
        });
        setGeneratedFlashcards([]);
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
              <CardTitle className="text-2xl font-bold">Flashcard Quiz Generation</CardTitle>
              <CardDescription>
                Generate interactive flashcard quizzes from your course material. Upload a .txt, .pdf file or paste text.
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
            <Label htmlFor="quizLength">Number of Flashcards (1-20)</Label>
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
            Generate Flashcards
          </Button>
        </CardFooter>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating your flashcards, please wait...</p>
          </CardContent>
        </Card>
      )}

      {!isPending && generatedFlashcards.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Generated Flashcards ({generatedFlashcards.length})</CardTitle>
            <CardDescription>Click on a card to flip it and see the answer.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedFlashcards.map((fc) => (
                 <FlashcardComponent key={fc.id} flashcard={fc} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isPending && generatedFlashcards.length === 0 && courseMaterial.trim() && !isPending && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No flashcards were generated. Try adjusting the material or quiz length.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
