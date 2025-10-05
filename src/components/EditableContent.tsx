import React, { useState, useEffect } from 'react';

interface EditableContentProps {
  children: React.ReactNode;
  onContentChange?: (newContent: string) => void;
  className?: string;
}

/**
 * Composant wrapper qui rend tout son contenu HTML éditable
 * Utile pour des sections complexes avec beaucoup de texte
 */
export function EditableContent({
  children,
  onContentChange,
  className = ''
}: EditableContentProps) {
  const [content, setContent] = useState<string>('');
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && !content) {
      setContent(contentRef.current.innerHTML);
    }
  }, [children]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    setContent(newContent);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    onContentChange?.(newContent);
  };

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      className={`${className} outline-none cursor-text`}
      title="Cliquer pour éditer le contenu"
      style={{
        minHeight: '20px'
      }}
    >
      {children}
    </div>
  );
}
