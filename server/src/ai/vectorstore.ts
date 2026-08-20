import { ChromaClient, Collection } from 'chromadb';
import { aiConfig } from './config';
import { embedTexts, embedQuery } from './embeddings';

const client = new ChromaClient({
  path: `http://${aiConfig.chroma.host}:${aiConfig.chroma.port}`,
});

let _collection: Collection | null = null;

export async function getCollection(): Promise<Collection> {
  if (_collection) return _collection;
  _collection = await client.getOrCreateCollection({
    name: aiConfig.chroma.collection,
    metadata: { 'hnsw:space': 'cosine' },
  });
  return _collection;
}

export interface VectorDoc {
  id: string;
  text: string;
  metadata: Record<string, string | number | boolean>;
}

export async function addDocuments(docs: VectorDoc[]): Promise<void> {
  if (docs.length === 0) return;
  const collection = await getCollection();
  const embeddings = await embedTexts(docs.map((d) => d.text));
  await collection.upsert({
    ids: docs.map((d) => d.id),
    documents: docs.map((d) => d.text),
    embeddings,
    metadatas: docs.map((d) => d.metadata),
  });
}

export async function deleteBySource(sourceId: string, sourceType: string): Promise<void> {
  const collection = await getCollection();
  await collection.delete({
    where: { sourceId, sourceType },
  });
}

export async function deleteByProject(projectId: string): Promise<void> {
  const collection = await getCollection();
  await collection.delete({
    where: { projectId },
  });
}

export interface SearchResult {
  id: string;
  text: string;
  metadata: Record<string, string | number | boolean>;
  score: number;
}

export async function search(
  query: string,
  projectId?: string,
  topK = 15,
): Promise<SearchResult[]> {
  const collection = await getCollection();
  const embedding = await embedQuery(query);

  const where = projectId ? { projectId } : undefined;
  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    where,
  });

  const items: SearchResult[] = [];
  if (results.ids[0]) {
    for (let i = 0; i < results.ids[0].length; i++) {
      items.push({
        id: results.ids[0][i],
        text: results.documents[0]?.[i] || '',
        metadata: (results.metadatas[0]?.[i] as Record<string, string | number | boolean>) || {},
        score: 1 - (results.distances[0]?.[i] ?? 1),
      });
    }
  }
  return items;
}

export async function getCollectionStats() {
  const collection = await getCollection();
  const count = await collection.count();
  return { collection: aiConfig.chroma.collection, documentCount: count };
}
