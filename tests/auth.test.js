const request = require("supertest");
const mongoose = require("mongoose");
const { app, connectDB } = require("../index");
const Admin = require("../models/Admin");

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gigant-test";
  await connectDB();
});

afterAll(async () => {
  await Admin.deleteMany({ email: /test-/i });
  await mongoose.connection.close();
});

describe("POST /api/auth/register", () => {
  it("creates a new account and returns token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test-register@test.com", password: "password123", name: "Test User" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin.email).toBe("test-register@test.com");
    expect(res.body.admin.role).toBe("admin");
  });

  it("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test-register@test.com", password: "password123" });

    expect(res.status).toBe(409);
  });

  it("rejects short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test-short@test.com", password: "123" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test-register@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test-register@test.com", password: "wrongpass" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns admin for valid token", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test-register@test.com", password: "password123" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test-register@test.com");
  });

  it("rejects missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/auth/password", () => {
  it("changes password with correct current password", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test-register@test.com", password: "password123" });

    const res = await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ currentPassword: "password123", newPassword: "newpass456" });

    expect(res.status).toBe(200);

    const loginNew = await request(app)
      .post("/api/auth/login")
      .send({ email: "test-register@test.com", password: "newpass456" });
    expect(loginNew.status).toBe(200);
  });

  it("rejects wrong current password", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test-register@test.com", password: "newpass456" });

    const res = await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ currentPassword: "wrongpass", newPassword: "another123" });

    expect(res.status).toBe(401);
  });
});
