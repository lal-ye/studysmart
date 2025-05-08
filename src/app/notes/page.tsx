
'use client';

import React, { useState, useTransition, useEffect } from 'react'; // Added React import
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
      if (window.mermaid) {
        // @ts-ignore
        window.mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'neutral' }); 
      }
      setMermaidScriptLoaded(true);
    };
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) { // Check if script is still in head before removing
        document.head.removeChild(script);
      }
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
                    const childrenArray = React.Children.toArray(props.children);
                    // @ts-ignore
                    const codeChild = childrenArray.find(child => React.isValidElement(child) && child.type === 'code');
                    // @ts-ignore
                    if (React.isValidElement(codeChild) && codeChild.props.className?.includes('language-mermaid')) {
                       // @ts-ignore
                       return <pre {...props} className="language-mermaid bg-background">{props.children}</pre>;
                    }
                    // @ts-ignore
                    return <pre className="bg-muted/50 p-4 rounded-md overflow-auto" {...props} />;
                  },
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (match && match[1] === 'mermaid' && !inline) {
                      return (
                        // Mermaid diagrams are rendered by mermaid.js library, keep this simple
                        <code className="language-mermaid" {...props}>
                          {children}
                        </code>
                      );
                    }
                    // For other code blocks, apply some styling
                    return (
                      <code className={cn(className, !inline && "block whitespace-pre-wrap p-2", inline && "px-1 py-0.5 bg-muted rounded-sm")} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  img: ({node, ...props}: any) => <img className="max-w-full h-auto rounded-md my-4 shadow-md" alt={props.alt || ''} {...props} />,
                  table: ({node, ...props}) => <table className="w-full my-4 border-collapse border border-border" {...props} />,
                  thead: ({node, ...props}) => <thead className="bg-muted/50" {...props} />,
                  th: ({node, ...props}) => <th className="border border-border px-4 py-2 text-left font-semibold" {...props} />,
                  td: ({node, ...props}) => <td className="border border-border px-4 py-2" {...props} />,
                  details: ({node, ...props}) => <details className="my-4 p-3 border rounded-md bg-background shadow-sm open:ring-1 open:ring-primary" {...props} />,
                  summary: ({node, ...props}) => <summary className="font-semibold cursor-pointer hover:text-primary list-inside" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic my-4 bg-muted/20 p-3 rounded-r-md shadow-sm" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold my-4 text-primary" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-semibold my-3 border-b border-border pb-1" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-semibold my-2" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-6 my-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                  a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
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
