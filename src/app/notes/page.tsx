'use client';

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateNotesAction, type GenerateNotesActionInput } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { Lightbulb, Sparkles } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { Label } from "@/components/ui/label";

export default function NotesPage() {
  const [textInput, setTextInput] = useState('');
  const [courseMaterial, setCourseMaterial] = useState('');
  const [sourceName, setSourceName] = useState<string | undefined>(undefined);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [mermaidScriptLoaded, setMermaidScriptLoaded] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0); // Track progress (0 to 100)


  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.onload = () => {
      // @ts-ignore
      if (window.mermaid) {
        // @ts-ignore
        window.mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default' });
      }
      setMermaidScriptLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (script.parentNode) {
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

  const handleTextInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setTextInput(newText);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setCourseMaterial(newText);
      if (!sourceName && newText.trim()) {
        setSourceName("Pasted Text");
      } else if (!newText.trim() && sourceName === "Pasted Text") {
        setSourceName(undefined);
      }
    }, 500);
  };

  const handleGenerateNotes = () => {
    if (!courseMaterial.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide some course material to generate notes.',
        variant: 'destructive',
      });
      return;
    }

    setGenerationProgress(0); // Reset progress
    startTransition(async () => {
      try {
        const input: GenerateNotesActionInput = { material: courseMaterial, sourceName };
        // Simulate progress and then call the actual generation
        const progressInterval = setInterval(() => {
          setGenerationProgress(prev => Math.min(prev + 10, 95)); // Simulate progress
        }, 300);

        const notes = await generateNotesAction(input);
        clearInterval(progressInterval);

        setGeneratedNotes(notes);
        setGenerationProgress(100); // Set to 100% on completion
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
        setGenerationProgress(0);
      }
    });
  };

  const handleFileRead = (content: string, fileName?: string) => {
    setTextInput(content);
    setCourseMaterial(content);
    setSourceName(fileName);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

    const progressBarStyle = {
        width: `${generationProgress}%`,
    };

  const generateButtonContent = () => {
    if (isPending) {
      return (
        <>
          <LoadingSpinner className="mr-2" aria-label="Generating notes..." />
          Generating Notes ({generationProgress}%)
        </>
      );
    } else {
      return (
        <>
          <Lightbulb className="mr-2 h-4 w-4" aria-hidden="true" />
          Generate Notes
        </>
      );
    }
  };


  const LabelElement = React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<typeof Label>>(
      ({ className, ...props }, ref) => {
        return (
            <Label
                ref={ref}
                className={cn("block text-sm font-medium mb-1", className)}
                {...props}
            />
        );
      }
  );
  LabelElement.displayName = "LabelElement";


  const generateTextareaElement = React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<typeof Textarea>>(
      ({className, ...props}, ref) => {
          return (
              <Textarea
                  ref={ref}
                  className={cn("min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)}
                  {...props}
              />
          )
      }
  )
  generateTextareaElement.displayName = "generateTextareaElement";


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
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
            <LabelElement htmlFor="courseMaterialText">
              Course Material (Paste Text)
            </LabelElement>
            <generateTextareaElement
              id="courseMaterialText"
              placeholder="Paste your course material here..."
              value={textInput}
              onChange={handleTextInputChange}
              rows={10}
              aria-label="Paste course material for note generation"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateNotes} disabled={isPending || !courseMaterial.trim()} aria-label="Generate dynamic notes">
            {generateButtonContent()}
          </Button>
        </CardFooter>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]" role="status" aria-live="polite">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating your notes, please wait...</p>
             <div className="relative w-full mt-4 rounded-full h-2 bg-muted">
                <div className="absolute left-0 top-0 h-full rounded-full bg-primary transition-width duration-300" style={progressBarStyle}></div>
              </div>
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
                  pre({ node, ...props }) {
                    // @ts-ignore
                    const childrenArray = React.Children.toArray(props.children);
                    // @ts-ignore
                    const codeChild = childrenArray.find(child => React.isValidElement(child) && child.type === 'code');
                    // @ts-ignore
                    if (React.isValidElement(codeChild) && codeChild.props.className?.includes('language-mermaid')) {
                       // @ts-ignore
                       return <pre {...props} className="language-mermaid bg-background text-foreground p-0">{props.children}</pre>;
                    }
                    // @ts-ignore
                    return <pre className="bg-muted/50 p-4 rounded-md overflow-auto" {...props} />;
                  },
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
                      <code className={cn(className, !inline && "block whitespace-pre-wrap bg-muted/50 p-2 rounded", inline && "px-1 py-0.5 bg-muted rounded-sm font-mono text-sm")} {...props}>
                        {children}
                      </code>
                    );
                  },
                  img: ({node, ...props}: any) => <img className="max-w-full h-auto rounded-md my-4 shadow-md border border-border" alt={props.alt || ''} {...props} />,
                  table: ({node, ...props}) => <table className="w-full my-4 border-collapse border border-border shadow-sm" {...props} />,
                  thead: ({node, ...props}) => <thead className="bg-muted/50 border-b border-border" {...props} />,
                  th: ({node, ...props}) => <th className="border border-border px-4 py-2 text-left font-semibold text-card-foreground" {...props} />,
                  td: ({node, ...props}) => <td className="border border-border px-4 py-2 text-card-foreground" {...props} />,
                  details: ({node, ...props}) => <details className="my-4 p-3 border rounded-md bg-card shadow-sm open:ring-1 open:ring-primary" {...props} />,
                  summary: ({node, ...props}) => <summary className="font-semibold cursor-pointer hover:text-primary list-inside text-card-foreground" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic my-4 bg-muted/20 p-3 rounded-r-md shadow-sm text-muted-foreground" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-3xl lg:text-4xl font-extrabold my-5 text-primary border-b border-border pb-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl lg:text-3xl font-bold my-4 text-foreground border-b border-border pb-1" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl lg:text-2xl font-semibold my-3 text-foreground" {...props} />,
                  h4: ({node, ...props}) => <h4 className="text-lg lg:text-xl font-semibold my-2 text-foreground" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-6 my-3 space-y-1 text-foreground" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-3 space-y-1 text-foreground" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1 leading-relaxed" {...props} />,
                  p: ({node, ...props}) => <p className="my-3 leading-relaxed text-foreground" {...props} />,
                  a: ({node, ...props}) => <a className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring" {...props} />,
                  hr: ({node, ...props}) => <hr className="my-6 border-border" {...props} />,
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
