// 1.0 My requirement is JWT using firebase-admin. first, install "npm i firebase-admin" in server.

// 1.9 Now go to firebase console => select the settings wheel => Project settings => services => copy the code => after that generate the private key
const admin = require("firebase-admin");

// 1.10 import the key
const serviceAccount = require("./career-code-job-portal-firebase-adminsdk-fbsvc-af9cb2cf5b.json");

// 4.0 In m-61-5 and m-61-6 is skipped because some repeatative task that we have done is converted to a common function and custom hooks. That will learn later.

// 1.10
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const cors = require("cors");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware

app.use(cors());

app.use(express.json());

// 1.5 creating a custom middleware to verify the token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  console.log("header in middleware", authHeader); // after reload my Application u will see in the server.

  // 1.7 validate the token if authHeader don't have any token or dont starts with "Bearer " then sent a status message
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).send({ message: "Unauthorized Access" });
  }
  // 1.8 if token present then take only the token except "Bearer "
  const token = authHeader.split(" ")[1];
  console.log("token in the middleware", token);

  // 2.0 now to verify the token for my application page so we use in try catch block from firebase doc to decode the token
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("decoded token", decoded);

    // 2.2 now set the decoded to req
    req.decoded = decoded;

    // 2.1
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  // 1.5 commented due to we have to call it conditionally in 2.1
  // next();
};

// user name: 'career_db_admin and in password use auto generated password which is "O4t3tOchGoC21XpN". Then Built-in Role will be admin then add user.

// as we have to hide the user name and password so create .env file then type DB_USER=career_db_admin and DB_PASS=O4t3tOchGoC21XpN

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bmunlsr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Get the database and collection on which to run the operation
    const jobsCollections = client.db("carrerCode").collection("jobs");

    const applicationsCollections = client
      .db("carrerCode")
      .collection("applications");

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.hremail = email;
      }

      const cursor = jobsCollections.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // 3.0 Now my requiremnt is verifyToken for the jobposted user so set the verifyToken in jobposted url
    app.get("/jobs/applications", verifyToken, async (req, res) => {
      const email = req.query.email;

      // 3.3 now verify the token Note: the decoded is previously done in 2.0
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }

      const query = {};

      if (email) {
        query.hr_email = email;
      }

      const cursor = await jobsCollections.find(query).toArray();

      // const cursor = await jobsCollections.find().toArray();
      res.send(cursor);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollections.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollections.insertOne(newJob);
      res.send(result);
    });

    // 1.6 set the verifyToken middleware. the mechanism is when user hit the /applications url then it goes to verifyToken callback function before go to the async (req, res)..... function.
    app.get("/applications", verifyToken, async (req, res) => {
      const email = req.query.email;

      // 2.3 now verify the token with user email with verifyToken decoded email from the middleware
      if (email !== req.decoded.email) {
        res.status(401).send({ message: "forbidden access" });
        // 2.4 now login in to job.hr@cob.com then in browser url paste 'http://localhost:3000/applications?email=ashahab007@gmail.com' url will show unauthorize because there is no token found in browser network tab.
      }

      // 1.4 checking that the server is receive or not. Now reload my application then u will get the Bearer in authorization in server side.
      console.log("req header", req.headers);

      const query = { applicant: email }; //as we send the applicant data in applicant key from the form to db. so we will query by applicant: email

      const result = await applicationsCollections.find(query).toArray();

      for (const application of result) {
        const jobId = application.jobId; //set the job id for query
        const jobQuery = { _id: new ObjectId(jobId) };
        const job = await jobsCollections.findOne(jobQuery);
        application.title = job.title;
        application.company = job.company;
        application.company_logo = job.company_logo;
      }

      res.send(result);
    });

    app.get("/applications/job/:job_id", async (req, res) => {
      const job_id = req.params.job_id;

      const query = { jobId: job_id }; //this jobId is created when user applied for the jobs we send specific job id to jobId key.

      const result = await applicationsCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/applications", async (req, res) => {
      const application = req.body;

      console.log(application);
      const result = await applicationsCollections.insertOne(application);
      res.send(result);
    });

    app.patch("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: req.body.status,
        },
      };
      const result = await applicationsCollections.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); // 16.2 it must be commented
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job server is running");
});

app.listen(port, () => {
  console.log(`Job server is running on port ${port}`);
});
