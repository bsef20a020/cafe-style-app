const env = require("../config/env");
const MenuItem = require("../models/MenuItem");
const localVectorStore = require("./localVectorStore");
const pineconeClient = require("./pineconeClient");

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const MENU_SOURCE = "menu-item";
const MENU_SYNC_HINT = "Run menu sync: POST /api/admin/sync-vectors";

let embeddingPipelinePromise = null;
let activeStorePromise = null;

function getActiveAdapter() {
  if (env.USE_LOCAL_VECTORS || env.VECTOR_STORE === "pinecone-local") {
    return {
      name: "pinecone-local",
      init: localVectorStore.initLocalVectorStore,
      upsert: localVectorStore.upsertVectors,
      search: localVectorStore.searchByVector,
      delete: localVectorStore.deleteVector
    };
  }

  return {
    name: "pinecone",
    init: pineconeClient.initPineconeClient,
    upsert: pineconeClient.upsertVectors,
    search: pineconeClient.searchByVector,
    delete: pineconeClient.deleteVector
  };
}

async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", EMBEDDING_MODEL)
    );
  }

  try {
    return await embeddingPipelinePromise;
  } catch (error) {
    embeddingPipelinePromise = null;
    throw error;
  }
}

async function createEmbedding(text) {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data);

  if (vector.length !== env.VECTOR_DIMENSION) {
    throw new Error(`Embedding dimension is ${vector.length}; expected ${env.VECTOR_DIMENSION}`);
  }

  return vector;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function buildMenuItemText(item) {
  const tags = normalizeTags(item.tags);
  const currency = item.currency || env.ORDER_CURRENCY || "PKR";

  return [
    `Name: ${item.name || ""}`,
    `Category: ${item.category || ""}`,
    `Price: ${Number(item.price || 0)} ${currency}`,
    `Description: ${item.description || ""}`,
    `Tags: ${tags.length ? tags.join(", ") : "none"}`,
    `Available: ${normalizeBoolean(item.available) ? "yes" : "no"}`,
    `Popular: ${normalizeBoolean(item.featured) ? "yes" : "no"}`
  ].join("\n");
}

function buildMenuItemMetadata(item) {
  const id = String(item._id || item.id);

  return {
    id,
    name: item.name || "",
    category: item.category || "",
    price: Number(item.price || 0),
    currency: item.currency || env.ORDER_CURRENCY || "PKR",
    tags: normalizeTags(item.tags),
    available: normalizeBoolean(item.available),
    featured: normalizeBoolean(item.featured),
    source: MENU_SOURCE
  };
}

async function buildMenuItemRecord(item) {
  const id = String(item._id || item.id);
  const text = buildMenuItemText(item);
  const values = await createEmbedding(text);

  return {
    id,
    values,
    metadata: buildMenuItemMetadata(item)
  };
}

async function initVectorStore() {
  if (!activeStorePromise) {
    const adapter = getActiveAdapter();
    activeStorePromise = adapter.init().then((store) => ({
      ...store,
      storeType: adapter.name,
      embeddingModel: EMBEDDING_MODEL,
      dimension: env.VECTOR_DIMENSION
    }));
  }

  try {
    return await activeStorePromise;
  } catch (error) {
    activeStorePromise = null;
    throw error;
  }
}

async function storeMenuItems(items) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return { synced: 0, records: [] };

  await initVectorStore();

  const records = [];
  for (const item of safeItems) {
    records.push(await buildMenuItemRecord(item));
  }

  const adapter = getActiveAdapter();
  const synced = await adapter.upsert(records);

  return {
    synced,
    records: records.map((record) => ({
      id: record.id,
      metadata: record.metadata
    }))
  };
}

async function searchSimilar(query, topK = 5) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return [];

  await initVectorStore();

  const vector = await createEmbedding(trimmedQuery);
  const adapter = getActiveAdapter();
  const results = await adapter.search(vector, Number(topK) || 5, { source: { $eq: MENU_SOURCE } });

  return results.map((result) => ({
    id: result.id,
    score: result.score,
    metadata: result.metadata || {}
  }));
}

async function deleteItem(id) {
  const itemId = String(id || "").trim();
  if (!itemId) {
    throw new Error("Vector item id is required");
  }

  await initVectorStore();

  const adapter = getActiveAdapter();
  return adapter.delete(itemId);
}

async function syncFromMongoDB() {
  await initVectorStore();

  const items = await MenuItem.find({}).sort({ category: 1, sortOrder: 1, name: 1 });
  if (items.length === 0) {
    return {
      synced: 0,
      message: MENU_SYNC_HINT
    };
  }

  const result = await storeMenuItems(items);

  return {
    synced: result.synced,
    message: "Menu synced to vector store"
  };
}

module.exports = {
  initVectorStore,
  storeMenuItems,
  searchSimilar,
  deleteItem,
  syncFromMongoDB
};
