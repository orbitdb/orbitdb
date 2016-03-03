'use strict';

const DBOperations = {
  Add: "ADD",
  Put: "PUT",
  Delete: "DELETE",
  isUpdate: (op) => op === "ADD" || op === "PUT"
};

module.exports = DBOperations;
