'use client';

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateNotesAction, type GenerateNotesActionInput, type StoredNote } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { Lightbulb, Sparkles, Download, Copy, Printer, Trash2, Edit, Save, PlusCircle, Eye } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NotesManagerProps {
  subjectId: string;
  subjectName: string;
}

const NOTES_STORAGE_KEY_BASE = 'studySmartsNotes';

export default function NotesManager({ subjectId, subjectName }: NotesManagerProps) {
  const [textInput, setTextInput] = useState('');
  const [courseMaterial, setCourseMaterial] = useState('');
  const [sourceName, setSourceName] = useState<string | undefined>(undefined);
  
  const [storedNotes, setStoredNotes] = useState<StoredNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<StoredNote | null>(null);
  const [isViewingNote, setIsViewingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const [generatedNotesContent, setGeneratedNotesContent] = useState(''); // For newly generated notes
  const [isGeneratingNotes, startGeneratingNotesTransition] = useTransition();
  const { toast } = useToast();
  const [mermaidScriptLoaded, setMermaidScriptLoaded] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const notesOutputRef = useRef<HTMLDivElement>(null);

  const getNotesStorageKey = () => NOTES_STORAGE_KEY_BASE; // Global key, filtered by subjectId


  const loadNotes = useCallback(() => {
    try {
      const allNotesString = localStorage.getItem(getNotesStorageKey());
      if (allNotesString) {
        const allNotes: StoredNote[] = JSON.parse(allNotesString);
        setStoredNotes(allNotes.filter(note => note.subjectId === subjectId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setStoredNotes([]);
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
      toast({ title: "Error", description: "Could not load saved notes.", variant: "destructive" });
      setStoredNotes([]);
    }
  }, [subjectId, toast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);


  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).mermaid) {
        (window as any).mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default' });
      }
      setMermaidScriptLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (script.parentNode) document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (mermaidScriptLoaded && (generatedNotesContent || (isViewingNote && selectedNote)) && notesOutputRef.current) {
      try {
        if (typeof window !== 'undefined' && (window as any).mermaid) {
          (window as any).mermaid.run({
            nodes: Array.from(notesOutputRef.current.querySelectorAll('.language-mermaid')),
          });
        }
      } catch (error) {
        console.error("Error rendering Mermaid diagrams:", error);
        toast({ title: "Mermaid Diagram Error", description: "Could not render one or more diagrams.", variant: "destructive" });
      }
    }
  }, [generatedNotesContent, selectedNote, isViewingNote, mermaidScriptLoaded, toast]);

  const handleTextInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setTextInput(newText);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setCourseMaterial(newText);
      if (!sourceName && newText.trim()) setSourceName("Pasted Text");
      else if (!newText.trim() && sourceName === "Pasted Text") setSourceName(undefined);
    }, 500);
  };

  const handleGenerateNotes = () => {
    if (!courseMaterial.trim()) {
      toast({ title: 'Input Required', description: 'Please provide course material.', variant: 'destructive' });
      return;
    }
    setGenerationProgress(0);
    setGeneratedNotesContent('');
    setSelectedNote(null);
    setIsViewingNote(false);
    setIsEditingNote(false);

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
        setGeneratedNotesContent(notes);
        setGenerationProgress(100);
        toast({ title: 'Notes Preview Ready!', description: 'Review your new notes below and save them.' });
        // Don't save immediately, let user save explicitly
      } catch (error) {
        setGenerationProgress(0);
        toast({ title: 'Error Generating Notes', description: (error as Error).message, variant: 'destructive' });
        setGeneratedNotesContent('');
      }
    });
  };
  
  const handleSaveGeneratedNotes = () => {
    if (!generatedNotesContent) {
      toast({ title: "No Notes to Save", description: "Please generate notes first.", variant: "destructive" });
      return;
    }
    const newNote: StoredNote = {
      id: Date.now().toString(),
      subjectId,
      content: generatedNotesContent,
      sourceName: sourceName || "Generated Notes",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      const allNotesString = localStorage.getItem(getNotesStorageKey());
      const allNotes: StoredNote[] = allNotesString ? JSON.parse(allNotesString) : [];
      allNotes.push(newNote);
      localStorage.setItem(getNotesStorageKey(), JSON.stringify(allNotes));
      
      setStoredNotes(prev => [newNote, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setGeneratedNotesContent(''); // Clear preview
      setTextInput(''); // Clear input area
      setCourseMaterial('');
      setSourceName(undefined);
      setGenerationProgress(0);
      toast({ title: "Notes Saved!", description: `Notes "${newNote.sourceName}" saved successfully.` });
    } catch (e) {
      console.error("Error saving note:", e);
      toast({ title: "Save Error", description: "Could not save the notes.", variant: "destructive" });
    }
  };


  const handleFileRead = (content: string, fileName?: string) => {
    setTextInput(content);
    setCourseMaterial(content);
    setSourceName(fileName);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  };
  
  const viewNote = (note: StoredNote) => {
    setSelectedNote(note);
    setIsViewingNote(true);
    setIsEditingNote(false);
    setGeneratedNotesContent(''); // Clear any new generation preview
  };

  const editNote = (note: StoredNote) => {
    setSelectedNote(note);
    setEditedContent(note.content);
    setIsEditingNote(true);
    setIsViewingNote(false);
    setGeneratedNotesContent('');
  };

  const saveEditedNote = () => {
    if (!selectedNote || !isEditingNote) return;
    const updatedNote = { ...selectedNote, content: editedContent, updatedAt: new Date().toISOString() };
    
    const allNotesString = localStorage.getItem(getNotesStorageKey());
    if (allNotesString) {
        const allNotes: StoredNote[] = JSON.parse(allNotesString);
        const noteIndex = allNotes.findIndex(n => n.id === selectedNote.id && n.subjectId === subjectId);
        if (noteIndex > -1) {
            allNotes[noteIndex] = updatedNote;
            localStorage.setItem(getNotesStorageKey(), JSON.stringify(allNotes));
            setStoredNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setSelectedNote(updatedNote);
            setIsEditingNote(false);
            setIsViewingNote(true); // Go back to viewing mode
            toast({ title: "Note Updated", description: `Notes "${updatedNote.sourceName}" saved.` });
        } else {
             toast({ title: "Error", description: "Original note not found for updating.", variant: "destructive" });
        }
    }
  };

  const deleteNote = (noteId: string) => {
    const allNotesString = localStorage.getItem(getNotesStorageKey());
    if (allNotesString) {
        const allNotes: StoredNote[] = JSON.parse(allNotesString);
        const filteredNotes = allNotes.filter(n => !(n.id === noteId && n.subjectId === subjectId));
        localStorage.setItem(getNotesStorageKey(), JSON.stringify(filteredNotes));

        setStoredNotes(prev => prev.filter(n => n.id !== noteId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
          setIsViewingNote(false);
          setIsEditingNote(false);
        }
        toast({ title: "Note Deleted", variant: "destructive" });
    }
  };

  const handleExportMarkdown = (content: string, name: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'StudySmarts-Notes'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Markdown Exported', description: 'Notes saved as .md file.' });
  };

  const handleCopyToClipboard = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: 'Copied to Clipboard!' });
    }).catch(err => {
      toast({ title: 'Copy Failed', variant: 'destructive' });
    });
  };

  const handleExportPdf = (content: string) => {
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Notes</title>');
      printWindow.document.write('<style> body { font-family: sans-serif; margin: 20px; } .prose { max-width: 100%; } </style>');
      printWindow.document.write('</head><body>');
      
      const printableElement = document.createElement('div');
      printableElement.className = "prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none";
      
      // Temporarily create a ReactMarkdown instance for printing. This could be more optimized.
      const tempDiv = document.createElement('div');
      const notesToPrint = content; // The actual markdown content
      
      // This is a basic way. A more sophisticated way might involve ReactDOMServer or similar for static HTML.
      // For client-side, getting innerHTML of a rendered ReactMarkdown is an option.
      // Let's print the rendered content from notesOutputRef if available and viewing, otherwise raw.
      let htmlToPrint = '';
       if (notesOutputRef.current && (isViewingNote || generatedNotesContent)) {
         htmlToPrint = notesOutputRef.current.innerHTML;
       } else {
         // Fallback to a very basic conversion of markdown for printing
         // This won't have the rich rendering like ReactMarkdown
         htmlToPrint = `<pre>${notesToPrint.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
       }

      printWindow.document.write(htmlToPrint);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      toast({ title: 'Print to PDF', description: 'Use browser\'s print dialog.' });
    } else {
      toast({ title: 'Print Failed', variant: 'destructive' });
    }
  };

  const currentDisplayContent = isViewingNote && selectedNote ? selectedNote.content : generatedNotesContent;
  const currentSourceName = isViewingNote && selectedNote ? selectedNote.sourceName : sourceName;
  
  const renderProgressBar = () => (
     <div className="relative w-full mt-4 rounded-full h-2 bg-muted">
        <div 
            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-[width] duration-300" 
            style={{ width: `${generationProgress}%` }}
            aria-valuenow={generationProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
            aria-label={`Generation progress: ${generationProgress}%`}
        ></div>
    </div>
  );

  return (
    <div className="space-y-6">
       {!isViewingNote && !isEditingNote && !generatedNotesContent && (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle className="text-2xl font-bold">Generate New Notes</CardTitle>
                    <CardDescription>
                    Input course material for "{subjectName}" to create dynamic notes.
                    </CardDescription>
                </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
            <FileUpload onFileRead={handleFileRead} aria-label="Upload course material file"/>
            <div>
                <Label htmlFor="courseMaterialTextNotes">Course Material (Paste Text)</Label>
                <Textarea
                    id="courseMaterialTextNotes"
                    placeholder="Paste course material here..."
                    value={textInput}
                    onChange={handleTextInputChange}
                    rows={10}
                    className="min-h-[150px]"
                    aria-label="Paste course material for note generation"
                />
            </div>
            </CardContent>
            <CardFooter>
            <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes || !courseMaterial.trim()}>
                {isGeneratingNotes ? <LoadingSpinner className="mr-2" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                Generate Notes ({generationProgress > 0 && generationProgress < 100 ? `${generationProgress}%` : 'Start'})
            </Button>
            </CardFooter>
             {isGeneratingNotes && generationProgress < 100 && generationProgress > 0 && (
                <CardContent>{renderProgressBar()}</CardContent>
            )}
        </Card>
       )}


      {isGeneratingNotes && generationProgress < 100 && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]" role="status" aria-live="polite">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating notes... {generationProgress}%</p>
            {renderProgressBar()}
          </CardContent>
        </Card>
      )}

      {generatedNotesContent && !isViewingNote && !isEditingNote && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">New Notes Preview for "{subjectName}"</CardTitle>
            <CardDescription>Review your generated notes. Save them to add to this subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={notesOutputRef} className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none p-4 bg-muted/30 rounded-md overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                    {generatedNotesContent}
                </ReactMarkdown>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 justify-end">
            <Button onClick={handleSaveGeneratedNotes} variant="default" className="bg-green-600 hover:bg-green-700" aria-label="Save generated notes">
              <Save className="mr-2 h-4 w-4" /> Save These Notes
            </Button>
            <Button onClick={() => { setGeneratedNotesContent(''); setTextInput(''); setCourseMaterial(''); setSourceName(undefined); setGenerationProgress(0); }} variant="outline" aria-label="Discard generated notes">
              <Trash2 className="mr-2 h-4 w-4" /> Discard
            </Button>
          </CardFooter>
        </Card>
      )}

      {isEditingNote && selectedNote && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Editing Note: {selectedNote.sourceName}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              className="min-h-[400px] font-mono text-sm"
              aria-label="Edit note content"
            />
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button onClick={saveEditedNote} aria-label="Save edited note">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
            <Button variant="outline" onClick={() => { setIsEditingNote(false); viewNote(selectedNote);}} aria-label="Cancel editing">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      )}

      {isViewingNote && selectedNote && !isEditingNote && (
         <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">{selectedNote.sourceName}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {setIsViewingNote(false); setSelectedNote(null);}} aria-label="Close note view and return to list/generation">
                    Close View
                </Button>
            </div>
            <CardDescription>Created: {new Date(selectedNote.createdAt).toLocaleString()} | Updated: {new Date(selectedNote.updatedAt).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={notesOutputRef} className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none p-4 bg-muted/30 rounded-md overflow-x-auto">
                 <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                    {selectedNote.content}
                </ReactMarkdown>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 justify-end">
             <Button onClick={() => editNote(selectedNote)} variant="outline" aria-label={`Edit note ${selectedNote.sourceName}`}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => handleExportMarkdown(selectedNote.content, selectedNote.sourceName || 'notes')} variant="outline" aria-label="Export note as Markdown">
              <Download className="mr-2 h-4 w-4" /> Export Markdown
            </Button>
            <Button onClick={() => handleCopyToClipboard(selectedNote.content)} variant="outline" aria-label="Copy note content to clipboard">
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={() => handleExportPdf(selectedNote.content)} variant="outline" aria-label="Export note as PDF">
              <Printer className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </CardFooter>
        </Card>
      )}

      {!isViewingNote && !isEditingNote && !generatedNotesContent && storedNotes.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Saved Notes for "{subjectName}" ({storedNotes.length})</CardTitle>
            <CardDescription>Select a note to view, edit, or delete.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {storedNotes.map(note => (
                <li key={note.id} className="p-4 border rounded-md hover:shadow-md transition-shadow flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{note.sourceName || "Untitled Note"}</h3>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(note.createdAt).toLocaleDateString()} | Updated: {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => viewNote(note)} aria-label={`View note ${note.sourceName || "Untitled Note"}`}>
                        <Eye className="mr-1 h-4 w-4" /> View
                     </Button>
                     <Button variant="outline" size="sm" onClick={() => editNote(note)} aria-label={`Edit note ${note.sourceName || "Untitled Note"}`}>
                        <Edit className="mr-1 h-4 w-4" /> Edit
                     </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" aria-label={`Delete note ${note.sourceName || "Untitled Note"}`}>
                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Note: {note.sourceName || "Untitled Note"}?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this note.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteNote(note.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
       {!isGeneratingNotes && !isViewingNote && !isEditingNote && !generatedNotesContent && storedNotes.length === 0 && (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No notes found for "{subjectName}". Generate new notes above or check other subjects.</p>
                </CardContent>
            </Card>
        )}

    </div>
  );
}


// Shared Markdown components for consistent rendering
const markdownComponents = {
    pre: ({ node, ...props }: any) => {
        const childrenArray = React.Children.toArray(props.children);
        const codeChild = childrenArray.find((child: any) => React.isValidElement(child) && child.type === 'code') as React.ReactElement | undefined;
        if (React.isValidElement(codeChild) && codeChild.props.className?.includes('language-mermaid')) {
        return <pre {...props} className="language-mermaid bg-background text-foreground p-0">{props.children}</pre>;
        }
        return <pre className="bg-muted/50 p-4 rounded-md overflow-auto" {...props} />;
    },
    code: ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        if (match && match[1] === 'mermaid' && !inline) {
        return <code className="language-mermaid" {...props}>{String(children).replace(/\n$/, '')}</code>;
        }
        return (
        <code className={cn(className, !inline && "block whitespace-pre-wrap bg-muted/50 p-2 rounded", inline && "px-1 py-0.5 bg-muted rounded-sm font-mono text-sm")} {...props}>
            {children}
        </code>
        );
    },
    img: ({node, ...props}: any) => <img className="max-w-full h-auto rounded-md my-4 shadow-md border border-border" alt={props.alt || ''} {...props} />,
    table: ({node, ...props}: any) => <table className="w-full my-4 border-collapse border border-border shadow-sm" {...props} />,
    thead: ({node, ...props}: any) => <thead className="bg-muted/50 border-b border-border" {...props} />,
    th: ({node, ...props}: any) => <th className="border border-border px-4 py-2 text-left font-semibold text-card-foreground" {...props} />,
    td: ({node, ...props}: any) => <td className="border border-border px-4 py-2 text-card-foreground" {...props} />,
    details: ({node, ...props}: any) => <details className="my-4 p-3 border rounded-md bg-card shadow-sm open:ring-1 open:ring-primary" {...props} />,
    summary: ({node, ...props}: any) => <summary className="font-semibold cursor-pointer hover:text-primary list-inside text-card-foreground" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-primary pl-4 italic my-4 bg-muted/20 p-3 rounded-r-md shadow-sm text-muted-foreground" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-3xl lg:text-4xl font-extrabold my-5 text-primary border-b border-border pb-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-2xl lg:text-3xl font-bold my-4 text-foreground border-b border-border pb-1" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-xl lg:text-2xl font-semibold my-3 text-foreground" {...props} />,
    h4: ({node, ...props}: any) => <h4 className="text-lg lg:text-xl font-semibold my-2 text-foreground" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 my-3 space-y-1 text-foreground" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 my-3 space-y-1 text-foreground" {...props} />,
    li: ({node, ...props}: any) => <li className="mb-1 leading-relaxed" {...props} />,
    p: ({node, ...props}: any) => <p className="my-3 leading-relaxed text-foreground" {...props} />,
    a: ({node, ...props}: any) => <a className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring" {...props} />,
    hr: ({node, ...props}: any) => <hr className="my-6 border-border" {...props} />,
};
