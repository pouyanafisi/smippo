/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-extglob";
exports.ids = ["vendor-chunks/is-extglob"];
exports.modules = {

/***/ "(rsc)/../../../.yarn/berry/cache/is-extglob-npm-2.1.1-0870ea68b5-10c0.zip/node_modules/is-extglob/index.js":
/*!************************************************************************************************************!*\
  !*** ../../../.yarn/berry/cache/is-extglob-npm-2.1.1-0870ea68b5-10c0.zip/node_modules/is-extglob/index.js ***!
  \************************************************************************************************************/
/***/ ((module) => {

eval("/*!\n * is-extglob <https://github.com/jonschlinkert/is-extglob>\n *\n * Copyright (c) 2014-2016, Jon Schlinkert.\n * Licensed under the MIT License.\n */\n\nmodule.exports = function isExtglob(str) {\n  if (typeof str !== 'string' || str === '') {\n    return false;\n  }\n\n  var match;\n  while ((match = /(\\\\).|([@?!+*]\\(.*\\))/g.exec(str))) {\n    if (match[2]) return true;\n    str = str.slice(match.index + match[0].length);\n  }\n\n  return false;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vLi4vLnlhcm4vYmVycnkvY2FjaGUvaXMtZXh0Z2xvYi1ucG0tMi4xLjEtMDg3MGVhNjhiNS0xMGMwLnppcC9ub2RlX21vZHVsZXMvaXMtZXh0Z2xvYi9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBIiwic291cmNlcyI6WyIvVXNlcnMvcG91eWFuYWZpc2kvLnlhcm4vYmVycnkvY2FjaGUvaXMtZXh0Z2xvYi1ucG0tMi4xLjEtMDg3MGVhNjhiNS0xMGMwLnppcC9ub2RlX21vZHVsZXMvaXMtZXh0Z2xvYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIGlzLWV4dGdsb2IgPGh0dHBzOi8vZ2l0aHViLmNvbS9qb25zY2hsaW5rZXJ0L2lzLWV4dGdsb2I+XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTYsIEpvbiBTY2hsaW5rZXJ0LlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNFeHRnbG9iKHN0cikge1xuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycgfHwgc3RyID09PSAnJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHZhciBtYXRjaDtcbiAgd2hpbGUgKChtYXRjaCA9IC8oXFxcXCkufChbQD8hKypdXFwoLipcXCkpL2cuZXhlYyhzdHIpKSkge1xuICAgIGlmIChtYXRjaFsyXSkgcmV0dXJuIHRydWU7XG4gICAgc3RyID0gc3RyLnNsaWNlKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/../../../.yarn/berry/cache/is-extglob-npm-2.1.1-0870ea68b5-10c0.zip/node_modules/is-extglob/index.js\n");

/***/ })

};
;