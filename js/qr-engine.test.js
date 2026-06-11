import { runEngineTests } from "./qr-engine.js";
import { runQartTests } from "./qart-optimizer.js";

export function runTests() {
  return runEngineTests() + runQartTests();
}
