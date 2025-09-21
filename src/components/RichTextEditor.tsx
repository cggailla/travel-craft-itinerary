import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Palette,
  Undo,
  Redo
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Tapez votre texte...",
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleFocus = () => {
    setIsToolbarVisible(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding to allow toolbar interactions
    setTimeout(() => {
      if (!e.currentTarget.contains(document.activeElement)) {
        setIsToolbarVisible(false);
      }
    }, 200);
  };

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
    '#FF0000', '#FF6600', '#FFCC00', '#00FF00', '#0066FF',
    '#6600FF', '#FF0066', '#8B4513', '#228B22', '#4B0082'
  ];

  const fontSizes = [
    { label: 'Petit', value: '12px' },
    { label: 'Normal', value: '14px' },
    { label: 'Moyen', value: '16px' },
    { label: 'Grand', value: '18px' },
    { label: 'Très grand', value: '24px' }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar */}
      {isToolbarVisible && (
        <div className="absolute -top-14 left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 items-center animate-fade-in">
          {/* Format buttons */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('bold')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('italic')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('underline')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Underline className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Alignment buttons */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('justifyLeft')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('justifyCenter')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('justifyRight')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* List buttons */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('insertUnorderedList')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('insertOrderedList')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Font size */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-gray-100">
                <Type className="h-4 w-4 mr-1" />
                Aa
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2">
              <div className="space-y-1">
                {fontSizes.map((size) => (
                  <Button
                    key={size.value}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCommand('fontSize', size.value.replace('px', ''))}
                    className="w-full justify-start h-8"
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="grid grid-cols-5 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleCommand('foreColor', color)}
                    className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Undo/Redo */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('undo')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCommand('redo')}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={updateContent}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          w-full min-h-[100px] p-4 border-2 border-dashed border-primary/30 
          rounded-lg bg-white/80 backdrop-blur-sm 
          focus:outline-none focus:border-primary/60 focus:bg-white
          transition-all duration-200
          ${content ? '' : 'text-gray-400'}
        `}
        style={{ 
          lineHeight: '1.6',
          wordBreak: 'break-word'
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            font-style: italic;
          }
          [contenteditable]:focus:before {
            content: none;
          }
        `
      }} />
    </div>
  );
}