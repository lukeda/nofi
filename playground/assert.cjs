// Pug's lexer and parser use only the assert(value, message) function.
module.exports = function assert(value, message) {
  if (!value) throw new Error(message || 'Assertion failed');
};
