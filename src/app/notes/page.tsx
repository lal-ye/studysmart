'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateNotesAction } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { Lightbulb, Sparkles } from 'lucide-react';

export default function NotesPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleGenerateNotes = () => {
    if (!courseMaterial.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide some course material to generate notes.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        const notes = await generateNotesAction({ material: courseMaterial });
        setGeneratedNotes(notes);
        toast({
          title: 'Notes Generated!',
          description: 'Your dynamic notes are ready below.',
        });
      } catch (error) {
        toast({
          title: 'Error Generating Notes',
          description: (error as Error).message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setGeneratedNotes('');
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
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Dynamic Note Generation</CardTitle>
              <CardDescription>
                Input your course material (text or .txt file) to generate dynamic and interactive notes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload onFileRead={handleFileRead} />
          <div>
            <label htmlFor="courseMaterialText" className="block text-sm font-medium mb-1">
              Course Material (Paste Text)
            </label>
            <Textarea
              id="courseMaterialText"
              placeholder="Paste your course material here..."
              value={courseMaterial}
              onChange={(e) => setCourseMaterial(e.target.value)}
              rows={10}
              className="min-h-[200px]"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateNotes} disabled={isPending || !courseMaterial.trim()}>
            {isPending ? <LoadingSpinner className="mr-2" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            Generate Notes
          </Button>
        </CardFooter>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating your notes, please wait...</p>
          </CardContent>
        </Card>
      )}

      {generatedNotes && !isPending && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Generated Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {/* For basic display, pre-wrap is fine. For interactive notes, this would be more complex */}
            <div className="prose dark:prose-invert max-w-none p-4 bg-muted/30 rounded-md">
              <pre className="whitespace-pre-wrap font-sans text-sm">{generatedNotes}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
