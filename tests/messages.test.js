const request = require("supertest");
const mongoose = require("mongoose");
const { app, connectDB } = require("../index");
const Admin = require("../models/Admin");
const Message = require("../models/Message");

let token;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gigant-test";
  await connectDB();

  await Admin.deleteMany({ email: "test-msg@test.com" });
  await request(app)
    .post("/api/auth/register")
    .send({ email: "test-msg@test.com", password: "password123", name: "Msg Tester" });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "test-msg@test.com", password: "password123" });
  token = loginRes.body.token;
});

afterAll(async () => {
  await Admin.deleteMany({ email: "test-msg@test.com" });
  await Message.deleteMany({ email: "visitor@test.com" });
  await mongoose.connection.close();
});

describe("POST /api/messages (public)", () => {
  it("creates a message without auth", async () => {
    const res = await request(app)
      .post("/api/messages")
      .send({ name: "Visitor", email: "visitor@test.com", subject: "Hello", body: "Test message" });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Message sent");
  });

  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/messages")
      .send({ name: "No Body" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/messages (auth)", () => {
  it("returns messages list", async () => {
    const res = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toBeDefined();
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it("rejects without auth", async () => {
    const res = await request(app).get("/api/messages");
    expect(res.status).toBe(401);
  });
});
