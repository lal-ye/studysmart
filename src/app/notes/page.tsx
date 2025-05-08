'use client';

import { useState, useTransition, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateNotesAction, type GenerateNotesActionInput } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { Lightbulb, Sparkles } from 'lucide-react';
import remarkGfm from 'remark-gfm'; // For GFM tables, strikethrough, etc.
import rehypeRaw from 'rehype-raw'; // To allow HTML like <details>

export default function NotesPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [sourceName, setSourceName] = useState<string | undefined>(undefined);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [mermaidScriptLoaded, setMermaidScriptLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.onload = () => {
      // @ts-ignore
      window.mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); // Use neutral theme for better dark/light mode compatibility
      setMermaidScriptLoaded(true);
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (mermaidScriptLoaded && generatedNotes) {
      try {
        // @ts-ignore
        if (window.mermaid) {
           // @ts-ignore
          window.mermaid.run({
            nodes: Array.from(document.querySelectorAll('.language-mermaid')),
          });
        }
      } catch (error) {
        console.error("Error rendering Mermaid diagrams:", error);
        toast({
          title: "Mermaid Diagram Error",
          description: "Could not render one or more diagrams.",
          variant: "destructive",
        });
      }
    }
  }, [generatedNotes, mermaidScriptLoaded, toast]);


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
        const input: GenerateNotesActionInput = { material: courseMaterial, sourceName };
        const notes = await generateNotesAction(input);
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

  const handleFileRead = (content: string, fileName?: string) => {
    setCourseMaterial(content);
    setSourceName(fileName);
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
                Input your course material (e.g., .txt, .pdf file or paste text) to generate dynamic and interactive notes.
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
              onChange={(e) => {
                setCourseMaterial(e.target.value);
                if (!sourceName) setSourceName("Pasted Text"); // Default source name for pasted text
              }}
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
            <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none p-4 bg-muted/30 rounded-md overflow-x-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  pre({ node, ...props }) {
                    // @ts-ignore
                    const match = /language-(\w+)/.exec(props.className || '');
                    if (match && match[1] === 'mermaid') {
                      // @ts-ignore
                       return <pre {...props} className="language-mermaid">{props.children}</pre>;
                    }
                    // @ts-ignore
                    return <pre {...props} />;
                  },
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (match && match[1] === 'mermaid' && !inline) {
                      return (
                        <code className="language-mermaid" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table: ({node, ...props}) => <table className="w-full border-collapse border border-border" {...props} />,
                  th: ({node, ...props}) => <th className="border border-border px-4 py-2 text-left font-semibold" {...props} />,
                  td: ({node, ...props}) => <td className="border border-border px-4 py-2" {...props} />,
                  details: ({node, ...props}) => <details className="mb-4 p-2 border rounded-md bg-background" {...props} />,
                  summary: ({node, ...props}) => <summary className="font-semibold cursor-pointer hover:text-primary" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic my-4 bg-muted/20 p-2 rounded-r-md" {...props} />,
                }}
              >
                {generatedNotes}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
