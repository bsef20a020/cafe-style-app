# NOFFELO AI Chatbot Vector Store Design

Date: 2026-05-12

## Goal

Add the vector-store foundation for the NOFFELO AI chatbot so the app can use real Pinecone in production and a free local Pinecone-compatible setup in development.

The same server functions should work in both environments. Developers should switch between local and production behavior with environment variables, not code changes.

## Current Context

NOFFELO is a MERN cafe app with:

- React + Vite frontend in `client/`
- Express API in `server/`
- MongoDB through Mongoose
- Docker Compose services for MongoDB, server, and client
- Menu data stored in MongoDB through `MenuItem`
- Existing environment examples at `.env.example`, `server/.env.example`, and `client/.env.example`

The repository currently has unrelated uncommitted frontend/backend changes. This vector-store work must not revert or overwrite those changes.

## Confirmed Production Index

Production Pinecone will use:

- Index name: `noffelo-cafe`
- Vector type: dense
- Dimension: `384`
- Metric: `cosine`
- Cloud: `aws`
- Region: `us-east-1`
- Deletion protection: disabled

Embeddings will use `Xenova/all-MiniLM-L6-v2`, which outputs 384-dimensional vectors.

## Local Vector Store Decision

Use Pinecone Local for development.

This is the best fit because it is Pinecone's official Docker-based local emulator. It avoids using the real Pinecone free tier during development while keeping the local API close to production Pinecone.

Rejected options:

- LocalStack: not suitable because Pinecone is not an AWS service.
- ChromaDB: good local vector database, but it has a different API and would require more adapter behavior.
- JSON vector store: simple, but not a real service and not close enough to production behavior.

Important local limitation: Pinecone Local is in-memory. Vectors disappear when the local service stops. That is acceptable because menu vectors can be rebuilt from MongoDB with `syncFromMongoDB()`.

## Environment Design

Create both development and production env files.

Development:

```env
USE_LOCAL_VECTORS=true
VECTOR_STORE=pinecone-local
PINECONE_API_KEY=pclocal
PINECONE_INDEX_NAME=noffelo-cafe
PINECONE_HOST=http://pinecone-local:5080
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
VECTOR_DIMENSION=384
PINECONE_CREATE_INDEX=true
```

Production:

```env
USE_LOCAL_VECTORS=false
VECTOR_STORE=pinecone
PINECONE_API_KEY=real_key_here
PINECONE_INDEX_NAME=noffelo-cafe
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
VECTOR_DIMENSION=384
PINECONE_CREATE_INDEX=false
```

Real secrets must not be committed. Example files should use placeholders only. In production, `PINECONE_CREATE_INDEX` should stay `false` by default and can be set to `true` only for a deliberate one-time index setup command.

## Docker Compose Design

Add a development-only local vector service to the existing Compose stack:

- Service name: `pinecone-local`
- Image: `ghcr.io/pinecone-io/pinecone-local:latest`
- Port: `5080`
- Platform: `linux/amd64`

The server service should receive vector-store environment variables and depend on `pinecone-local` for development. MongoDB remains the source of truth for menu records.

## Backend Architecture

Create a small vector-store abstraction:

- `server/src/services/vectorStore.js`
- `server/src/services/pineconeClient.js`
- `server/src/services/localVectorStore.js`

`vectorStore.js` is the only file future chat routes should import. It chooses local or production based on `USE_LOCAL_VECTORS` and `VECTOR_STORE`.

It exports:

- `initVectorStore()`
- `storeMenuItems(items)`
- `searchSimilar(query, topK)`
- `deleteItem(id)`
- `syncFromMongoDB()`

`pineconeClient.js` handles real Pinecone setup for production. It should validate required production values and create or connect to the configured index.

`localVectorStore.js` handles Pinecone Local. It should connect to the Docker service with a dummy API key, ensure the local index exists, and use the same record shape as production.

## Data Shape

Each menu item should be converted into searchable text before embedding:

```text
Name: Cappuccino
Category: Coffee
Price: 400 PKR
Description: Rich espresso with steamed milk.
Tags: hot, strong, sweet
Available: yes
Popular: yes
```

The vector metadata should include:

- MongoDB menu item id
- name
- category
- price
- currency
- tags
- available
- featured
- source type: `menu-item`

Future chatbot phases can add FAQ, policy, complaint, and analytics documents using the same vector-store abstraction.

## Sync Behavior

`syncFromMongoDB()` should:

1. Read menu items from MongoDB.
2. Convert each item into searchable text.
3. Create local embeddings with `Xenova/all-MiniLM-L6-v2`.
4. Upsert vectors into the active vector store.
5. Return a count of synced records.

Menu admin mutations can call sync later, but the first implementation may expose a protected manual sync route before adding automatic sync hooks.

## Error Handling

Development:

- If Pinecone Local is unavailable, return a clear message explaining that Docker Compose needs the local vector service.
- If vectors are missing, re-run menu sync from MongoDB.

Production:

- If `PINECONE_API_KEY` is missing while `USE_LOCAL_VECTORS=false`, fail fast with a clear configuration error.
- If the production index is missing and `PINECONE_CREATE_INDEX=false`, report a clear setup error.
- If the production index is missing and `PINECONE_CREATE_INDEX=true`, create it with the confirmed `384` dimension and `cosine` metric.

Both environments should return normalized search results to callers.

## Testing And Verification

Local verification:

- `docker compose up -d` starts MongoDB, Pinecone Local, server, and client.
- Server can initialize the local vector store.
- `syncFromMongoDB()` syncs menu items into the local index.
- `searchSimilar("cold coffee", 3)` returns relevant menu records.
- Restarting Pinecone Local clears vectors, and re-running sync restores them.

Production verification:

- With `USE_LOCAL_VECTORS=false` and a real API key, server connects to real Pinecone.
- The `noffelo-cafe` index uses dimension `384` and metric `cosine`.
- Menu sync writes real vectors to the cloud index.
- Search returns the same normalized result shape as local development.

## Implementation Order

1. Add vector environment variables to config and env example files.
2. Add Pinecone Local to Docker Compose.
3. Install backend packages: `@pinecone-database/pinecone` and `@xenova/transformers`.
4. Create embedding helpers inside the vector-store services.
5. Create `pineconeClient.js`.
6. Create `localVectorStore.js`.
7. Create `vectorStore.js` as the public switchboard.
8. Add a small script or route to run the first menu sync.
9. Test local sync and search.
10. Document production setup and first sync command.

## Beginner Explanation

MongoDB remains the real cafe database. Pinecone is a search memory layer for the chatbot. The app copies menu text into vectors so the chatbot can find related items from natural language questions like "Koi cold coffee batao".

Development uses Pinecone Local so testing does not spend real Pinecone limits. Production uses Pinecone Cloud so the deployed chatbot has a managed vector database. The app talks to both through the same `vectorStore.js` functions.
