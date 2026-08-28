export * from "./app";
export * from "./private";

import * as app from "./app";
import * as privateTables from "./private";

export const databaseSchema = {
  ...app,
  ...privateTables,
};
