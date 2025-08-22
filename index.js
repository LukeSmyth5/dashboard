require("dotenv").config({ path: "./.env" });

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const port = 4200;

const { exec, execSync } = require("child_process");
const http = require("http");

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/images", express.static("C:/Users/rodri/repos/exec_dash/images"));
app.set("view engine", "ejs");
//app.use(express.static(__dirname + '/images'));

exports.removeColumn = (matrix, columnName) => {
  matrix.forEach((row) => {
    delete row[columnName];
  });
  return matrix;
};

async function fetchData(apiUrl, headers) {
  const response = await axios.get(apiUrl, { headers });
  return response.data;
}

function constructQueryParamsString(query) {
  return Object.keys(query)
    .map((key) => {
      if (Array.isArray(query[key])) {
        return query[key]
          .map((k) => `${encodeURIComponent(key)}=${encodeURIComponent(k)}`)
          .join("&");
      } else {
        return `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`;
      }
    })
    .join("&");
}

function determineSelectedColumns(reqQuery, allColumns, excludeColumns) {
  return reqQuery.columns
    ? reqQuery.columns.filter((column) => !excludeColumns.includes(column))
    : allColumns.filter((column) => !excludeColumns.includes(column));
}

async function handleRequest(req, res, method) {
  console.log("handleRequest method:", method);

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
  const headers = { Authorization: `Bearer ${process.env.API_SECRET_KEY}` };
  if (method === "GET") {
    //const baseEndpoint = "http://54.236.48.243:4000/api/dataset";
    const baseEndpoint = `${process.env.API_URL}/dataset`;
    const currentPage = parseInt(req.query.page, 10) || 1;
    const page = parseInt(req.query.page, 10) || 1;
    const rows = parseInt(req.query.rows, 10) || 10;
    const startIndex = (page - 1) * rows;
    const endIndex = page * rows;

    const queryParams =
      Object.keys(req.query).length === 0
        ? valuableColumns
        : Object.keys(req.query);
    const excludeColumns = ["_id", "_date", "_user"];

    const selectedColumns = determineSelectedColumns(
      req.query,
      valuableColumns,
      excludeColumns
    );

    try {
      let data;
      var totalCount = 0;
      console.log("data length:", totalCount);
      //http://54.236.48.243:4000/
      if (req.query.submit === "filter") {
        // data = await fetchData(
        //   "http://54.236.48.243:4000/api/dataset",
        //   headers
        // );
        data = await fetchData(`${process.env.API_URL}/dataset`, headers);
        totalCount = data.length;
      } else if (req.query.submit === "clean") {
        const queryString = constructQueryParamsString({
          ...req.query,
          page: undefined,
        });
        const url = `${baseEndpoint}?${queryString}`;
        data = await fetchData(url, headers);
        totalCount = data.length;
        console.log("data length:", totalCount);
      } else {
        // data = await fetchData(
        //   "http://54.236.48.243:4000/api/dataset",
        //   headers
        // );
        data = await fetchData(`${process.env.API_URL}/dataset`, headers);
        totalCount = data.length;
      }

      let filteredData = data.slice(startIndex, endIndex);
      const totalPages = Math.ceil(totalCount / rows);

      const relevantQueryParams = queryParams.filter(
        (param) =>
          !["submit", "rows"].includes(param) && selectedColumns.includes(param)
      );

      relevantQueryParams.forEach((column) => {
        if (!selectedColumns.includes(column)) {
          filteredData = removeColumn(filteredData, column);
        }
      });

      const paginationLinks = generatePaginationLinks(
        currentPage,
        totalPages,
        req.query
      );
      console.log("data length:", totalCount);

      // split selectedColumns into 2, one as independentVariables(starting with 'bm_') and the other as dependentVariables
      const independentVariables = selectedColumns.filter((col) =>
        col.startsWith("bm_")
      );
      const dependentVariables = selectedColumns.filter((col) =>
        !col.startsWith("bm_") && col !== "_id" && col !== "_date" && col !== "_user"
      );

      res.render("./dataPage", {
        data: filteredData,
        totalCount: totalCount,
        rowsPerPage: rows,
        apiUrl: process.env.API_URL,
        host: process.env.HOST,
        columns: selectedColumns,
        selectedColumns: selectedColumns,
        independentVariables: independentVariables,
        dependentVariables: dependentVariables,
        paginationLinks: paginationLinks,
        req: req,
      });
    } catch (error) {
      res.status(500).send("Failed to fetch data");
    }
  } else if (method === "POST") {
    const action = req.body.action || req.query.action;
    console.log("POST action:", action);

    switch (action) {
      case "sync":
        //const syncEndpoint = "http://54.236.48.243:4000/api/sync";
        const syncEndpoint = `${process.env.API_URL}/sync`;
        try {
          const syncData = await fetchData(syncEndpoint, headers);
          res.json(syncData);
        } catch (error) {
          console.error("Error syncing data:", error);
          res.status(500).send("Failed to sync data");
        }
        break;

      case "reset":
        //const resetEndpoint = "http://54.236.48.243:4000/api/reset";
        const resetEndpoint = `${process.env.API_URL}/reset`;
        try {
          const resetData = await fetchData(resetEndpoint, headers);
          res.json(resetData);
        } catch (error) {
          console.error("Error resetting data:", error);
          res.status(500).send("Failed to reset data");
        }
        break;

      default:
        res.status(400).send("Invalid action");
    }
  }
}

function generatePaginationLinks(currentPage, totalPages, originalQuery) {
  let paginationLinks = [];

  for (let i = 1; i <= totalPages; i++) {
    // Clone the original query parameters and update the page number
    let queryParams = { ...originalQuery, page: i };

    // Construct the query string for the current page link
    let queryString = Object.keys(queryParams)
      .map((key) => {
        return Array.isArray(queryParams[key])
          ? queryParams[key]
              .map(
                (value) =>
                  `${encodeURIComponent(key)}[]=${encodeURIComponent(value)}`
              )
              .join("&")
          : `${encodeURIComponent(key)}=${encodeURIComponent(
              queryParams[key]
            )}`;
      })
      .join("&");

    paginationLinks.push({
      page: i,
      queryString: queryString,
      isActive: i === currentPage,
    });
  }

  return paginationLinks;
}

//excesync????
app.get("/python", async (req, res) => {
  let hash = "awf233dss";

  let result = execSync(
    `C:/Users/rodri/AppData/Local/Programs/Python/Python311/python.exe ${process.env.AI_ADDRESS_1} ${hash}`,
    (err, stdout, stderr) => {
      // let result = execSync(`python3 ${process.env.AI_ADDRESS} ${hash}`, (err, stdout, stderr) => {

      if (err) {
        console.error(err);
        return;
      }
      console.log(stdout);
    }
  );
  json = JSON.parse(result);
  res.json(json);
  //res.sendFile('C:/Users/rodri/repos/exec_dash/images/y_au_time.png');
});

app.get("/dashboard", async (req, res) => {
  // Pass 'GET' as a method argument to handleRequest
  await handleRequest(req, res, "GET");
});

app.post("/dashboard", async (req, res) => {
  // Check for empty body in a POST request
  if (Object.keys(req.body).length === 0) {
    console.error("POST request to /dashboard with empty body");
    res.status(400).send("Request body is required for this operation");
    return;
  }
  console.log("POST /dashboard req.body:", req.body);
  // Pass 'POST' as a method argument to handleRequest
  await handleRequest(req, res, "POST");
});

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports.constructQueryParamsString = constructQueryParamsString;
module.exports.determineSelectedColumns = determineSelectedColumns;
module.exports.fetchData = fetchData;

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  console.log(process.env);

});
