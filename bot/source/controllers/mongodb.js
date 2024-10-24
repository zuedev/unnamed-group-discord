import { MongoClient, ServerApiVersion } from "mongodb";

async function connect() {
  const client = new MongoClient(process.env.MONGODB_SRV, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();

  return client;
}

async function ping() {
  const mongo = await connect();

  let result;

  try {
    result = await mongo
      .db(process.env.MONGODB_DATABASE_NAME)
      .command({ ping: 1 });
  } finally {
    mongo.close();
  }

  if (result?.ok === 1) return true;

  return false;
}

async function find(collection, query) {
  const mongo = await connect();

  let result = [];

  try {
    result = await mongo
      .db(process.env.MONGODB_DATABASE_NAME)
      .collection(collection)
      .find(query)
      .toArray();
  } finally {
    mongo.close();
  }

  return result;
}

async function insertOne(collection, document) {
  const mongo = await connect();

  let result;

  try {
    result = await mongo
      .db(process.env.MONGODB_DATABASE_NAME)
      .collection(collection)
      .insertOne(document);
  } finally {
    mongo.close();
  }

  return result;
}

async function upsertOne(collection, query, update) {
  const mongo = await connect();

  let result;

  try {
    result = await mongo
      .db(process.env.MONGODB_DATABASE_NAME)
      .collection(collection)
      .updateOne(query, update, { upsert: true });
  } finally {
    mongo.close();
  }

  return result;
}

export { connect, ping, find, insertOne, upsertOne };
