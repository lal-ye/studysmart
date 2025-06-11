'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Folders, PlusCircle, BookOpen, Trash2, ArrowRight } from "lucide-react";
import type { Subject } from '@/lib/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
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
} from "@/components/ui/alert-dialog"

const SUBJECTS_STORAGE_KEY = 'studySmartsSubjects';

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSubject, startCreatingSubjectTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedSubjects = localStorage.getItem(SUBJECTS_STORAGE_KEY);
      if (storedSubjects) {
        setSubjects(JSON.parse(storedSubjects));
      }
    } catch (error) {
      console.error("Failed to load subjects from localStorage:", error);
      toast({
        title: "Error Loading Subjects",
        description: "Could not load your subjects. LocalStorage might be corrupted or unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) {
      toast({ title: "Subject Name Required", description: "Please enter a name for your subject.", variant: "destructive" });
      return;
    }
    if (subjects.some(s => s.name.toLowerCase() === newSubjectName.trim().toLowerCase())) {
      toast({ title: "Subject Exists", description: `A subject named "${newSubjectName.trim()}" already exists.`, variant: "destructive" });
      return;
    }

    startCreatingSubjectTransition(() => {
      const newSubject: Subject = {
        id: Date.now().toString(), 
        name: newSubjectName.trim(),
        createdAt: new Date().toISOString(),
      };
      const updatedSubjects = [...subjects, newSubject];
      setSubjects(updatedSubjects);
      localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(updatedSubjects));
      setNewSubjectName('');
      toast({ title: "Subject Created!", description: `Subject "${newSubject.name}" has been added.` });
      router.push(`/subjects/${newSubject.id}`);
    });
  };
  
  const handleDeleteSubject = (subjectId: string, subjectName: string) => {
    const updatedSubjects = subjects.filter(s => s.id !== subjectId);
    setSubjects(updatedSubjects);
    localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(updatedSubjects));

    const allNotesString = localStorage.getItem('studySmartsNotes');
    if (allNotesString) {
      const allNotes = JSON.parse(allNotesString);
      const filteredNotes = allNotes.filter((note: any) => note.subjectId !== subjectId);
      localStorage.setItem('studySmartsNotes', JSON.stringify(filteredNotes));
    }
    const allQuizzesString = localStorage.getItem('studySmartsQuizzes');
    if (allQuizzesString) {
      const allQuizzes = JSON.parse(allQuizzesString);
      const filteredQuizzes = allQuizzes.filter((quiz: any) => quiz.subjectId !== subjectId);
      localStorage.setItem('studySmartsQuizzes', JSON.stringify(filteredQuizzes));
    }
    const examHistoryString = localStorage.getItem('studySmartsExamHistory');
    if (examHistoryString) {
        const examHistory = JSON.parse(examHistoryString);
        const filteredExamHistory = examHistory.filter((attempt: any) => attempt.subjectId !== subjectId);
        localStorage.setItem('studySmartsExamHistory', JSON.stringify(filteredExamHistory));
    }

    toast({ title: "Subject Deleted", description: `Subject "${subjectName}" and its associated content have been removed.`, variant: "destructive" });
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <LoadingSpinner size={48} />
        <p className="ml-4 text-lg">Loading subjects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-neo-lg"> {/* Applied Neobrutalist shadow */}
        <CardHeader>
          <div className="flex items-center gap-4">
            <Folders className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Your Subjects</CardTitle>
              <CardDescription className="text-lg">
                Organize your study materials by subject. Create a new subject or select an existing one to get started.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="newSubjectName" className="text-base font-bold">Create New Subject</Label> {/* Added font-bold */}
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="newSubjectName"
                placeholder="e.g., Quantum Physics, Art History" // Updated placeholder
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="flex-grow"
                aria-label="Enter name for new subject"
              />
              <Button onClick={handleCreateSubject} disabled={isCreatingSubject} aria-label="Create new subject">
                {isCreatingSubject ? <LoadingSpinner className="mr-2" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((subject) => (
            <Card key={subject.id} className="shadow-neo-md hover:shadow-neo-lg transition-all duration-150 ease-out flex flex-col hover:-translate-x-0.5 hover:-translate-y-0.5"> {/* Applied shadow and hover effect */}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{subject.name}</CardTitle>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive -mt-2 -mr-2 shadow-none border-transparent active:shadow-none" aria-label={`Delete subject ${subject.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="shadow-neo-lg border-3"> {/* Neobrutalist dialog */}
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-bold">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will permanently delete the subject "{subject.name}" and all its associated notes, quizzes, and exams. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSubject(subject.id, subject.name)} className="bg-destructive hover:bg-destructive/90">
                          Delete Subject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardDescription>
                  Created on: {new Date(subject.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">Manage notes, quizzes, and exams for this subject.</p>
              </CardContent>
              <CardFooter>
                <Link href={`/subjects/${subject.id}`} passHref className="w-full">
                  <Button variant="outline" className="w-full">
                    Open Subject <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        !isLoading && (
          <Card className="shadow-neo-md"> {/* Applied shadow */}
            <CardContent className="p-10 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">No subjects yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first subject above to start organizing your study materials!</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
