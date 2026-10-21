import api from './api';
import { unwrap } from '../utils/format';

export const makeCrud = (path, listKey) => ({
  list: (params) => api.get(path, { params }).then((r) => unwrap(r, listKey)),
  create: (body) => api.post(path, body).then((r) => r.data),
  update: (id, body) => api.put(`${path}/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`${path}/${id}`).then((r) => r.data),
});
