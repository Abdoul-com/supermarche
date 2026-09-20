import test from "node:test";
import assert from "node:assert/strict";

import { menuItems } from "./constants.js";

test("navigation exposes only the simplified main modules", () => {
  const keys = menuItems.map((item) => item.key);

  assert.deepEqual(keys, [
    "dashboard",
    "produits",
    "stock",
    "ventes",
    "clients",
    "parametres",
  ]);
});
