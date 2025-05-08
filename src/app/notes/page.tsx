
'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react'; // Added React import
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
import { cn } from '@/lib/utils';

export default function NotesPage() {
  // State for the Textarea's current value (immediate feedback)
  const [textInput, setTextInput] = useState('');
  // State for the debounced course material, used for generation logic
  const [courseMaterial, setCourseMaterial] = useState('');
  const [sourceName, setSourceName] = useState<string | undefined>(undefined);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [mermaidScriptLoaded, setMermaidScriptLoaded] = useState(false);

  // Ref for the debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Cleanup debounce timer and mermaid script on unmount
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
    setTextInput(newText); // Update text input field immediately

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      setCourseMaterial(newText); // Update the debounced state used for generation
      if (!sourceName && newText.trim()) {
        setSourceName("Pasted Text");
      } else if (!newText.trim() && sourceName === "Pasted Text") {
        // Clear sourceName if text is cleared and it was "Pasted Text"
        setSourceName(undefined);
      }
    }, 500); // 500ms debounce delay
  };

  const handleGenerateNotes = () => {
    // Uses `courseMaterial` (the debounced value)
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
    setTextInput(content); // Update Textarea for immediate display
    setCourseMaterial(content); // Update debounced state directly as file upload is a discrete event
    setSourceName(fileName);
    // Clear any pending debounce from manual typing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
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
              value={textInput} // Use textInput for immediate display
              onChange={handleTextInputChange}
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
                       return <pre {...props} className="language-mermaid bg-background text-foreground p-0">{props.children}</pre>;
                    }
                    // @ts-ignore
                    return <pre className="bg-muted/50 p-4 rounded-md overflow-auto" {...props} />;
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
                      <code className={cn(className, !inline && "block whitespace-pre-wrap bg-muted/50 p-2 rounded", inline && "px-1 py-0.5 bg-muted rounded-sm font-mono text-sm")} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

