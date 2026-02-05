import React, { useRef, useState } from 'react';

type UploadResult = {
  url: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
};

type UploadContent = {
  uploadIcon?: (args: { isDragActive: boolean; isUploading: boolean }) => React.ReactNode;
  label?: React.ReactNode;
  allowedContent?: React.ReactNode;
  button?: React.ReactNode;
};

type UploadAppearance = {
  container?: string;
  uploadIcon?: string;
  label?: string;
  allowedContent?: string;
  button?: string;
};

type UploadDropZoneProps = {
  endpoint?: string;
  config?: unknown;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  isUploadingExternal?: boolean;
  content?: UploadContent;
  appearance?: UploadAppearance;
  onClientUploadComplete?: (files: UploadResult[]) => void | Promise<void>;
  onUploadError?: (error: Error) => void;
  onUploadBegin?: () => void;
  onDrop?: (files: File[]) => void;
};

const readImageDimensions = (url: string) =>
  new Promise<{ width?: number; height?: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => resolve({});
    image.src = url;
  });

const fileToUrl = (file: File) =>
  new Promise<{ url: string }>((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string });
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    resolve({ url: objectUrl });
  });

export const UploadDropZone: React.FC<UploadDropZoneProps> = ({
  accept,
  multiple = false,
  disabled = false,
  className = '',
  isUploadingExternal = false,
  content,
  appearance,
  onClientUploadComplete,
  onUploadError,
  onUploadBegin,
  onDrop,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mergedUploading = isUploadingExternal || isUploading;

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    onDrop?.(files);
    try {
      onUploadBegin?.();
      setIsUploading(true);

      const results: UploadResult[] = [];
      for (const file of files) {
        const { url } = await fileToUrl(file);
        const dimensions = file.type.startsWith('image/') ? await readImageDimensions(url) : {};
        results.push({
          url,
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          name: file.name,
          size: file.size,
          type: file.type,
          width: dimensions.width,
          height: dimensions.height,
        });
      }

      await onClientUploadComplete?.(results);
    } catch (error) {
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    void handleFiles(files);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    void handleFiles(files);
  };

  const uploadIcon = content?.uploadIcon?.({ isDragActive, isUploading: mergedUploading });
  const labelContent = content?.label;
  const allowedContent = content?.allowedContent;
  const buttonContent = content?.button;

  return (
    <div
      className={[
        'relative cursor-pointer',
        disabled ? 'pointer-events-none opacity-60' : '',
        appearance?.container ?? '',
        className,
      ].join(' ').trim()}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragActive(false);
      }}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
      {uploadIcon && (
        <div className={appearance?.uploadIcon ?? ''}>
          {uploadIcon}
        </div>
      )}
      {labelContent && (
        <div className={appearance?.label ?? ''}>
          {labelContent}
        </div>
      )}
      {allowedContent && (
        <div className={appearance?.allowedContent ?? ''}>
          {allowedContent}
        </div>
      )}
      {buttonContent && (
        <button
          type="button"
          className={appearance?.button ?? ''}
          onClick={(event) => {
            event.stopPropagation();
            if (!disabled) inputRef.current?.click();
          }}
        >
          {buttonContent}
        </button>
      )}
    </div>
  );
};
