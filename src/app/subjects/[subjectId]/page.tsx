'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, ListChecks, ClipboardEdit, AlertTriangle, FolderOpen } from 'lucide-react';
import type { Subject } from '@/lib/actions'; // Removed StoredNote, StoredQuiz, StoredExamAttempt as they are managed by child components
import LoadingSpinner from '@/components/common/LoadingSpinner';
import NotesManager from './_components/NotesManager';
import QuizzesManager from './_components/QuizzesManager';
import ExamsManager from './_components/ExamsManager';
import { useToast } from '@/hooks/use-toast';


const SUBJECTS_STORAGE_KEY = 'studySmartsSubjects';

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("notes");


  useEffect(() => {
    if (!subjectId) {
      router.push('/'); 
      return;
    }
    setIsLoading(true);
    try {
      const storedSubjects = localStorage.getItem(SUBJECTS_STORAGE_KEY);
      if (storedSubjects) {
        const subjectsArray: Subject[] = JSON.parse(storedSubjects);
        const currentSubject = subjectsArray.find(s => s.id === subjectId);
        if (currentSubject) {
          setSubject(currentSubject);
        } else {
          toast({ title: "Subject Not Found", description: "The requested subject could not be found.", variant: "destructive" });
          router.push('/');
        }
      } else {
         toast({ title: "No Subjects Found", description: "It seems there are no subjects stored.", variant: "destructive" });
         router.push('/');
      }
    } catch (error) {
      console.error("Error loading subject:", error);
      toast({ title: "Error", description: "Failed to load subject details.", variant: "destructive" });
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <LoadingSpinner size={48} />
        <p className="ml-4 text-lg">Loading subject details...</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <Card className="shadow-neo-lg"> {/* Applied shadow */}
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Subject Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">The subject you are looking for does not exist or could not be loaded.</p>
          <Button onClick={() => router.push('/')} className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-neo-lg"> {/* Applied shadow */}
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <FolderOpen className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle className="text-2xl font-bold">{subject.name}</CardTitle>
                    <CardDescription>Manage notes, quizzes, and exams for this subject.</CardDescription>
                </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/')} aria-label="Back to dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border-2 border-border shadow-neo-sm"> {/* Neobrutalist TabsList */}
          <TabsTrigger value="notes" aria-controls="notes-panel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-neo-sm rounded-sm">
            <BookOpen className="mr-2 h-4 w-4" /> Notes
          </TabsTrigger>
          <TabsTrigger value="quizzes" aria-controls="quizzes-panel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-neo-sm rounded-sm">
            <ListChecks className="mr-2 h-4 w-4" /> Quizzes
          </TabsTrigger>
          <TabsTrigger value="exams" aria-controls="exams-panel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-neo-sm rounded-sm">
            <ClipboardEdit className="mr-2 h-4 w-4" /> Exams
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="notes" id="notes-panel" role="tabpanel" className="mt-6">
          <NotesManager subjectId={subject.id} subjectName={subject.name} />
        </TabsContent>
        <TabsContent value="quizzes" id="quizzes-panel" role="tabpanel" className="mt-6">
          <QuizzesManager subjectId={subject.id} subjectName={subject.name} />
        </TabsContent>
        <TabsContent value="exams" id="exams-panel" role="tabpanel" className="mt-6">
          <ExamsManager subjectId={subject.id} subjectName={subject.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
