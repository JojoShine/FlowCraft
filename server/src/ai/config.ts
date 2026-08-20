import dotenv from 'dotenv';
dotenv.config();

export const aiConfig = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  embedding: {
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    baseURL: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
    model: process.env.SILICONFLOW_EMBEDDING_MODEL || 'BAAI/bge-m3',
  },
  chroma: {
    host: process.env.CHROMA_HOST || 'localhost',
    port: parseInt(process.env.CHROMA_PORT || '8000', 10),
    collection: process.env.CHROMA_COLLECTION || 'flowcraft',
  },
  chunking: {
    chunkSize: 500,
    chunkOverlap: 80,
  },
};
