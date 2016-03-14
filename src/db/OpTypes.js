'use strict';

const OpTypes = {
  Add: "ADD",
  Put: "PUT",
  Delete: "DELETE",
  isInsert: (op) => op === "ADD" || op === "PUT",
  isDelete: (op) => op === "DELETE"
};

module.exports = OpTypes;
