import { expect } from "chai";
import { deployTestContract } from "./test-utils";

describe("Genesis minting function", function () {
  it("Should not allow minting if it is not active", async function () {
    const contract = await deployTestContract();
  });
});
