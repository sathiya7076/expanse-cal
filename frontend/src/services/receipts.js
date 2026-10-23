import api from './api';

// Backend: upload.single('receipt')
export const scanReceipt = (file, onProgress) => {
  const body = new FormData();
  body.append('receipt', file);
  return api
    .post('/receipts/scan', body, {
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded * 100) / e.total) : 0),
    })
    .then((r) => r.data);
};

export const confirmReceipt = (body) => api.post('/receipts/confirm', body).then((r) => r.data);

// NEW: upload an image and let the server add every expense / income entry it finds.
export const autoAddReceipt = (file, onProgress) => {
  const body = new FormData();
  body.append('receipt', file);
  return api
    .post('/receipts/auto', body, {
      timeout: 90000,
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded * 100) / e.total) : 0),
    })
    .then((r) => r.data);
};