'use strict';

const OpTypes = {
  Add: "ADD",
  Put: "PUT",
  Delete: "DELETE",
  isInsert: (op) => op === "ADD" || op === "PUT"
};

module.exports = OpTypes;
