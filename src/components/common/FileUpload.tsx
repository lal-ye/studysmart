'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type React from 'react';
import { useState, useTransition, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, X } from 'lucide-react';
import { extractTextFromPdfAction, extractTextFromPdfActionBYOK } from '@/lib/actions';
import LoadingSpinner from './LoadingSpinner';

interface FileUploadProps {
  onFileRead: (content: string, fileName?: string) => void;
  acceptedFileTypes?: string; // e.g., ".txt,.pdf"
  maxFileSizeMB?: number;
  apiKey?: string; // For BYOK PDF processing
}

export default function FileUpload({
  onFileRead,
  acceptedFileTypes = '.txt,.pdf',
  maxFileSizeMB = 10,
  apiKey,
}: FileUploadProps) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, startProcessingTransition] = useTransition();
  const [pdfCacheKey, setPdfCacheKey] = useState<string | null>(null);
  const [cachedFiles, setCachedFiles] = useState<
    { name: string; cacheKey: string }[]
  >([]);
  const [toastArgs, setToastArgs] = useState<{ title: string; description: string; variant?: 'default' | 'destructive' } | null>(null);


  useEffect(() => {
    const storedFiles = Object.entries(localStorage)
      .filter(([key]) => key.startsWith('pdf-cache-'))
      .map(([key, value]) => {
        const namePart = key.substring('pdf-cache-'.length, key.lastIndexOf('-')); 
        return { name: namePart || 'Unnamed PDF', cacheKey: key };
      });

    setCachedFiles(storedFiles);
  }, []);
  
  useEffect(() => {
    if (toastArgs) {
      toast(toastArgs);
      setToastArgs(null);
    }
  } , [toastArgs, toast]);

  const loadFileFromCache = useCallback((cacheKeyToLoad: string, nameOfFile: string) => {
      const cachedContent = localStorage.getItem(cacheKeyToLoad);
      if (cachedContent) {
        onFileRead(cachedContent, nameOfFile);
        setFileName(nameOfFile); 
        // No toast for cache loading
      } else {
        setToastArgs({
          title: "Cache Miss",
          description: `Could not find ${nameOfFile} in cache. Please upload again.`,
          variant: 'destructive'
        });
        setCachedFiles(prev => prev.filter(f => f.cacheKey !== cacheKeyToLoad));
      }
  }, [onFileRead]);


  useEffect(() => {
    if (pdfCacheKey && fileName) { 
      loadFileFromCache(pdfCacheKey, fileName);
    }
  }, [pdfCacheKey, fileName, loadFileFromCache]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setToastArgs({
          title: 'File too large',
          description: `Please upload a file smaller than ${maxFileSizeMB}MB.`,
          variant: 'destructive',
        });
        clearFile(event.target);
        return;
      }

      const currentFileName = file.name;
      setFileName(currentFileName); 
      const cacheKey = `pdf-cache-${currentFileName}-${file.size}`; 

      const cachedContent = localStorage.getItem(cacheKey);
      if (cachedContent) {
        setPdfCacheKey(cacheKey); 
        return; 
      }

      startProcessingTransition(async () => {
        if (file.type === 'text/plain') {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            onFileRead(text, currentFileName);
            setToastArgs({
              title: 'Text File Loaded',
              description: `${currentFileName} content has been loaded.`,
            });
          };
          reader.onerror = () => {
            setToastArgs({
              title: 'Error reading text file',
              description: 'Could not read the file content.',
              variant: 'destructive',
            });
            clearFile(event.target);
          };
          reader.readAsText(file);
        } else if (file.type === 'application/pdf') {
          const reader = new FileReader();
          reader.onload = async (e_reader) => {
            const pdfDataUri = e_reader.target?.result as string;
            try {
              const result = apiKey 
                ? await extractTextFromPdfActionBYOK({ pdfDataUri, apiKey })
                : await extractTextFromPdfAction({ pdfDataUri });
              onFileRead(result.extractedText, currentFileName);
              localStorage.setItem(cacheKey, result.extractedText); 
              setCachedFiles((prevFiles) => {
                if (!prevFiles.find(f => f.cacheKey === cacheKey)) {
                   return [...prevFiles, { name: currentFileName, cacheKey: cacheKey }];
                }
                return prevFiles;
              });
              setPdfCacheKey(cacheKey); 
              setToastArgs({
                title: 'PDF Processed & Cached',
                description: `Text extracted from ${currentFileName} and loaded. It is now cached.`,
              });
            } catch (pdfError) {
              console.error('Error processing PDF with GenAI:', pdfError);
              setToastArgs({
                title: 'Error Processing PDF',
                description:
                  pdfError instanceof Error
                    ? pdfError.message
                    : 'Could not extract text from the PDF using AI.',
                variant: 'destructive',
              });
              clearFile(event.target);
            }
          };
          reader.readAsDataURL(file);
        } else {
          setToastArgs({
            title: 'Unsupported File Type',
            description: `Files of type "${file.type}" are not supported. Please upload a .txt or .pdf file.`,
            variant: 'destructive',
          });
          clearFile(event.target);
        }
      });
    }
  };

  const clearFile = (inputElement: HTMLInputElement | null = null) => {
    const fileInput =
      inputElement || (document.getElementById('courseMaterialFile') as HTMLInputElement | null);
    if (fileInput) {
      fileInput.value = '';
    }
    setFileName(null);
    onFileRead(''); 
    setPdfCacheKey(null); 
  };

  const handleCachedFileSelect = (cacheKey: string, name: string) => {
    setFileName(name); 
    setPdfCacheKey(cacheKey); 
  };

  const handleRemoveCachedFile = (cacheKeyToRemove: string, name: string) => {
    localStorage.removeItem(cacheKeyToRemove);
    setCachedFiles((prevFiles) =>
      prevFiles.filter((file) => file.cacheKey !== cacheKeyToRemove)
    );
    if (pdfCacheKey === cacheKeyToRemove) {
      clearFile();
    }
    setToastArgs({
        title: "Cached File Removed",
        description: `Document "${name}" has been removed from the local cache.`
    })
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="courseMaterialFile" className="font-bold">Upload Course Material ({acceptedFileTypes})</Label>

      <div className="flex items-center gap-2">
        <Input
          id="courseMaterialFile"
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-2 file:border-border file:text-sm file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:shadow-neo-sm" // Added Neobrutalist file button styles
          disabled={isProcessing}
          aria-describedby="file-upload-description"
        />
        {fileName && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => clearFile()}
            aria-label="Clear selected file"
            disabled={isProcessing}
            className="text-muted-foreground hover:text-destructive shadow-none border-transparent active:shadow-none"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <p id="file-upload-description" className="text-xs text-muted-foreground">
        Supports .txt and .pdf files up to {maxFileSizeMB}MB. For other formats, please copy and paste
        the text content into the text area. PDF processing uses AI and may take a few moments.
        Uploaded PDFs are cached in your browser for faster access next time.
      </p>


      {fileName && !isProcessing && <p className="text-sm text-muted-foreground">Loaded: {fileName}</p>}
      {isProcessing && (
        <div className="flex items-center text-sm text-primary pt-1" role="status" aria-live="polite">
          <LoadingSpinner size={16} className="mr-2" />
          Processing {fileName ? `'${fileName}'` : 'file'}, please wait... This may take a moment for PDFs.
        </div>
      )}


      {cachedFiles.length > 0 && (
        <div className="pt-2">
          <Label className="text-sm font-bold">Cached Documents</Label>
          <ul className="mt-1 space-y-1.5 max-h-40 overflow-y-auto pr-2">
            {cachedFiles.map((file) => (
              <li key={file.cacheKey} className="flex items-center justify-between p-2.5 border-2 border-border rounded-none bg-muted/30 hover:bg-muted/50 transition-colors shadow-neo-sm">
                <button
                  onClick={() => handleCachedFileSelect(file.cacheKey, file.name)}
                  className="text-sm text-left flex-grow hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded-sm px-1 font-bold" // Added font-bold
                  disabled={isProcessing}
                  aria-label={`Load ${file.name} from cache`}
                >
                  <FileUp className="inline h-4 w-4 mr-2" /> {file.name}
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCachedFile(file.cacheKey, file.name)}
                    aria-label={`Remove ${file.name} from cache`}
                    disabled={isProcessing}
                    className="text-muted-foreground hover:text-destructive h-7 w-7 ml-2 shadow-none border-transparent active:shadow-none"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
