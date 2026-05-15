const { URL } = require("url");
const { Pinecone } = require("@pinecone-database/pinecone");
const env = require("../config/env");

const LOCAL_UNAVAILABLE_MESSAGE =
  "Docker Compose pinecone-local service is not running.\nRun: docker compose up pinecone-local";

let cachedStore = null;

function isLocalConnectionError(error) {
  const message = [error?.message, error?.cause?.message, error?.cause?.cause?.message]
    .filter(Boolean)
    .join(" ");

  return /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|connect/i.test(message);
}

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

function getLocalControllerHost(config = env) {
  return config.PINECONE_HOST || "http://pinecone-local:5080";
}

function validateLocalConfig(config = env) {
  if (!config.USE_LOCAL_VECTORS || config.VECTOR_STORE !== "pinecone-local") {
    throw new Error("localVectorStore is development-only. Set USE_LOCAL_VECTORS=true and VECTOR_STORE=pinecone-local.");
  }

  if (!Number.isInteger(config.VECTOR_DIMENSION) || config.VECTOR_DIMENSION <= 0) {
    throw new Error("VECTOR_DIMENSION must be a positive integer");
  }
}

function normalizeIndexHostForDocker(indexHost, config = env) {
  if (!indexHost) return indexHost;

  const controllerHost = getLocalControllerHost(config);

  try {
    const controllerUrl = new URL(controllerHost);
    const indexUrl = new URL(indexHost.includes("://") ? indexHost : `http://${indexHost}`);

    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(indexUrl.hostname)) {
      indexUrl.hostname = controllerUrl.hostname;
    }

    return `${indexUrl.protocol}//${indexUrl.host}`;
  } catch (_error) {
    return indexHost;
  }
}

function validateIndexModel(indexModel, config = env) {
  const expectedDimension = config.VECTOR_DIMENSION;
  const expectedMetric = "cosine";

  if (indexModel.dimension && indexModel.dimension !== expectedDimension) {
    throw new Error(
      `${getIndexName(config)} local index dimension is ${indexModel.dimension}; expected ${expectedDimension}`
    );
  }

  if (indexModel.metric && indexModel.metric !== expectedMetric) {
    throw new Error(`${getIndexName(config)} local index metric is ${indexModel.metric}; expected ${expectedMetric}`);
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

async function ensureLocalIndex(client, config = env) {
  const indexName = getIndexName(config);
  const existingIndex = await describeIndexOrNull(client, config);

  if (existingIndex) {
    validateIndexModel(existingIndex, config);
    return existingIndex;
  }

  await client.createIndex({
    name: indexName,
    vectorType: "dense",
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
    waitUntilReady: true,
    tags: {
      environment: "development",
      app: "noffelo"
    }
  });

  const createdIndex = await client.describeIndex(indexName);
  validateIndexModel(createdIndex, config);
  return createdIndex;
}

async function initLocalVectorStore(config = env) {
  if (cachedStore) return cachedStore;

  validateLocalConfig(config);

  const client = new Pinecone({
    apiKey: config.PINECONE_API_KEY || "pclocal",
    controllerHostUrl: getLocalControllerHost(config)
  });

  try {
    const indexModel = await ensureLocalIndex(client, config);
    const indexHost = normalizeIndexHostForDocker(indexModel.host, config);
    const index = client.index({ host: indexHost });

    cachedStore = {
      client,
      index,
      indexModel: {
        ...indexModel,
        host: indexHost
      },
      indexName: getIndexName(config),
      controllerHost: getLocalControllerHost(config)
    };

    return cachedStore;
  } catch (error) {
    if (isLocalConnectionError(error)) {
      throw new Error(LOCAL_UNAVAILABLE_MESSAGE);
    }

    throw error;
  }
}

async function upsertVectors(records) {
  if (!Array.isArray(records) || records.length === 0) return 0;

  const { index } = await initLocalVectorStore();
  await index.upsert({ records });
  return records.length;
}

async function searchByVector(vector, topK = 5, filter) {
  const { index } = await initLocalVectorStore();
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
  const { index } = await initLocalVectorStore();
  await index.deleteOne({ id: String(id) });

  return { id: String(id), deleted: true };
}

function resetLocalVectorStoreForTests() {
  cachedStore = null;
}

module.exports = {
  LOCAL_UNAVAILABLE_MESSAGE,
  initLocalVectorStore,
  ensureLocalIndex,
  upsertVectors,
  searchByVector,
  deleteVector,
  resetLocalVectorStoreForTests
};
