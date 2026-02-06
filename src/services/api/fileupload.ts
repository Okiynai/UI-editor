const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export const generatePresignedUpload = async (file: File) => {
  if (typeof window === 'undefined') {
    return { success: false, error: 'upload unavailable on server' };
  }

  const publicUrl = await toDataUrl(file);
  return {
    url: `local://upload/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    publicUrl,
  };
};

export const uploadWithPresignedUrl = async (_file: File, _url: string) => ({ success: true });
