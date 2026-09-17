import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3000";
const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "30s", target: 10 },  // ramp up
    { duration: "1m", target: 50 },   // sustained load
    { duration: "30s", target: 0 },   // ramp down
  },
  thresholds: {
    http_req_duration: ["p(95)<600"],      // API p95 < 600ms
    http_req_failed: ["rate<0.01"],        // error rate < 1%
    "errors": ["rate<0.01"],
    http_req_duration: ["p(99)<1000"],     // API p99 < 1s
  },
};

export default function () {
  // Public landing
  let res = http.get(`${BASE_URL}/`);
  check(res, { "landing 200": (r) => r.status === 200 }) || errorRate.add(1);

  // Health check
  res = http.get(`${BASE_URL}/api/health`);
  check(res, { "health 200": (r) => r.status === 200 }) || errorRate.add(1);

  // Subject list (requires auth - will 401, but measures response time)
  res = http.get(`${BASE_URL}/api/subjects`);
  check(res, { "subjects 401/200": (r) => r.status === 401 || r.status === 200 }) || errorRate.add(1);

  // Practice start (unauthed - will 401)
  res = http.post(`${BASE_URL}/api/practice/start`, JSON.stringify({ subjectId: "test", count: 5 }), {
    headers: { "Content-Type": "application/json" },
  });
  check(res, { "practice start 401/201": (r) => r.status === 401 || r.status === 201 }) || errorRate.add(1);

  // Exam list (unauthed)
  res = http.get(`${BASE_URL}/api/exams`);
  check(res, { "exams 401/200": (r) => r.status === 401 || r.status === 200 }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "summary.json": JSON.stringify(data),
  };
}

function textSummary(data, { indent, enableColors }) {
  // Simple text summary
  const lines = [];
  lines.push(`${enableColors ? "\x1b[36m" : ""}k6 Summary${enableColors ? "\x1b[0m" : ""}`);
  lines.push(`${indent}Total requests: ${data.metrics.http_reqs.values.count}`);
  lines.push(`${indent}Error rate: ${(data.metrics.http_req_failed?.values.rate * 100).toFixed(2)}%`);
  lines.push(`${indent}p95 latency: ${data.metrics.http_req_duration?.values["p(95)"]?.toFixed(0) ?? "N/A"}ms`);
  lines.push(`${indent}p99 latency: ${data.metrics.http_req_duration?.values["p(99)"]?.toFixed(0) ?? "N/A"}ms`);
  return lines.join("\n");
}