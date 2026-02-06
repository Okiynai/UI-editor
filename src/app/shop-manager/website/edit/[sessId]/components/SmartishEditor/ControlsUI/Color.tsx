import { useState, useRef, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import { useSmartPosition } from './Utils/useSmartPosition';
import { Tabbed } from './Utils/Tabbed';
import { OSDLSiteLibrary } from '../types';

export const ColorPickerWithPreview = ({ 
  color, 
  onChange, 
  onChangeThrottled,
  library,
  libraryData 
}: { 
  color: string; 
  onChange: (color: string) => void; 
  onChangeThrottled?: (color: string) => void;
  library?: OSDLSiteLibrary;
  libraryData?: any;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const { style, calculatePosition } = useSmartPosition(buttonRef, pickerRef, {
    preferredPosition: 'bottom-right',
    fallbackPositions: ['bottom-left', 'top-right', 'top-left'],
    margin: 8,
    isVisible: showPicker,
    estimatedWidth: 227, // ChromePicker default width
    estimatedHeight: 284, // ChromePicker default height
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current?.contains(event.target as Node) ||
        pickerRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setShowPicker(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorChange = (colorResult: any) => {
    const hex = colorResult.hex;
    onChange(hex); // always update local immediately
    if (onChangeThrottled) {
      onChangeThrottled(hex);
    }
  };

  // Track drag state to improve perceived responsiveness
  useEffect(() => {
    const onMouseUp = () => { isDraggingRef.current = false; };
    const onMouseDown = () => { isDraggingRef.current = true; };
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  return (
    <div className="relative w-fit">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex items-center gap-2 px-2 h-8 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
        onClick={() => {
          if (!showPicker) {
            // Pre-calculate position before opening to prevent jump
            calculatePosition();
          }
          setShowPicker(!showPicker);
        }}
        aria-label="Select color"
      >
        <span
          className="block w-6 h-6 rounded-full ring-1 ring-gray-200 shadow-inner"
          style={{ backgroundColor: color }}
        />
        <span className="block w-px h-5 bg-gray-200" />
        <span className="text-[11px] font-mono tracking-tight text-gray-800 max-w-[9rem] truncate">
          {typeof color === 'string' ? color.toUpperCase() : ''}
        </span>
      </button>

      {showPicker && (
        <div 
          ref={pickerRef}
          style={style}
          className="absolute z-50"
        >
          <Tabbed library={library} libraryData={libraryData} updateLocal={onChange} updateIframe={onChangeThrottled}>
            <div className={`w-[225px] h-[242px] 
            [&_.chrome-picker]:!shadow-none 
            [&_.chrome-picker]:!bg-transparent 
            ${libraryData == null ? 
            '[&_.chrome-picker>*:first-child]:!rounded-t-lg' : 
            '[&_.chrome-picker>*:first-child]:!rounded-none'}`}>
              <ChromePicker
                color={color}
                onChange={handleColorChange}
                disableAlpha={false}
              />
            </div>
          </Tabbed>
        </div>
      )}
    </div>
  );
};
