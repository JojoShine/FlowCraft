export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: number;
    details?: Record<string, unknown>;
  };
}

export interface ResponseMeta {
  total?: number;
  page?: number;
  pageSize?: number;
}

export function successResponse<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
  return { success: true, data, meta };
}
