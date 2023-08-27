const path = require("path");
module.exports = {
  entry: {
    handtracking: "./src/handtracking.js",
    planedetection: "./src/planedetection.js",
  },
  devtool: "source-map",
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist/js"),
  },
};
