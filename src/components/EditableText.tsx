import React, { useState, useEffect, useRef } from 'react';

interface EditableTextProps {
  value: string;
  onChange?: (newValue: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'div' | 'li';
  inline?: boolean; // Pour texte inline sans bordure visible
}

/**
 * Composant texte éditable universel
 * Clic simple pour éditer n'importe quel texte
 */
export function EditableText({
  value,
  onChange,
  className = '',
  multiline = false,
  placeholder = '',
  as: Component = 'span',
  inline = false
}: EditableTextProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const newValue = e.currentTarget.textContent || '';
    setLocalValue(newValue);
    onChange?.(newValue);
    setIsEditing(false);
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      elementRef.current?.blur();
    }
  };

  const editableClassName = inline 
    ? `${className} outline-none cursor-text hover:bg-gray-100 rounded transition-colors`
    : `${className} outline-none focus:ring-1 focus:ring-gray-400 focus:ring-offset-1 rounded px-1 cursor-text hover:bg-gray-50 transition-colors`;

  return (
    <Component
      ref={elementRef as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      className={editableClassName}
      data-placeholder={placeholder}
      title="Cliquer pour éditer"
    >
      {localValue}
    </Component>
  );
}

/**
 * HOC pour rendre automatiquement éditable un texte simple
 */
export function makeEditable(text: string, onChange?: (newValue: string) => void, className?: string) {
  return (
    <EditableText
      value={text}
      onChange={onChange}
      className={className}
      inline
    />
  );
}
