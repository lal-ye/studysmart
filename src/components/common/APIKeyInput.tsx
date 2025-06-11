
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

interface APIKeyInputProps {
  onApiKeyChange: (apiKey: string) => void;
  apiKey: string;
  label?: string;
  description?: string;
}

export function APIKeyInput({ onApiKeyChange, apiKey, label = "Google AI API Key", description = "Enter your Google AI API key to use your own quota" }: APIKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="api-key" className="text-sm">API Key</Label>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              id="api-key"
              type={showKey ? "text" : "password"}
              placeholder="Enter your Google AI API key..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {apiKey && (
          <p className="text-xs text-green-600">✓ API key provided</p>
        )}
      </CardContent>
    </Card>
  );
}
