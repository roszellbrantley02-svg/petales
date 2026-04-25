// XHR-based upload with progress callback. fetch() doesn't expose upload
// progress reliably across browsers, so we use XMLHttpRequest for media uploads.

export interface UploadResult {
  ok: boolean;
  status: number;
  data: unknown;
  error?: string;
}

export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = { raw: xhr.responseText };
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
        error:
          xhr.status >= 200 && xhr.status < 300
            ? undefined
            : (data as { error?: string })?.error || `HTTP ${xhr.status}`,
      });
    };

    xhr.onerror = () => {
      resolve({ ok: false, status: 0, data: null, error: 'Network error' });
    };

    xhr.ontimeout = () => {
      resolve({ ok: false, status: 0, data: null, error: 'Upload timed out' });
    };

    xhr.open('POST', url);
    xhr.timeout = 5 * 60 * 1000; // 5 min for large videos
    xhr.send(formData);
  });
}
