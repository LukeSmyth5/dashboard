import { assert } from "chai";
import sinon from "sinon";
import axios from "axios";
// Import the functions to be tested
import {
  removeColumn,
  constructQueryParamsString,
  determineSelectedColumns,
  fetchData,
} from "../index.js";

(async () => {
  const { expect } = await import("chai");
  const { default: supertest } = await import("supertest");
  // Adjust the path to your actual index.js or the file you wish to test
  const { removeColumn, constructQueryParamsString, determineSelectedColumns } =
    await import("../index.js");

  describe("Testing remove column method", () => {
    it("should remove the column from the data", () => {
      let data = [
        { a: 1, b: 2, c: 3 },
        { a: 4, b: 5, c: 6 },
        { a: 7, b: 8, c: 9 },
      ];
      removeColumn(data, "a");
      // assert that column 'a' doesn't exist anymore
      assert.strictEqual(Object.keys(data[0]).length, 2);
      assert.strictEqual(Object.keys(data[1]).length, 2);
      assert.strictEqual(Object.keys(data[2]).length, 2);
    });
  });

  describe("Testing constructQueryParamsString function", () => {
    it("should correctly construct a query parameter string from an object", () => {
      const queryObject = {
        name: "Rodrigo Almeida",
        age: 40,
        hobbies: ["reading", "gaming"],
      };

      // Call the function with the example input
      const result = constructQueryParamsString(queryObject);

      // Expected output string, assuming the function URI encodes components
      const expectedOutput =
        "name=Rodrigo%20Almeida&age=40&hobbies=reading&hobbies=gaming";

      // Assert that the output matches the expected string
      assert.strictEqual(result, expectedOutput);
    });
  });

  const valuableColumns = [
    "_id",
    "_date",
    "_user",
    "fm_avg_trk_time",
    "fm_accuracy",
    "vx_avg_res_time",
    "vx_shot_accuracy",
    "vx_trg_accuracy",
    "au_avg_res_time",
    "bm_HR_max",
    "bm_HR_avg",
    "bm_HR_var",
    "bm_act_steps",
    "bm_sleep",
  ];

  const excludeColumns = ["_id", "_date", "_user"];

  describe("determineSelectedColumns function", () => {
    it("returns all valuable columns when no columns are specified in reqQuery", () => {
      const reqQuery = {};
      const result = determineSelectedColumns(
        reqQuery,
        valuableColumns,
        excludeColumns
      );
      expect(result).to.deep.equal([
        "fm_avg_trk_time",
        "fm_accuracy",
        "vx_avg_res_time",
        "vx_shot_accuracy",
        "vx_trg_accuracy",
        "au_avg_res_time",
        "bm_HR_max",
        "bm_HR_avg",
        "bm_HR_var",
        "bm_act_steps",
        "bm_sleep",
      ]);
    });

    it("returns specified columns from reqQuery when they are provided", () => {
      const reqQuery = { columns: ["fm_accuracy", "bm_HR_avg"] };
      const result = determineSelectedColumns(
        reqQuery,
        valuableColumns,
        excludeColumns
      );
      expect(result).to.deep.equal(["fm_accuracy", "bm_HR_avg"]);
    });
  });

  describe("fetchData function", function () {
    let axiosGetStub;

    beforeEach(function () {
      // Stub the axios.get method before each test
      axiosGetStub = sinon.stub(axios, "get");
    });

    afterEach(function () {
      // Safely restore the stubbed axios.get method after each test
      if (axiosGetStub && typeof axiosGetStub.restore === "function") {
        axiosGetStub.restore();
      }
    });

    it("axios.get should be stubbed", async function () {
      const testUrl = "https://api.mockendpoint.com/test";
      const testData = { data: "Test data" };
      axiosGetStub.withArgs(testUrl).resolves({ data: testData });

      const response = await axios.get(testUrl);
      assert.deepEqual(
        response.data,
        testData,
        "Stubbed response does not match expected test data"
      );
    });    
  });

})();
