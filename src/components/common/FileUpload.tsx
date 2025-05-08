'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { FileUp, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// This import is crucial for Webpack to correctly bundle and make the worker available.
import 'pdfjs-dist/build/pdf.worker.entry';

interface FileUploadProps {
  onFileRead: (content: string) => void;
  acceptedFileTypes?: string; // e.g., ".txt,.pdf"
  maxFileSizeMB?: number;
}

export default function FileUpload({ 
  onFileRead, 
  acceptedFileTypes = ".txt,.pdf", 
  maxFileSizeMB = 10 // Increased max size for PDFs
}: FileUploadProps) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      setIsProcessing(true);

      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          onFileRead(text);
          setFileName(file.name);
          toast({
            title: 'File Loaded',
            description: `${file.name} content has been loaded.`,
          });
          setIsProcessing(false);
        };
        reader.onerror = () => {
          toast({
            title: 'Error reading file',
            description: 'Could not read the file content.',
            variant: 'destructive',
          });
          clearFile(event.target);
          setIsProcessing(false);
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (e_reader) => {
          const typedArray = new Uint8Array(e_reader.target?.result as ArrayBuffer);
          try {
            const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              // Ensure item.str is defined before joining
              fullText += textContent.items.map((item: any) => item.str || '').join(' ') + '\n';
            }
            onFileRead(fullText);
            setFileName(file.name);
            toast({
              title: 'PDF Loaded',
              description: `${file.name} content has been extracted and loaded.`,
            });
          } catch (pdfError) {
            console.error('Error processing PDF:', pdfError);
            toast({
              title: 'Error processing PDF',
              description: 'Could not extract text from the PDF. It might be image-based, protected, or use a complex format.',
              variant: 'destructive',
            });
            clearFile(event.target);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.onerror = () => {
          toast({
            title: 'Error reading file',
            description: 'Could not read the PDF file.',
            variant: 'destructive',
          });
          clearFile(event.target);
          setIsProcessing(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        toast({
          title: 'Unsupported File Type',
          description: `Files of type "${file.type}" are not supported. Please upload a .txt or .pdf file, or paste content directly.`,
          variant: 'destructive',
        });
        clearFile(event.target);
        setIsProcessing(false);
      }
    }
  };

  const clearFile = (inputElement: HTMLInputElement | null = null) => {
    const fileInput = inputElement || document.getElementById('courseMaterialFile') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = "";
    }
    setFileName(null);
    onFileRead(""); // Clear the content in the parent component
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="courseMaterialFile">Upload Course Material ({acceptedFileTypes})</Label>
      <div className="flex items-center gap-2">
        <Input
          id="courseMaterialFile"
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          className="flex-grow"
          disabled={isProcessing}
        />
        {fileName && (
          <Button variant="ghost" size="icon" onClick={() => clearFile()} aria-label="Clear file" disabled={isProcessing}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {fileName && <p className="text-sm text-muted-foreground">Loaded: {fileName}</p>}
      {isProcessing && <p className="text-sm text-primary">Processing file, please wait...</p>}
       <p className="text-xs text-muted-foreground">
        Supports .txt and .pdf files up to {maxFileSizeMB}MB. For other formats, please copy and paste the text content into the text area below.
      </p>
    </div>
  );
}
