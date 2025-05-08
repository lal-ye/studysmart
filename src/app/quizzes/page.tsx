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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { generateQuizAction, explainTermAction, type Flashcard, type ExplainTermInput, type ExplainTermOutput } from '@/lib/actions';
import FileUpload from '@/components/common/FileUpload';
import { HelpCircle, Sparkles, Tags, CheckCircle, AlertTriangle, RotateCcw, BookOpenText, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

  const adjustHeight = useCallback(() => {
    if (cardInnerRef.current && frontFaceRef.current && backFaceRef.current) {
      const frontHeight = frontFaceRef.current.scrollHeight;
      const backHeight = backFaceRef.current.scrollHeight;
      cardInnerRef.current.style.height = `${Math.max(frontHeight, backHeight, 150)}px`; // Min height 150px
    }
  }, []);

  useEffect(() => {
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [flashcard, isFlipped, adjustHeight]);
  
  // Adjust height when content changes (e.g. card flips)
  useEffect(() => {
    adjustHeight();
  }, [isFlipped, adjustHeight]);

  const handleMouseUpCapture = (contextText: string) => (event: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      onTextSelect(selection, contextText);
    }
  };

  const handleContextMenuCapture = (contextText: string) => (event: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      event.preventDefault();
      onContextMenuOpen(event.clientX, event.clientY, contextText);
    }
    // Allow default context menu if no text is selected
  };


  const cardStyle: CSSProperties = {
    width: '100%',
    minHeight: '150px', // Minimum height for the card container
    perspective: '1000px',
  };

  const cardInnerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%', // This will be dynamically set by adjustHeight
    textAlign: 'initial',
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
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)', // rounded-lg from globals.css
    boxSizing: 'border-box', 
    overflowY: 'auto',
  };

  const frontStyle: CSSProperties = {
    ...faceStyle,
    background: 'hsl(var(--card))',
    color: 'hsl(var(--card-foreground))',
    zIndex: 2, 
  };

  const backStyle: CSSProperties = {
    ...faceStyle,
    background: 'hsl(var(--secondary))', 
    color: 'hsl(var(--secondary-foreground))',
    transform: 'rotateY(180deg)',
  };

  return (
    <div 
      className="w-full cursor-pointer"
      style={cardStyle}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div ref={cardInnerRef} style={cardInnerStyle}>
        {/* Front of the card */}
        <div ref={frontFaceRef} style={frontStyle} 
            onMouseUpCapture={handleMouseUpCapture(flashcard.question)}
            onContextMenuCapture={handleContextMenuCapture(flashcard.question)}
        >
          <div>
            <p className="text-xs text-muted-foreground mb-1">ID: {flashcard.id}</p>
            <h3 className="text-lg font-semibold mt-1 mb-3 break-words select-text">
              {flashcard.question}
            </h3>
          </div>
          <div className="flex justify-between items-center mt-auto pt-2">
            <Badge className={cn(difficultyColors[flashcard.difficulty], "text-xs")}>{flashcard.difficulty}</Badge>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Back of the card */}
        <div ref={backFaceRef} style={backStyle}
            onMouseUpCapture={handleMouseUpCapture(flashcard.answer)}
            onContextMenuCapture={handleContextMenuCapture(flashcard.answer)}
        >
          <div>
            <h4 className="text-md font-semibold mb-2">Answer:</h4>
            <p className="text-sm leading-relaxed break-words select-text">
              {flashcard.answer}
            </p>
          </div>
          {flashcard.tags && flashcard.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-auto pt-2">
              <Tags className="h-3 w-3 self-center" />
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

interface CustomContextMenuProps {
  x: number;
  y: number;
  onExplain: () => void;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
}

function CustomContextMenu({ x, y, onExplain, onClose, menuRef }: CustomContextMenuProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, menuRef]);

  return (
    <div
      ref={menuRef}
      style={{ top: y, left: x, position: 'fixed', zIndex: 1000 }}
      className="bg-popover border border-border rounded-md shadow-lg p-1 min-w-[180px]"
    >
      <Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm h-auto" onClick={onExplain}>
        <BookOpenText className="mr-2 h-4 w-4" /> Explain Selection
      </Button>
    </div>
  );
}


export default function QuizzesPage() {
  const [courseMaterial, setCourseMaterial] = useState('');
  const [quizLength, setQuizLength] = useState(5);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);
  const [isGeneratingQuiz, startGeneratingQuizTransition] = useTransition();
  const { toast } = useToast();

  // State for "Explain Term" feature
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectedTextContext, setSelectedTextContext] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [explanationData, setExplanationData] = useState<ExplainTermOutput | null>(null);
  const [isFetchingExplanation, startFetchingExplanationTransition] = useTransition();
  const [showExplanationPopup, setShowExplanationPopup] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);


  const handleGenerateQuiz = () => {
    if (!courseMaterial.trim()) {
      toast({ title: 'Input Required', description: 'Please provide course material.', variant: 'destructive', icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }
    if (quizLength < 1 || quizLength > 20) {
      toast({ title: 'Invalid Quiz Length', description: 'Length must be 1-20.', variant: 'destructive', icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }

    startGeneratingQuizTransition(async () => {
      setGeneratedFlashcards([]);
      setShowContextMenu(false); // Close context menu if open
      try {
        const flashcards = await generateQuizAction({ courseMaterial, quizLength });
        if (flashcards.length === 0) {
            toast({ title: 'No Flashcards Generated', description: 'The AI returned no flashcards. Try different material or quiz length.', variant: 'default' });
        } else {
            toast({ title: 'Quiz Generated!', description: `Your ${flashcards.length} flashcards are ready.`, icon: <CheckCircle className="h-5 w-5" /> });
        }
        setGeneratedFlashcards(flashcards);
      } catch (error) {
        toast({ title: 'Error Generating Quiz', description: (error as Error).message, variant: 'destructive', icon: <AlertTriangle className="h-5 w-5" /> });
        setGeneratedFlashcards([]);
      }
    });
  };

  const handleFileRead = (content: string) => {
    setCourseMaterial(content);
  };

  const handleTextSelection = (text: string, context: string) => {
    setSelectedText(text);
    setSelectedTextContext(context);
  };

  const handleContextMenuOpen = (x: number, y: number, context: string) => {
    if (selectedText) { // Only open if there's a selection from mouseUp
      setContextMenuPosition({ x, y });
      setSelectedTextContext(context); // Ensure context is set from the element that triggered
      setShowContextMenu(true);
    }
  };
  
  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
    // Optionally clear selectedText if context menu is closed without action
    // setSelectedText(null); 
  }, []);

  const handleExplainSelectedText = () => {
    if (!selectedText) return;
    setShowContextMenu(false);
    setShowExplanationPopup(true);
    setExplanationData(null);

    startFetchingExplanationTransition(async () => {
      try {
        const input: ExplainTermInput = { term: selectedText, context: selectedTextContext || undefined };
        const result = await explainTermAction(input);
        setExplanationData(result);
      } catch (error) {
        toast({ title: 'Error Explaining Term', description: (error as Error).message, variant: 'destructive' });
        setShowExplanationPopup(false); // Close popup on error
      }
    });
  };

  // Close context menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseContextMenu();
      }
    };
    if (showContextMenu) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContextMenu, handleCloseContextMenu]);


  return (
    <div className="space-y-6" onMouseUp={() => {
        // If no specific text element handled mouseUp to set selectedText, clear it.
        // This helps prevent context menu from showing with stale selectedText.
        const currentSelection = window.getSelection()?.toString().trim();
        if (!currentSelection) {
            setSelectedText(null);
        }
    }}>
      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Flashcard Quiz Generation</CardTitle>
              <CardDescription>
                Generate flashcards from course material. Highlight text on a card and right-click to get an AI explanation.
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
          <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || !courseMaterial.trim()}>
            {isGeneratingQuiz ? <LoadingSpinner className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Flashcards
          </Button>
        </CardFooter>
      </Card>

      {isGeneratingQuiz && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-muted-foreground">Generating your flashcards, please wait...</p>
          </CardContent>
        </Card>
      )}

      {!isGeneratingQuiz && generatedFlashcards.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Generated Flashcards ({generatedFlashcards.length})</CardTitle>
            <CardDescription>Click to flip. Highlight text & right-click for explanation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedFlashcards.map((fc) => (
                 <FlashcardComponent 
                    key={fc.id} 
                    flashcard={fc} 
                    onTextSelect={handleTextSelection}
                    onContextMenuOpen={handleContextMenuOpen}
                  />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isGeneratingQuiz && generatedFlashcards.length === 0 && courseMaterial.trim() && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No flashcards were generated. Try adjusting the material or quiz length.</p>
          </CardContent>
        </Card>
      )}

      {showContextMenu && selectedText && (
        <CustomContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          onExplain={handleExplainSelectedText}
          onClose={handleCloseContextMenu}
          menuRef={contextMenuRef}
        />
      )}

      <Dialog open={showExplanationPopup} onOpenChange={setShowExplanationPopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Explanation for: "{selectedText}"</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {isFetchingExplanation && <div className="flex justify-center items-center min-h-[100px]"><LoadingSpinner size={32}/></div>}
            {explanationData && !isFetchingExplanation && (
              <div className="space-y-3 prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {explanationData.explanation}
                </ReactMarkdown>
                {explanationData.relatedLinks && explanationData.relatedLinks.length > 0 && (
                  <div>
                    <h4 className="font-semibold mt-4 mb-2 text-base">Further Reading:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {explanationData.relatedLinks.map(link => (
                        <li key={link.url}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {link.title} <ExternalLink className="inline h-3 w-3 ml-1" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowExplanationPopup(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}