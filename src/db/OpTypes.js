'use strict';

const OpTypes = {
  Add: "ADD",
  Put: "PUT",
  Delete: "DELETE",
  Inc: "INC",
  isInsert: (op) => op === "ADD" || op === "PUT",
  isDelete: (op) => op === "DELETE"
};

module.exports = OpTypes;
