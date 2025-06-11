
'use client';

import { useState, useTransition, type CSSProperties, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateQuizAction, explainTermAction } from '@/lib/actions';
import type { Flashcard, ExplainTermInput, ExplainTermOutput, StoredQuiz } from '@/lib/types';
import FileUpload from '@/components/common/FileUpload';
import { HelpCircle, Sparkles, Tags, CheckCircle, AlertTriangle, RotateCcw, BookOpenText, ExternalLink, Trash2, Eye, Edit, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// import type { ToastProps } from '@/components/ui/toast'; // Not used directly
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


interface QuizzesManagerProps {
  subjectId: string;
  subjectName: string;
}

const QUIZZES_STORAGE_KEY_BASE = 'studySmartsQuizzes';

interface FlashcardComponentProps {
  flashcard: Flashcard;
  onTextSelect: (text: string, contextText: string) => void;
  onContextMenuOpen: (x: number, y: number, contextText: string) => void;
}

const difficultyColors: Record<Flashcard['difficulty'], string> = {
  Easy: 'bg-green-500 hover:bg-green-600',
  Medium: 'bg-yellow-500 hover:bg-yellow-600',
  Hard: 'bg-red-500 hover:bg-red-600',
};

function FlashcardComponent({ flashcard, onTextSelect, onContextMenuOpen }: FlashcardComponentProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);
  const backFaceRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });


  if (!flashcard.question || !flashcard.answer) {
    return (
      <div className="w-full p-4 border-3 border-border shadow-neo-md rounded-none bg-destructive text-destructive-foreground">
        <p>Invalid flashcard data: Question or answer is missing.</p>
      </div>
    );
  }

  const adjustHeight = useCallback(() => {
    requestAnimationFrame(() => {
      if (cardInnerRef.current && frontFaceRef.current && backFaceRef.current) {
        const frontHeight = frontFaceRef.current.scrollHeight;
        const backHeight = backFaceRef.current.scrollHeight;
        const maxHeight = Math.max(frontHeight, backHeight, 150); // Min height 150px
        cardInnerRef.current.style.height = `${maxHeight}px`;
      }
    });
  }, []); // Removed flashcard and isFlipped from deps as adjustHeight itself is called when they change

  useEffect(() => {
    adjustHeight();
     // Set a timeout to adjust again after content likely rendered
    const timeoutId = setTimeout(adjustHeight, 100);
    
    window.addEventListener('resize', adjustHeight);
    return () => {
        window.removeEventListener('resize', adjustHeight);
        clearTimeout(timeoutId);
    }
  }, [flashcard, isFlipped, adjustHeight]);


  const handleMouseUpCapture = (contextText: string) => (event: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      event.stopPropagation(); // Prevent card flip on text selection
      onTextSelect(selection, contextText);
    }
  };

  const handleContextMenuCapture = (contextText: string) => (event: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      event.preventDefault();
      event.stopPropagation();
      onContextMenuOpen(event.clientX, event.clientY, contextText);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') { setIsFlipped(!isFlipped); event.preventDefault(); }
  };

  const handleCardClick = (event: React.MouseEvent) => {
    if (window.getSelection()?.toString().trim()) {
      return;
    }
    setIsFlipped(!isFlipped);
  };
  
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
    };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const touchDelta = {
        x: event.changedTouches[0].clientX - touchStartRef.current.x,
        y: event.changedTouches[0].clientY - touchStartRef.current.y,
    };

    if (Math.abs(touchDelta.x) < 10 && Math.abs(touchDelta.y) < 10) { // Increased tap threshold
        setIsFlipped(!isFlipped);
    }
  };


  return (
    <div
      className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-none"
      style={{ width: '100%', minHeight: '150px', perspective: '1000px' }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="button"
      aria-roledescription="flashcard"
      aria-pressed={isFlipped}
      aria-label={isFlipped 
        ? `Flashcard answer: ${flashcard.answer.substring(0, 50)}... Click or press Enter to flip.` 
        : `Flashcard question: ${flashcard.question}. Click or press Enter to flip.`
      }
    >
      <div 
        ref={cardInnerRef} 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%', 
          textAlign: 'initial', 
          transformStyle: 'preserve-3d', 
          transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          willChange: 'transform',
        }}
      >
        {/* Front Face */}
        <div
          ref={frontFaceRef}
          className="absolute w-full h-full flex flex-col justify-between p-4 border-3 border-border shadow-neo-md rounded-none box-sizing-border-box overflow-y-auto bg-card text-card-foreground"
          onMouseUpCapture={handleMouseUpCapture(flashcard.question)}
          onContextMenuCapture={handleContextMenuCapture(flashcard.question)}
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden', // For Safari
            zIndex: isFlipped ? 0 : 1
          }}
          aria-hidden={isFlipped}
        >
          <div>
            <p className="text-xs text-muted-foreground mb-1">ID: {flashcard.id}</p>
            <h3 className="text-lg font-bold mt-1 mb-3 break-words select-text">{flashcard.question}</h3>
          </div>
          <div className="flex justify-between items-center mt-auto pt-2">
            <Badge className={cn(difficultyColors[flashcard.difficulty], "text-xs border-2 border-border shadow-neo-sm")}>{flashcard.difficulty}</Badge>
            <RotateCcw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
        
        {/* Back Face */}
        <div
          ref={backFaceRef}
          className="absolute w-full h-full flex flex-col justify-between p-4 border-3 border-border shadow-neo-md rounded-none box-sizing-border-box overflow-y-auto bg-secondary text-secondary-foreground"
          onMouseUpCapture={handleMouseUpCapture(flashcard.answer)}
          onContextMenuCapture={handleContextMenuCapture(flashcard.answer)}
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden', // For Safari
            transform: 'rotateY(180deg)',
            zIndex: isFlipped ? 1 : 0
          }}
          aria-hidden={!isFlipped}
        >
          <div>
            <h4 className="text-md font-bold mb-2">Answer:</h4>
            <div className="text-sm leading-relaxed break-words select-text prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{flashcard.answer}</ReactMarkdown>
            </div>
          </div>
          {flashcard.tags && flashcard.tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-1 mt-auto pt-2">
              <Tags className="h-3 w-3 self-center" aria-hidden="true"/><span className="sr-only">Tags:</span>
              {flashcard.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs border-2 border-border shadow-neo-sm">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


interface CustomContextMenuProps { x: number; y: number; onExplain: () => void; onClose: () => void; menuRef: React.RefObject<HTMLDivElement>; }
function CustomContextMenu({ x, y, onExplain, onClose, menuRef }: CustomContextMenuProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, menuRef]);
  return (<div ref={menuRef} style={{ top: y, left: x, position: 'fixed', zIndex: 1000 }} className="bg-popover border-3 border-border rounded-none shadow-neo-md p-1 min-w-[180px]" role="menu"><Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm h-auto shadow-none border-transparent active:shadow-none" onClick={onExplain} role="menuitem"><BookOpenText className="mr-2 h-4 w-4" aria-hidden="true" /> Explain Selection</Button></div>); // Neobrutalist Context Menu
}


export default function QuizzesManager({ subjectId, subjectName }: QuizzesManagerProps) {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [quizLength, setQuizLength] = useState(5);
  const [quizName, setQuizName] = useState('');
  
  const [storedQuizzes, setStoredQuizzes] = useState<StoredQuiz[]>([]);
  const [currentFlashcards, setCurrentFlashcards] = useState<Flashcard[]>([]); 
  const [viewingQuiz, setViewingQuiz] = useState<StoredQuiz | null>(null);

  const [isGeneratingQuiz, startGeneratingQuizTransition] = useTransition();
  const [toastArgs, setToastArgs] = useState<Parameters<typeof useToast>[0] | null>(null);
  const { toast } = useToast();

  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectedTextContext, setSelectedTextContext] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [explanationData, setExplanationData] = useState<ExplainTermOutput | null>(null);
  const [isFetchingExplanation, startFetchingExplanationTransition] = useTransition();
  const [showExplanationPopup, setShowExplanationPopup] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const getQuizzesStorageKey = () => QUIZZES_STORAGE_KEY_BASE;


  const loadQuizzes = useCallback(() => {
    try {
      const allQuizzesString = localStorage.getItem(getQuizzesStorageKey());
      if (allQuizzesString) {
        const allQuizzes: StoredQuiz[] = JSON.parse(allQuizzesString);
        setStoredQuizzes(allQuizzes.filter(q => q.subjectId === subjectId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setStoredQuizzes([]);
      }
    } catch (error) {
      console.error("Failed to load quizzes:", error);
      toast({ title: "Error", description: "Could not load saved quizzes.", variant: "destructive" });
      setStoredQuizzes([]);
    }
  }, [subjectId, toast]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  useEffect(() => { if (toastArgs) { toast(toastArgs); setToastArgs(null); }}, [toastArgs, toast]);

  const handleGenerateQuiz = () => {
    if (!courseMaterial.trim()) {
      setToastArgs({ title: 'Input Required', description: 'Please provide course material.', variant: 'destructive' }); return;
    }
    if (quizLength < 1 || quizLength > 20) {
      setToastArgs({ title: 'Invalid Length', description: 'Length must be 1-20.', variant: 'destructive' }); return;
    }
    if (!quizName.trim()) {
      setToastArgs({ title: 'Quiz Name Required', description: 'Please name your quiz.', variant: 'destructive' }); return;
    }
    
    setCurrentFlashcards([]);
    setViewingQuiz(null);
    setShowContextMenu(false); 

    startGeneratingQuizTransition(async () => {
      try {
        const flashcards = await generateQuizAction({ courseMaterial, quizLength });
        if (flashcards.length === 0) {
            setToastArgs({ title: 'No Flashcards Generated', description: 'AI returned no flashcards. Try different material or length.' });
        } else {
            setToastArgs({ title: 'Quiz Preview Ready!', description: `Your ${flashcards.length} flashcards are ready below. Save to keep them.` });
        }
        setCurrentFlashcards(flashcards);
      } catch (error) {
        setToastArgs({ title: 'Error Generating Quiz', description: (error as Error).message, variant: 'destructive' });
        setCurrentFlashcards([]);
      }
    });
  };
  
  const handleSaveGeneratedQuiz = () => {
    if (currentFlashcards.length === 0) {
      toast({ title: "No Quiz to Save", description: "Please generate a quiz first.", variant: "destructive" }); return;
    }
    const newQuiz: StoredQuiz = {
      id: Date.now().toString(),
      subjectId,
      name: quizName.trim(),
      flashcards: currentFlashcards,
      courseMaterialExtract: courseMaterial.substring(0, 100) + (courseMaterial.length > 100 ? '...' : ''),
      quizLengthUsed: quizLength,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const allQuizzesString = localStorage.getItem(getQuizzesStorageKey());
      const allQuizzes: StoredQuiz[] = allQuizzesString ? JSON.parse(allQuizzesString) : [];
      allQuizzes.push(newQuiz);
      localStorage.setItem(getQuizzesStorageKey(), JSON.stringify(allQuizzes));

      setStoredQuizzes(prev => [newQuiz, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setCurrentFlashcards([]);
      setCourseMaterial('');
      setQuizName('');
      setQuizLength(5);
      toast({ title: "Quiz Saved!", description: `Quiz "${newQuiz.name}" saved successfully for ${subjectName}.` });
    } catch (e) {
       console.error("Error saving quiz:", e);
       toast({ title: "Save Error", description: "Could not save the quiz.", variant: "destructive" });
    }
  };

  const handleFileRead = (content: string, fileName?: string) => { setCourseMaterial(content); }; 
  const handleTextSelection = (text: string, context: string) => { setSelectedText(text); setSelectedTextContext(context); };
  const handleContextMenuOpen = (x: number, y: number, context: string) => { if (selectedText) { setContextMenuPosition({ x, y }); setSelectedTextContext(context); setShowContextMenu(true); }};
  const handleCloseContextMenu = useCallback(() => { setShowContextMenu(false); }, []);

  const handleExplainSelectedText = () => {
    if (!selectedText) return;
    setShowContextMenu(false); setShowExplanationPopup(true); setExplanationData(null);
    startFetchingExplanationTransition(async () => {
      try {
        const result = await explainTermAction({ term: selectedText, context: selectedTextContext || undefined });
        setExplanationData(result);
      } catch (error) {
        setToastArgs({ title: 'Error Explaining Term', description: (error as Error).message, variant: 'destructive' });
        setShowExplanationPopup(false); 
      }
    });
  };
  
  const handleViewQuiz = (quiz: StoredQuiz) => {
    setViewingQuiz(quiz);
    setCurrentFlashcards(quiz.flashcards); 
    setCourseMaterial(''); 
    setQuizName('');
  };
  
  const handleDeleteQuiz = (quizId: string) => {
    const allQuizzesString = localStorage.getItem(getQuizzesStorageKey());
    if (allQuizzesString) {
        const allQuizzes: StoredQuiz[] = JSON.parse(allQuizzesString);
        const filteredQuizzes = allQuizzes.filter(q => !(q.id === quizId && q.subjectId === subjectId));
        localStorage.setItem(getQuizzesStorageKey(), JSON.stringify(filteredQuizzes));
        
        setStoredQuizzes(prev => prev.filter(q => q.id !== quizId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        if (viewingQuiz?.id === quizId) {
            setViewingQuiz(null);
            setCurrentFlashcards([]);
        }
        toast({ title: "Quiz Deleted", variant: "destructive" });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { handleCloseContextMenu(); if (showExplanationPopup) setShowExplanationPopup(false); }};
    if (showContextMenu || showExplanationPopup) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showContextMenu, showExplanationPopup, handleCloseContextMenu]);

  const displayFlashcards = viewingQuiz ? viewingQuiz.flashcards : currentFlashcards;
  const displayQuizName = viewingQuiz ? viewingQuiz.name : quizName;

  return (
    <div className="space-y-6" onMouseUpCapture={() => { if (!window.getSelection()?.toString().trim()) setSelectedText(null); }}> {/* Use capture phase */}
      {!viewingQuiz && currentFlashcards.length === 0 && (
        <Card className="shadow-neo-lg">
          <CardHeader>
            <div className="flex items-center gap-3"><HelpCircle className="h-8 w-8 text-primary" /><CardTitle className="text-2xl font-bold">Generate New Quiz for "{subjectName}"</CardTitle></div>
            <CardDescription>Input material, name your quiz, and set length.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload onFileRead={handleFileRead} aria-label="Upload course material file" />
            <div><Label htmlFor="courseMaterialTextQuiz" className="font-bold">Course Material (Paste)</Label><Textarea id="courseMaterialTextQuiz" placeholder="Paste material..." value={courseMaterial} onChange={(e) => setCourseMaterial(e.target.value)} rows={8} className="min-h-[150px]" aria-label="Course material for quiz"/></div>
            <div><Label htmlFor="quizNameInput" className="font-bold">Quiz Name</Label><Input id="quizNameInput" placeholder="e.g., Chapter 1 Review" value={quizName} onChange={(e) => setQuizName(e.target.value)} aria-label="Quiz name"/></div>
            <div><Label htmlFor="quizLengthInput" className="font-bold">Number of Flashcards (1-20)</Label><Input id="quizLengthInput" type="number" value={quizLength} onChange={(e) => setQuizLength(Math.max(1, Math.min(20, parseInt(e.target.value,10) || 1)))} min="1" max="20" aria-label="Number of flashcards"/></div>
          </CardContent>
          <CardFooter><Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || !courseMaterial.trim() || !quizName.trim()} aria-label="Generate new quiz from provided material">{isGeneratingQuiz ? <LoadingSpinner className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate Quiz</Button></CardFooter>
        </Card>
      )}

      {isGeneratingQuiz && <Card className="shadow-neo-md"><CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]"><LoadingSpinner size={48} /><p className="mt-4 text-muted-foreground">Generating quiz...</p></CardContent></Card>}

      {!isGeneratingQuiz && displayFlashcards.length > 0 && (
        <Card className="shadow-neo-lg">
          <CardHeader>
             <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">{viewingQuiz ? `Viewing Quiz: ${displayQuizName}` : `New Quiz Preview: ${displayQuizName}`} ({displayFlashcards.length} Cards)</CardTitle>
                {!viewingQuiz && currentFlashcards.length > 0 && (
                    <div className="flex gap-2">
                        <Button onClick={handleSaveGeneratedQuiz} className="bg-primary hover:bg-primary/90" aria-label="Save current quiz"><Save className="mr-2 h-4 w-4" /> Save This Quiz</Button>
                        <Button variant="outline" onClick={() => {setCurrentFlashcards([]); setCourseMaterial(''); setQuizName('');}} aria-label="Discard current quiz preview"><Trash2 className="mr-2 h-4 w-4" /> Discard Preview</Button>
                    </div>
                )}
                 {viewingQuiz && (
                    <Button variant="outline" onClick={() => {setViewingQuiz(null); setCurrentFlashcards([]);}} aria-label="Close quiz view and return to list/generation">
                        Close View
                    </Button>
                )}
            </div>
            <CardDescription>Click to flip. Highlight text & right-click for explanation.</CardDescription>
          </CardHeader>
          <CardContent><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{displayFlashcards.map((fc) => (<FlashcardComponent key={fc.id} flashcard={fc} onTextSelect={handleTextSelection} onContextMenuOpen={handleContextMenuOpen}/>))}</div></CardContent>
        </Card>
      )}

      {!isGeneratingQuiz && !viewingQuiz && currentFlashcards.length === 0 && storedQuizzes.length > 0 && (
         <Card className="shadow-neo-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Saved Quizzes for "{subjectName}" ({storedQuizzes.length})</CardTitle>
            <CardDescription>Select a quiz to view or delete.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {storedQuizzes.map(quiz => (
                <li key={quiz.id} className="p-4 border-2 border-border rounded-none hover:shadow-neo-md transition-shadow flex justify-between items-center bg-card shadow-neo-sm">
                  <div>
                    <h3 className="font-bold">{quiz.name} ({quiz.flashcards.length} cards)</h3>
                    <p className="text-xs text-muted-foreground">Created: {new Date(quiz.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => handleViewQuiz(quiz)} aria-label={`View quiz ${quiz.name}`}>
                        <Eye className="mr-1 h-4 w-4" /> View
                     </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" aria-label={`Delete quiz ${quiz.name}`}>
                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="shadow-neo-lg border-3 rounded-none">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-bold">Delete Quiz: {quiz.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete this quiz.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteQuiz(quiz.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
      {!isGeneratingQuiz && !viewingQuiz && currentFlashcards.length === 0 && storedQuizzes.length === 0 && (
            <Card className="shadow-neo-md">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No quizzes found for "{subjectName}". Generate a new quiz above.</p>
                </CardContent>
            </Card>
        )}


      {showContextMenu && selectedText && <CustomContextMenu x={contextMenuPosition.x} y={contextMenuPosition.y} onExplain={handleExplainSelectedText} onClose={handleCloseContextMenu} menuRef={contextMenuRef}/>}
      <Dialog open={showExplanationPopup} onOpenChange={setShowExplanationPopup}><DialogContent className="sm:max-w-lg border-3 border-border shadow-neo-lg rounded-none bg-card"><DialogHeader className="border-b-2 border-border pb-3"><DialogTitle className="font-bold">Explanation for: "{selectedText}"</DialogTitle><DialogDescription>AI-generated explanation.</DialogDescription></DialogHeader><div className="py-4 max-h-[60vh] overflow-y-auto">{isFetchingExplanation && <div className="flex justify-center items-center min-h-[100px]"><LoadingSpinner size={32}/> <span className="ml-2">Fetching...</span></div>}{explanationData && !isFetchingExplanation && (<div className="space-y-3 prose prose-sm sm:prose-base dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{explanationData.explanation}</ReactMarkdown>{explanationData.relatedLinks && explanationData.relatedLinks.length > 0 && (<div><h4 className="font-semibold mt-4 mb-2 text-base">Further Reading:</h4><ul className="list-disc pl-5 space-y-1">{explanationData.relatedLinks.map(link => (<li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">{link.title} <ExternalLink className="inline h-3 w-3 ml-1"/></a></li>))}</ul></div>)}</div>)}</div><DialogFooter><Button variant="outline" onClick={() => setShowExplanationPopup(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

