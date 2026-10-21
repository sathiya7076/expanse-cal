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
