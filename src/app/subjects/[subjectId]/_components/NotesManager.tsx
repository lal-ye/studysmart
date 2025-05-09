
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
import { 
    Lightbulb as TipIcon, 
    Sparkles, 
    Download, 
    Copy, 
    Printer, 
    Trash2, 
    Edit, 
    Save, 
    Eye, 
    Info as NoteIcon,
    AlertTriangle as WarningIcon
} from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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

  const [generatedNotesContent, setGeneratedNotesContent] = useState('');
  const [isGeneratingNotes, startGeneratingNotesTransition] = useTransition();
  const { toast } = useToast();
  const [mermaidScriptLoaded, setMermaidScriptLoaded] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const notesOutputRef = useRef<HTMLDivElement>(null);
  const [diagramCode, setDiagramCode] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);


  const getNotesStorageKey = () => NOTES_STORAGE_KEY_BASE; 


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
    const scriptId = 'mermaid-script';
    if (document.getElementById(scriptId)) {
        if (typeof window !== 'undefined' && (window as any).mermaid && !(window as any).mermaidInitialized) {
            (window as any).mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default' });
            (window as any).mermaidInitialized = true; // Mark as initialized
        }
        setMermaidScriptLoaded(true);
        return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).mermaid && !(window as any).mermaidInitialized) {
        (window as any).mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default' });
        (window as any).mermaidInitialized = true; 
      }
      setMermaidScriptLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      // Do not remove the script to avoid re-downloading; it's idempotent.
    };
  }, []);


  useEffect(() => {
    if (mermaidScriptLoaded && (generatedNotesContent || (isViewingNote && selectedNote)) && notesOutputRef.current) {
      try {
        if (typeof window !== 'undefined' && (window as any).mermaid) {
          const elementsToRender = Array.from(notesOutputRef.current.querySelectorAll('.language-mermaid, .mermaid:not([data-processed="true"])'));
          if(elementsToRender.length > 0) {
            (window as any).mermaid.run({ nodes: elementsToRender });
          }
        }
      } catch (error) {
        console.error("Error rendering Mermaid diagrams:", error);
        toast({ title: "Mermaid Diagram Error", description: "Could not render one or more diagrams.", variant: "destructive" });
      }
    }
  }, [generatedNotesContent, selectedNote, isViewingNote, mermaidScriptLoaded, toast]);

  useEffect(() => {
    if (mermaidScriptLoaded && diagramCode) {
      try {
        if (typeof window !== 'undefined' && (window as any).mermaid) {
          setTimeout(() => {
            const modalDiagramElements = document.querySelectorAll('.mermaid-modal-content .mermaid:not([data-processed="true"])');
            if (modalDiagramElements.length > 0) {
               (window as any).mermaid.run({
                 nodes: modalDiagramElements,
               });
            }
          }, 100); // Delay to ensure modal DOM is ready
        }
      } catch (error) {
        console.error("Error rendering Mermaid diagram in modal:", error);
        toast({ title: "Diagram Error", description: "Could not render the diagram.", variant: "destructive" });
      }
    }
  }, [diagramCode, mermaidScriptLoaded, toast]);


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
          currentProgress = Math.min(currentProgress + 5, 95); // Stop at 95% until actual completion
          setGenerationProgress(currentProgress);
        }, 200); // Simulate progress every 200ms

        const notes = await generateNotesAction(input);
        clearInterval(progressInterval);
        setGeneratedNotesContent(notes);
        setGenerationProgress(100); // Mark as 100% complete
        toast({ title: 'Notes Preview Ready!', description: 'Review your new notes below and save them.' });
      } catch (error) {
        clearInterval(progressInterval); // Ensure interval is cleared on error
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
      setGeneratedNotesContent(''); 
      setTextInput(''); 
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
    setGeneratedNotesContent(''); 
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
            setIsViewingNote(true); 
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

        setStoredNotes(prev => prev.filter(n => n.id !== noteId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime()));
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
          setIsViewingNote(false);
          setIsEditingNote(false);
        }
        toast({ title: "Note Deleted", variant: "destructive" });
    }
  };

  const handleExportMarkdown = (content: string, name?: string) => {
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
  
 const handleExportPdf = async (contentToExport: string, sourceNameToPrint?: string) => {
  if (!contentToExport) {
    toast({ 
      title: 'No Content', 
      description: 'Nothing to export to PDF.', 
      variant: 'destructive' 
    });
    return;
  }

  try {
    setIsExporting(true);
    
    const tempDiv = document.createElement('div');
    tempDiv.className = 'markdown-export-container prose dark:prose-invert max-w-none'; // Apply prose for styling
    tempDiv.style.width = '210mm'; 
    tempDiv.style.padding = '15mm';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // Off-screen
    tempDiv.style.backgroundColor = 'white'; // Ensure background for canvas capture
    tempDiv.style.color = 'black'; // Ensure text color for canvas capture
    
    if (sourceNameToPrint) {
      const titleElement = document.createElement('h1');
      titleElement.textContent = sourceNameToPrint;
      tempDiv.appendChild(titleElement);
    }
    
    const ReactDOMServer = await import('react-dom/server');
    
    // Ensure ReactMarkdown component is correctly imported and used if it's a default export
    const ReactMarkdownComponent = (await import('react-markdown')).default;

    const markdownHtml = ReactDOMServer.renderToString(
      React.createElement(ReactMarkdownComponent, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeRaw], components: markdownComponents }, contentToExport)
    );
    
    // Create a container for the HTML to be appended to, then append the HTML string.
    const contentContainer = document.createElement('div');
    contentContainer.innerHTML = markdownHtml;
    tempDiv.appendChild(contentContainer);

    document.body.appendChild(tempDiv);
    
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const contentHeight = tempDiv.offsetHeight * (25.4 / 96); // Convert px to mm (assuming 96 DPI)
    const a4Height = 297; 
    const a4Width = 210;  
    
    const pageMargin = 15; // mm
    const pageContentHeight = a4Height - (2 * pageMargin);
    const pageContentWidth = a4Width - (2 * pageMargin);

    const pageCount = Math.ceil(contentHeight / pageContentHeight); 
    
    for (let i = 0; i < pageCount; i++) {
      // Ensure mermaid diagrams render before capturing canvas for each page
      if (mermaidScriptLoaded && typeof window !== 'undefined' && (window as any).mermaid) {
          const diagramsOnPage = tempDiv.querySelectorAll('.mermaid');
          if(diagramsOnPage.length > 0) {
            await (window as any).mermaid.run({ nodes: diagramsOnPage });
          }
      }

      const canvas = await html2canvas(tempDiv, {
        scrollY: - (i * pageContentHeight * (96 / 25.4)), // scrollY needs to be in px
        height: pageContentHeight * (96 / 25.4), // height in px
        width: tempDiv.scrollWidth, // capture full width of the tempDiv
        scale: 2, 
        useCORS: true,
        logging: false,
        windowHeight: pageContentHeight * (96 / 25.4), // ensure window height for canvas matches content
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      if (i > 0) {
        pdf.addPage();
      }
      
      // Scale image to fit pageContentWidth, maintaining aspect ratio
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pageContentWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', pageMargin, pageMargin, pageContentWidth, pdfImgHeight);
      
      pdf.setFontSize(10);
      pdf.text(`Page ${i + 1} of ${pageCount}`, a4Width / 2, a4Height - (pageMargin / 2), { align: 'center' });
    }
    
    document.body.removeChild(tempDiv);
    
    pdf.save(`${sourceNameToPrint || 'StudySmarts-Notes'}.pdf`);
    
    toast({ 
      title: 'PDF Exported', 
      description: 'Notes saved as PDF file.' 
    });
  } catch (error) {
    console.error('PDF export failed:', error);
    toast({ 
      title: 'Export Failed', 
      description: `Failed to generate PDF. ${(error as Error).message || 'Please try again.'}`, 
      variant: 'destructive' 
    });
  } finally {
    setIsExporting(false);
  }
};
  
  
  const markdownComponents = {
      span: ({ node, className, children, ...props }: any) => {
        if (className === 'citation') {
          return (
            <span
              className="inline-block px-2 py-0.5 mx-0.5 text-xs font-bold text-primary-foreground bg-primary rounded-full border border-border align-middle leading-none shadow-neo-sm" 
              {...props}
            >
              {children}
            </span>
          );
        }
        return <span className={className} {...props}>{children}</span>;
      },
      blockquote: ({ node, children, ...props }: any) => {
        let calloutType: 'NOTE' | 'IMPORTANT' | 'TIP' | null = null;
        let finalCalloutContent = children; 
  
        if (Array.isArray(children) && children.length > 0 && React.isValidElement(children[0]) && children[0].type === 'p') {
          const pElement = children[0];
          const pChildren = React.Children.toArray(pElement.props.children);
  
          if (pChildren.length > 0 && typeof pChildren[0] === 'string') {
            let firstChildText = pChildren[0] as string;
            let textModified = false;
  
            if (firstChildText.startsWith('[!NOTE]')) { calloutType = 'NOTE'; firstChildText = firstChildText.substring('[!NOTE]'.length).trimStart(); textModified = true; } 
            else if (firstChildText.startsWith('[!IMPORTANT]')) { calloutType = 'IMPORTANT'; firstChildText = firstChildText.substring('[!IMPORTANT]'.length).trimStart(); textModified = true; } 
            else if (firstChildText.startsWith('[!TIP]')) { calloutType = 'TIP'; firstChildText = firstChildText.substring('[!TIP]'.length).trimStart(); textModified = true; }
  
            if (textModified) {
              const updatedPChildren = firstChildText.length > 0 ? [firstChildText, ...pChildren.slice(1)] : pChildren.slice(1);
              const updatedPElement = React.cloneElement(pElement, { children: updatedPChildren });
              finalCalloutContent = [updatedPElement, ...React.Children.toArray(children).slice(1)];
            }
          }
        }
  
        if (calloutType) {
          let iconComponent;
          let borderColorHex, bgColorHex, iconColorHex, textColorHex; 

          switch (calloutType) { 
            case 'NOTE': iconComponent = <NoteIcon className="h-5 w-5" />; borderColorHex = '#3b82f6'; bgColorHex = '#eff6ff'; iconColorHex = '#2563eb'; textColorHex = '#1e40af'; break; 
            case 'IMPORTANT': iconComponent = <WarningIcon className="h-5 w-5" />; borderColorHex = '#f59e0b'; bgColorHex = '#fffbeb'; iconColorHex = '#d97706'; textColorHex = '#92400e'; break; 
            case 'TIP': iconComponent = <TipIcon className="h-5 w-5" />; borderColorHex = '#10b981'; bgColorHex = '#ecfdf5'; iconColorHex = '#059669'; textColorHex = '#047857'; break; 
            default: return <blockquote className="border-l-4 border-foreground pl-4 italic my-4 bg-muted/30 p-3 rounded-r-md shadow-neo-sm text-muted-foreground" {...props}>{children}</blockquote>;
          }
          
          const darkBorderColorHex = calloutType === 'NOTE' ? '#60a5fa' : calloutType === 'IMPORTANT' ? '#facc15' : '#34d399';
          const darkBgColorHex = calloutType === 'NOTE' ? 'rgba(59,130,246,0.15)' : calloutType === 'IMPORTANT' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';
          const darkIconColorHex = calloutType === 'NOTE' ? '#93c5fd' : calloutType === 'IMPORTANT' ? '#fde047' : '#6ee7b7';
          const darkTextColorHex = calloutType === 'NOTE' ? '#bfdbfe' : calloutType === 'IMPORTANT' ? '#fef08a' : '#a7f3d0';


          return (
            <div className={cn('my-4 p-4 border-l-4 rounded-r-none shadow-neo-sm', (props as any).className)} 
                 style={{ 
                    borderColor: document.documentElement.classList.contains('dark') ? darkBorderColorHex : borderColorHex, 
                    backgroundColor: document.documentElement.classList.contains('dark') ? darkBgColorHex : bgColorHex 
                 }}>
              <div className="flex items-start">
                <div className={cn("flex-shrink-0 mr-3 mt-0.5")} style={{ color: document.documentElement.classList.contains('dark') ? darkIconColorHex : iconColorHex }}>{iconComponent}</div>
                <div className={cn("flex-grow text-sm prose-sm")} style={{ color: document.documentElement.classList.contains('dark') ? darkTextColorHex : textColorHex }}>{finalCalloutContent}</div> 
              </div>
            </div>
          );
        }
        return <blockquote className="border-l-4 border-foreground pl-4 italic my-4 bg-muted/30 p-3 rounded-r-md shadow-neo-sm text-muted-foreground" {...props}>{children}</blockquote>;
      },
      pre: ({ node, ...props }: any) => {
          const childrenArray = React.Children.toArray(props.children);
          const codeChild = childrenArray.find((child: any) => React.isValidElement(child) && child.props.className?.includes('language-mermaid')) as React.ReactElement | undefined;
          if (React.isValidElement(codeChild) && codeChild.props.className?.includes('language-mermaid')) {
          return (
            <div className="my-4 bg-card p-3 rounded-none border-2 border-border shadow-neo-sm"> 
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiagramCode(String(codeChild.props.children).replace(/\n$/, ''))}
                aria-label="View diagram in pop-out window"
                className="mb-2 bg-background hover:bg-accent text-xs" 
              >
                <Eye className="mr-2 h-3 w-3" /> View Diagram
              </Button>
              <pre {...props} className="language-mermaid bg-background text-foreground p-0 overflow-auto rounded-none border border-border">{props.children}</pre>
            </div>
          );
          }
          return <pre className="bg-muted/50 p-4 rounded-none border-2 border-border shadow-neo-sm overflow-auto" {...props} />;
      },
      code: ({ node, inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          if (match && match[1] === 'mermaid' && !inline) {
            return <code className="language-mermaid" {...props}>{String(children).replace(/\n$/, '')}</code>;
          }
          return (
          <code className={cn(className, !inline && "block whitespace-pre-wrap bg-muted/30 p-2 rounded-none border border-border", inline && "px-1 py-0.5 bg-muted/30 rounded-sm border border-border font-mono text-sm")} {...props}>
              {children}
          </code>
          );
      },
      img: ({node, ...props}: any) => <img className="max-w-full h-auto rounded-none my-4 shadow-neo-sm border-2 border-border" alt={props.alt || ''} {...props} data-ai-hint="illustration drawing"/>,
      table: ({node, ...props}: any) => <div className="overflow-x-auto my-4 border-2 border-border shadow-neo-sm"><table className="w-full border-collapse" {...props} /></div>,
      thead: ({node, ...props}: any) => <thead className="bg-muted/50 border-b-2 border-border" {...props} />,
      th: ({node, ...props}: any) => <th className="border-2 border-border px-4 py-2 text-left font-bold text-card-foreground" {...props} />,
      td: ({node, ...props}: any) => <td className="border-2 border-border px-4 py-2 text-card-foreground" {...props} />,
      details: ({node, ...props}: any) => <details className="my-4 p-3 border-2 border-border rounded-none bg-card shadow-neo-sm open:ring-2 open:ring-primary open:shadow-neo-md" {...props} />,
      summary: ({node, ...props}: any) => <summary className="font-bold cursor-pointer hover:text-primary list-inside text-card-foreground" {...props} />,
      h1: ({node, ...props}: any) => <h1 className="text-3xl lg:text-4xl font-extrabold my-5 text-primary border-b-3 border-border pb-2" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-2xl lg:text-3xl font-bold my-4 text-foreground border-b-2 border-border pb-1" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-xl lg:text-2xl font-bold my-3 text-foreground" {...props} />, 
      h4: ({node, ...props}: any) => <h4 className="text-lg lg:text-xl font-bold my-2 text-foreground" {...props} />, 
      ul: ({node, ...props}: any) => <ul className="list-disc pl-6 my-3 space-y-1 text-foreground" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 my-3 space-y-1 text-foreground" {...props} />,
      li: ({node, ...props}: any) => <li className="mb-1 leading-relaxed" {...props} />,
      p: ({node, ...props}: any) => <p className="my-3 leading-relaxed text-foreground" {...props} />,
      a: ({node, ...props}: any) => <a className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring font-bold" {...props} />, 
      hr: ({node, ...props}: any) => <hr className="my-6 border-t-2 border-border" {...props} />, 
  };

  const currentDisplayContent = isViewingNote && selectedNote ? selectedNote.content : generatedNotesContent;
  const currentSourceName = isViewingNote && selectedNote ? selectedNote.sourceName : sourceName;
  
  const renderProgressBar = () => (
     <div className="relative w-full mt-4 rounded-none h-2.5 bg-muted border-2 border-border shadow-neo-sm"> 
        <div 
            className="absolute left-0 top-0 h-full bg-primary transition-[width] duration-300 border-r-2 border-border" 
            style={{ width: `${generationProgress}%` }}
            aria-valuenow={generationProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
            aria-label={`Generation progress: ${generationProgress}%`}
        ></div>
    </div>
  );
  
  const renderDiagramModal = () => {
    if (!diagramCode) return null;

    return (
      <Dialog open={!!diagramCode} onOpenChange={(open) => !open && setDiagramCode(null)}>
        <DialogContent className="max-w-3xl min-h-[300px] flex flex-col sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-card border-3 border-border shadow-neo-lg rounded-none">
          <DialogHeader className="border-b-2 border-border pb-3">
            <DialogTitle className="font-bold">Diagram View</DialogTitle>
          </DialogHeader>
          <div className="p-4 flex-grow overflow-auto mermaid-modal-content bg-background border-2 border-border m-2">
            <div className="mermaid flex justify-center items-center w-full h-full">{diagramCode}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };


  return (
    <div className="space-y-6">
       {!isViewingNote && !isEditingNote && !generatedNotesContent && (
        <Card className="shadow-neo-lg">
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
                <Label htmlFor="courseMaterialTextNotes" className="block text-sm font-bold mb-1">Course Material (Paste Text)</Label>
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
            <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes || !courseMaterial.trim()} aria-label="Generate notes from provided material">
                {isGeneratingNotes ? <LoadingSpinner className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Notes ({generationProgress > 0 && generationProgress < 100 ? `${generationProgress}%` : 'Start'})
            </Button>
            </CardFooter>
             {isGeneratingNotes && generationProgress < 100 && generationProgress > 0 && (
                <CardContent>{renderProgressBar()}</CardContent>
            )}
        </Card>
       )}


      {isGeneratingNotes && generationProgress < 100 && (
        <Card className="shadow-neo-md">
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]" role="status" aria-live="polite">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating notes... {generationProgress}%</p>
            {renderProgressBar()}
          </CardContent>
        </Card>
      )}

      {generatedNotesContent && !isViewingNote && !isEditingNote && (
        <Card className="shadow-neo-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold">New Notes Preview for "{subjectName}"</CardTitle>
            <CardDescription>Review your generated notes. Save them to add to this subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={notesOutputRef} className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none p-4 bg-muted/30 rounded-none overflow-x-auto border-2 border-border shadow-neo-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                    {generatedNotesContent}
                </ReactMarkdown>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 justify-end pt-4">
            <Button onClick={handleSaveGeneratedNotes} variant="default" className="bg-primary hover:bg-primary/90" aria-label="Save generated notes">
              <Save className="mr-2 h-4 w-4" /> Save These Notes
            </Button>
            <Button onClick={() => { setGeneratedNotesContent(''); setTextInput(''); setCourseMaterial(''); setSourceName(undefined); setGenerationProgress(0); }} variant="outline" aria-label="Discard generated notes">
              <Trash2 className="mr-2 h-4 w-4" /> Discard
            </Button>
          </CardFooter>
        </Card>
      )}

      {isEditingNote && selectedNote && (
        <Card className="shadow-neo-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Editing Note: {selectedNote.sourceName}</CardTitle>
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
          <CardFooter className="justify-end gap-2 pt-4">
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
         <Card className="shadow-neo-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">{selectedNote.sourceName}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => {setIsViewingNote(false); setSelectedNote(null);}} aria-label="Close note view and return to list/generation" className="shadow-none active:shadow-none"> 
                    Close View
                </Button>
            </div>
            <CardDescription>Created: {new Date(selectedNote.createdAt).toLocaleString()} | Updated: {new Date(selectedNote.updatedAt).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={notesOutputRef} className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl dark:prose-invert max-w-none p-4 bg-muted/30 rounded-none overflow-x-auto border-2 border-border shadow-neo-sm">
                 <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                    {selectedNote.content}
                </ReactMarkdown>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 justify-end pt-4">
             <Button onClick={() => editNote(selectedNote)} variant="outline" aria-label={`Edit note ${selectedNote.sourceName || 'this note'}`}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => handleExportMarkdown(selectedNote.content, selectedNote.sourceName)} variant="outline" aria-label="Export note as Markdown">
              <Download className="mr-2 h-4 w-4" /> Export Markdown
            </Button>
            <Button onClick={() => handleCopyToClipboard(selectedNote.content)} variant="outline" aria-label="Copy note content to clipboard">
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
             <Button 
              onClick={() => handleExportPdf(selectedNote.content, selectedNote.sourceName)} 
              variant="outline" 
              aria-label="Export note as PDF"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" /> Exporting...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" /> Export PDF
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {!isViewingNote && !isEditingNote && !generatedNotesContent && storedNotes.length > 0 && (
        <Card className="shadow-neo-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Saved Notes for "{subjectName}" ({storedNotes.length})</CardTitle>
            <CardDescription>Select a note to view, edit, or delete.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {storedNotes.map(note => (
                <li key={note.id} className="p-4 border-2 border-border rounded-none hover:shadow-neo-md transition-shadow flex justify-between items-center bg-card shadow-neo-sm">
                  <div>
                    <h3 className="font-bold">{note.sourceName || "Untitled Note"}</h3>
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
                        <AlertDialogContent className="shadow-neo-lg border-3 rounded-none"> 
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-bold">Delete Note: {note.sourceName || "Untitled Note"}?</AlertDialogTitle>
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
            <Card className="shadow-neo-md">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No notes found for "{subjectName}". Generate new notes above or check other subjects.</p>
                </CardContent>
            </Card>
        )}
      {renderDiagramModal()}
    </div>
  );
}

