import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { aiConfig } from './config';

const CHINESE_SEPARATORS = [
  '\n\n', '\n', '。', '！', '？', '；',
  '. ', '! ', '? ', '; ',
  '，', ', ', ' ', '',
];

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: aiConfig.chunking.chunkSize,
  chunkOverlap: aiConfig.chunking.chunkOverlap,
  separators: CHINESE_SEPARATORS,
});

export interface Chunk {
  text: string;
  index: number;
}

export async function splitText(text: string): Promise<Chunk[]> {
  const docs = await splitter.createDocuments([text]);
  return docs.map((doc, i) => ({ text: doc.pageContent, index: i }));
}
