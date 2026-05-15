const { Pinecone } = require("@pinecone-database/pinecone");
const env = require("../config/env");

const PLACEHOLDER_API_KEYS = new Set(["", "real_key_here", "your_key_here"]);

let cachedStore = null;

function isNotFoundError(error) {
  return (
    error?.name === "PineconeNotFoundError" ||
    error?.status === 404 ||
    error?.cause?.status === 404 ||
    /not found/i.test(error?.message || "")
  );
}

function getIndexName(config = env) {
  return config.PINECONE_INDEX_NAME || "noffelo-cafe";
}

function validateProductionConfig(config = env) {
  if (config.USE_LOCAL_VECTORS || config.VECTOR_STORE === "pinecone-local") {
    throw new Error("pineconeClient is production-only. Use localVectorStore when USE_LOCAL_VECTORS=true.");
  }

  if (PLACEHOLDER_API_KEYS.has(config.PINECONE_API_KEY)) {
    throw new Error("PINECONE_API_KEY is required in production");
  }

  if (!Number.isInteger(config.VECTOR_DIMENSION) || config.VECTOR_DIMENSION <= 0) {
    throw new Error("VECTOR_DIMENSION must be a positive integer");
  }
}

function validateIndexModel(indexModel, config = env) {
  const expectedDimension = config.VECTOR_DIMENSION;
  const expectedMetric = "cosine";

  if (indexModel.dimension && indexModel.dimension !== expectedDimension) {
    throw new Error(
      `${getIndexName(config)} index dimension is ${indexModel.dimension}; expected ${expectedDimension}`
    );
  }

  if (indexModel.metric && indexModel.metric !== expectedMetric) {
    throw new Error(`${getIndexName(config)} index metric is ${indexModel.metric}; expected ${expectedMetric}`);
  }
}

async function describeIndexOrNull(client, config = env) {
  try {
    return await client.describeIndex(getIndexName(config));
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function ensurePineconeIndex(client, config = env) {
  const indexName = getIndexName(config);
  const existingIndex = await describeIndexOrNull(client, config);

  if (existingIndex) {
    validateIndexModel(existingIndex, config);
    return existingIndex;
  }

  if (!config.PINECONE_CREATE_INDEX) {
    throw new Error(`${indexName} index not found. Set PINECONE_CREATE_INDEX=true for first setup`);
  }

  await client.createIndex({
    name: indexName,
    dimension: config.VECTOR_DIMENSION,
    metric: "cosine",
    deletionProtection: "disabled",
    spec: {
      serverless: {
        cloud: config.PINECONE_CLOUD || "aws",
        region: config.PINECONE_REGION || "us-east-1"
      }
    },
    suppressConflicts: true,
    waitUntilReady: true
  });

  const createdIndex = await client.describeIndex(indexName);
  validateIndexModel(createdIndex, config);
  return createdIndex;
}

async function initPineconeClient(config = env) {
  if (cachedStore) return cachedStore;

  validateProductionConfig(config);

  const client = new Pinecone({ apiKey: config.PINECONE_API_KEY });
  const indexModel = await ensurePineconeIndex(client, config);
  const index = client.index({ host: indexModel.host });

  cachedStore = {
    client,
    index,
    indexModel,
    indexName: getIndexName(config)
  };

  return cachedStore;
}

async function upsertVectors(records) {
  if (!Array.isArray(records) || records.length === 0) return 0;

  const { index } = await initPineconeClient();
  await index.upsert({ records });
  return records.length;
}

async function searchByVector(vector, topK = 5, filter) {
  const { index } = await initPineconeClient();
  const response = await index.query({
    vector,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {})
  });

  return (response.matches || []).map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata || {}
  }));
}

async function deleteVector(id) {
  const { index } = await initPineconeClient();
  await index.deleteOne({ id: String(id) });

  return { id: String(id), deleted: true };
}

function resetPineconeClientForTests() {
  cachedStore = null;
}

module.exports = {
  initPineconeClient,
  ensurePineconeIndex,
  upsertVectors,
  searchByVector,
  deleteVector,
  resetPineconeClientForTests
};
