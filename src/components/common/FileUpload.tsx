'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type React from 'react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { FileUp, X } from 'lucide-react';

interface FileUploadProps {
  onFileRead: (content: string) => void;
  acceptedFileTypes?: string; // e.g., ".txt,.pdf"
  maxFileSizeMB?: number;
}

export default function FileUpload({ 
  onFileRead, 
  acceptedFileTypes = ".txt", 
  maxFileSizeMB = 5 
}: FileUploadProps) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `Please upload a file smaller than ${maxFileSizeMB}MB.`,
          variant: 'destructive',
        });
        clearFile(event.target);
        return;
      }

      // For simplicity, we'll only handle .txt files client-side.
      // PDF processing would require a library or server-side handling.
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          onFileRead(text);
          setFileName(file.name);
          toast({
            title: 'File Loaded',
            description: `${file.name} content has been loaded into the text area.`,
          });
        };
        reader.onerror = () => {
          toast({
            title: 'Error reading file',
            description: 'Could not read the file content.',
            variant: 'destructive',
          });
          clearFile(event.target);
        };
        reader.readAsText(file);
      } else {
        toast({
          title: 'Unsupported File Type',
          description: 'Currently, only .txt files can be processed directly. Please paste content for other types.',
          variant: 'destructive',
        });
        clearFile(event.target);
      }
    }
  };

  const clearFile = (inputElement: HTMLInputElement | null = null) => {
    if (inputElement || document.getElementById('courseMaterialFile')) {
      (inputElement || document.getElementById('courseMaterialFile') as HTMLInputElement).value = "";
    }
    setFileName(null);
    // Optionally, you might want to clear the textarea as well by calling onFileRead("").
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="courseMaterialFile">Upload Course Material (Optional, .txt only)</Label>
      <div className="flex items-center gap-2">
        <Input
          id="courseMaterialFile"
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          className="flex-grow"
        />
        {fileName && (
          <Button variant="ghost" size="icon" onClick={() => clearFile()} aria-label="Clear file">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {fileName && <p className="text-sm text-muted-foreground">Loaded: {fileName}</p>}
       <p className="text-xs text-muted-foreground">
        For PDF or other formats, please copy and paste the text content into the text area below.
      </p>
    </div>
  );
}
