
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type React from 'react';
import { useState, useTransition, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, X } from 'lucide-react';
import { extractTextFromPdfAction } from '@/lib/actions';
import LoadingSpinner from './LoadingSpinner';

interface FileUploadProps {
  onFileRead: (content: string, fileName?: string) => void;
  acceptedFileTypes?: string; // e.g., ".txt,.pdf"
  maxFileSizeMB?: number;
}

export default function FileUpload({
  onFileRead,
  acceptedFileTypes = '.txt,.pdf',
  maxFileSizeMB = 10,
}: FileUploadProps) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, startProcessingTransition] = useTransition();
  const [pdfCacheKey, setPdfCacheKey] = useState<string | null>(null);
  const [cachedFiles, setCachedFiles] = useState<
    { name: string; cacheKey: string }[]
  >([]);

  // Load cached files from local storage on component mount
  useEffect(() => {
    const storedFiles = Object.entries(localStorage)
      .filter(([key]) => key.startsWith('pdf-cache-'))
      .map(([key, value]) => {
        const namePart = key.substring('pdf-cache-'.length, key.lastIndexOf('-')); // Extract name
        return { name: namePart || 'Unnamed PDF', cacheKey: key };
      });

    setCachedFiles(storedFiles);
  }, []);

  useEffect(() => {
    if (pdfCacheKey) {
      const cachedContent = localStorage.getItem(pdfCacheKey);
      if (cachedContent) {
        onFileRead(cachedContent, fileName || 'Cached PDF');
        // Toast notification for loading from cache removed as per user request.
      }
    }
  }, [pdfCacheKey, fileName, onFileRead]);

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

      setFileName(file.name);
      const cacheKey = `pdf-cache-${file.name}-${file.size}`; // Include size in key

      // Check if content is already cached
      const cachedContent = localStorage.getItem(cacheKey);
      if (cachedContent) {
        setPdfCacheKey(cacheKey); // Activate the cache loading useEffect
        return; // Exit early as content will be loaded from cache in useEffect
      }

      startProcessingTransition(async () => {
        if (file.type === 'text/plain') {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            onFileRead(text, file.name);
            toast({
              title: 'Text File Loaded',
              description: `${file.name} content has been loaded.`,
            });
          };
          reader.onerror = () => {
            toast({
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
              const result = await extractTextFromPdfAction({ pdfDataUri });
              onFileRead(result.extractedText, file.name);
              localStorage.setItem(cacheKey, result.extractedText); // Cache the content
              setCachedFiles((prevFiles) => {
                // Avoid duplicates if somehow already present
                if (!prevFiles.find(f => f.cacheKey === cacheKey)) {
                   return [...prevFiles, { name: file.name, cacheKey: cacheKey }];
                }
                return prevFiles;
              });
              setPdfCacheKey(cacheKey); // Activate the cache loading useEffect
              toast({
                title: 'PDF Processed',
                description: `Text extracted from ${file.name} and loaded. It is now cached for faster access.`,
              });
            } catch (pdfError) {
              console.error('Error processing PDF with GenAI:', pdfError);
              toast({
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
          toast({
            title: 'Unsupported File Type',
            description: `Files of type "${file.type}" are not supported. Please upload a .txt or .pdf file, or paste content directly.`,
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
    onFileRead(''); // Clear parent component's state
    setPdfCacheKey(null); // Clear cache key when file is cleared
  };

  const handleCachedFileSelect = (cacheKey: string, name: string) => {
    setFileName(name);
    setPdfCacheKey(cacheKey); // This will trigger the useEffect to load from cache
  };

  const handleRemoveCachedFile = (cacheKeyToRemove: string) => {
    localStorage.removeItem(cacheKeyToRemove);
    setCachedFiles((prevFiles) =>
      prevFiles.filter((file) => file.cacheKey !== cacheKeyToRemove)
    );
    // If the removed file was the currently loaded one, clear it
    if (pdfCacheKey === cacheKeyToRemove) {
      clearFile();
    }
    toast({
        title: "Cached File Removed",
        description: "The selected document has been removed from the local cache."
    })
  };

  return (
    <div className="space-y-3">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => clearFile()}
            aria-label="Clear file"
            disabled={isProcessing}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {fileName && !isProcessing && <p className="text-sm text-muted-foreground">Loaded: {fileName}</p>}
      {isProcessing && (
        <div className="flex items-center text-sm text-primary pt-1">
          <LoadingSpinner size={16} className="mr-2" />
          Processing {fileName ? `'${fileName}'` : 'file'}, please wait... This may take a moment for PDFs.
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Supports .txt and .pdf files up to {maxFileSizeMB}MB. For other formats, please copy and paste
        the text content into the text area below. PDF processing uses AI and may take a few moments.
        Uploaded PDFs are cached in your browser for faster access next time.
      </p>

      {cachedFiles.length > 0 && (
        <div className="pt-2">
          <Label className="text-sm font-medium">Cached Documents</Label>
          <ul className="mt-1 space-y-1.5 max-h-40 overflow-y-auto pr-2">
            {cachedFiles.map((file) => (
              <li key={file.cacheKey} className="flex items-center justify-between p-2.5 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <button
                  onClick={() => handleCachedFileSelect(file.cacheKey, file.name)}
                  className="text-sm text-left flex-grow hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded-sm px-1"
                  disabled={isProcessing}
                  title={`Load ${file.name}`}
                >
                  {file.name}
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCachedFile(file.cacheKey)}
                    aria-label={`Remove ${file.name} from cache`}
                    disabled={isProcessing}
                    className="text-muted-foreground hover:text-destructive h-7 w-7 ml-2"
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

