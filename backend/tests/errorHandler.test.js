const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { errorHandler, notFoundHandler } = require("../middlewares/errorHandler");
const { createHttpError } = require("../utils/httpError");

const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });

describe("error middleware", () => {
  test("errorHandler serializes HttpError instances", async (t) => {
    const app = express();
    app.get("/boom", (req, res, next) => {
      next(
        createHttpError("Boom", 418, [
          { path: "field", message: "is invalid" },
        ])
      );
    });
    app.use(errorHandler);

    const { server, port } = await listen(app);
    t.after(() => server.close());

    const response = await fetch(`http://127.0.0.1:${port}/boom`);
    assert.equal(response.status, 418);
    const body = await response.json();
    assert.deepEqual(body, {
      message: "Boom",
      details: [{ path: "field", message: "is invalid" }],
    });
  });

  test("notFoundHandler forwards 404 responses", async (t) => {
    const app = express();
    app.use(notFoundHandler);
    app.use(errorHandler);

    const { server, port } = await listen(app);
    t.after(() => server.close());

    const response = await fetch(`http://127.0.0.1:${port}/missing`);
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.match(body.message, /Cannot GET/);
  });
});