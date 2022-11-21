const express = require("express");
// const axios = require("axios");
const redis = require("redis");
let bodyParser = require("body-parser");
var MongoClient = require("mongodb").MongoClient;

const app = express();
const port = process.env.PORT || 3000;
const url = "mongodb://localhost:27017";

let redisClient = redis.createClient();
redisClient.on("error", (error) => console.error(`Error : ${error}`));
redisClient.connect().then(console.log("Redis Client Connected!"));

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

// MongoDB object
var db = null;
MongoClient.connect(
  url,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err, client) => {
    if (err) {
      return console.log(err);
    }

    // Specify the database you want to access
    db = client.db("sample_airbnb");

    console.log(`MongoDB Connected: ${url}`);
  }
);

async function fetchData(propertyType) {
  // const apiResponse = await axios.get(
  //   `https://www.fishwatch.gov/api/species/${species}`
  // );
  // console.log("Request sent to the API");
  // return apiResponse.data;

  const airbnb = [];
  const res = await db.collection("listingsAndReviews").find({}).toArray();

  res.forEach((element) => {
    airbnb.push(element);
  });

  return airbnb;
}

async function getAirbnbData(req, res) {
  let results;
  let isCached = false;

  try {
    const cacheResults = await redisClient.get("airbnbData");
    if (cacheResults) {
      console.log("fetching from Redis Client");
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      console.log("fetching from local MongoDB");
      results = await fetchData();
      if (results.length === 0) {
        throw "API returned an empty array";
      }
      await redisClient.set("airbnbData", JSON.stringify(results));
    }

    res.status(200).send({
      fromCache: isCached,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("Data unavailable");
  }
}

app.get("/airbnb", getAirbnbData);
app.get("/", (req, res) => res.send("Hello World with Express"));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
