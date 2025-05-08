// src/app/notes/page.tsx
'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateNotesAction, type GenerateNotesActionInput } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { Lightbulb, Sparkles, Download, Copy,Printer } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { Label } from "@/components/ui/label";

export default function NotesPage() {
  const [textInput, setTextInput] = useState('');
  const [courseMaterial, setCourseMaterial] = useState('');
  const [sourceName, setSourceName] = useState<string | undefined>(undefined);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isGeneratingNotes, startGeneratingNotesTransition] = useTransition();
  const { toast } = useToast();
  const [mermaidScriptLoaded, setMermaidScriptLoaded] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const notesOutputRef = useRef<HTMLDivElement>(null);


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
    if (mermaidScriptLoaded && generatedNotes && notesOutputRef.current) {
      try {
        // @ts-ignore
        if (window.mermaid) {
           // @ts-ignore
          window.mermaid.run({
            nodes: Array.from(notesOutputRef.current.querySelectorAll('.language-mermaid')),
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

    setGenerationProgress(0);
    setGeneratedNotes(''); 
    startGeneratingNotesTransition(async () => {
      try {
        const input: GenerateNotesActionInput = { material: courseMaterial, sourceName };
        
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress = Math.min(currentProgress + 5, 95);
          setGenerationProgress(currentProgress);
        }, 200);

        const notes = await generateNotesAction(input);
        clearInterval(progressInterval);
        setGeneratedNotes(notes);
        setGenerationProgress(100);
        toast({
          title: 'Notes Generated!',
          description: 'Your dynamic notes are ready below.',
        });
      } catch (error) {
        setGenerationProgress(0);
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
    setTextInput(content);
    setCourseMaterial(content);
    setSourceName(fileName);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const handleExportMarkdown = () => {
    if (!generatedNotes) return;
    const blob = new Blob([generatedNotes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sourceName || 'StudySmarts-Notes'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Markdown Exported', description: 'Notes saved as .md file.' });
  };

  const handleCopyToClipboard = () => {
    if (!generatedNotes) return;
    navigator.clipboard.writeText(generatedNotes).then(() => {
      toast({ title: 'Copied to Clipboard', description: 'Notes copied successfully!' });
    }).catch(err => {
      toast({ title: 'Copy Failed', description: 'Could not copy notes to clipboard.', variant: 'destructive' });
      console.error('Failed to copy notes: ', err);
    });
  };

  const handleExportPdf = () => {
    if (!generatedNotes) return;
    // Simple approach: use browser's print to PDF functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Notes</title>');
      // Optional: Add basic styling for print
      printWindow.document.write('<style> body { font-family: sans-serif; margin: 20px; } .prose { max-width: 100%; } /* Add more styles as needed */ </style>');
      printWindow.document.write('</head><body>');
      // Use a div with prose styles to render markdown for printing
      const printableElement = document.createElement('div');
      printableElement.className = "prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none";
      
      // Temporarily render markdown to HTML for printing
      // This is a simplified way; for complex styling, a library like html2pdf.js or server-side PDF generation would be better.
      // Here, we directly put the markdown content hoping the print preview handles it or let user copy-paste into a proper markdown-to-pdf tool.
      // A more robust client-side way would be to render the ReactMarkdown to a hidden div and print that div's content.
      // For now, we'll just put the raw markdown in the print window or print the current view.
      
      // Better: Print the rendered content
      const notesContent = notesOutputRef.current?.innerHTML;
      if (notesContent) {
        printWindow.document.write(notesContent);
      } else {
        // Fallback to raw markdown if rendered content not found
        printWindow.document.write(`<pre>${generatedNotes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`);
      }
      
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      // Slight delay to ensure content is loaded before printing
      setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Optionally close window after print dialog
      }, 500);
       toast({ title: 'Print to PDF', description: 'Use your browser\'s print dialog to save as PDF.' });
    } else {
      toast({ title: 'Print Failed', description: 'Could not open print window. Please check pop-up blockers.', variant: 'destructive' });
    }
  };

  const progressBarStyle = {
    width: `${generationProgress}%`,
  };

  const generateButtonContent = () => {
    if (isGeneratingNotes) {
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

  const GenerateTextareaElement = React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<typeof Textarea>>(
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
  GenerateTextareaElement.displayName = "GenerateTextareaElement";

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
          <FileUpload onFileRead={handleFileRead} aria-label="Upload course material file"/>
          <div>
            <LabelElement htmlFor="courseMaterialText">
              Course Material (Paste Text)
            </LabelElement>
            <GenerateTextareaElement
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
          <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes || !courseMaterial.trim()} aria-label="Generate dynamic notes button">
            {generateButtonContent()}
          </Button>
        </CardFooter>
      </Card>

      {isGeneratingNotes && generationProgress < 100 && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]" role="status" aria-live="polite">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating your notes, please wait... {generationProgress}%</p>
             <div className="relative w-full mt-4 rounded-full h-2 bg-muted">
                <div className="absolute left-0 top-0 h-full rounded-full bg-primary transition-[width] duration-300" style={progressBarStyle}></div>
              </div>
          </CardContent>
        </Card>
      )}

      {generatedNotes && !isGeneratingNotes && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Generated Notes</CardTitle>
            <CardDescription>Review your generated notes below. You can also export them.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={notesOutputRef} className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none p-4 bg-muted/30 rounded-md overflow-x-auto">
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
          <CardFooter className="flex-col items-start sm:flex-row sm:items-center sm:justify-end gap-2">
            <Button onClick={handleExportMarkdown} variant="outline" aria-label="Export notes as Markdown file">
              <Download className="mr-2 h-4 w-4" /> Export as Markdown
            </Button>
            <Button onClick={handleCopyToClipboard} variant="outline" aria-label="Copy notes to clipboard">
              <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
            </Button>
            <Button onClick={handleExportPdf} variant="outline" aria-label="Export notes as PDF using print dialog">
              <Printer className="mr-2 h-4 w-4" /> Export as PDF
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
