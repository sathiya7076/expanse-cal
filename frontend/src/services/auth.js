import api from './api';

export const registerUser = (body) => api.post('/auth/register', body).then((r) => r.data);
export const loginUser = (body) => api.post('/auth/login', body).then((r) => r.data);
export const getMe = () => api.get('/auth/me').then((r) => r.data.user ?? r.data);
