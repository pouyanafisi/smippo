"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/reusify";
exports.ids = ["vendor-chunks/reusify"];
exports.modules = {

/***/ "(rsc)/../../../.yarn/berry/cache/reusify-npm-1.1.0-96242be57f-10c0.zip/node_modules/reusify/reusify.js":
/*!********************************************************************************************************!*\
  !*** ../../../.yarn/berry/cache/reusify-npm-1.1.0-96242be57f-10c0.zip/node_modules/reusify/reusify.js ***!
  \********************************************************************************************************/
/***/ ((module) => {

eval("\n\nfunction reusify (Constructor) {\n  var head = new Constructor()\n  var tail = head\n\n  function get () {\n    var current = head\n\n    if (current.next) {\n      head = current.next\n    } else {\n      head = new Constructor()\n      tail = head\n    }\n\n    current.next = null\n\n    return current\n  }\n\n  function release (obj) {\n    tail.next = obj\n    tail = obj\n  }\n\n  return {\n    get: get,\n    release: release\n  }\n}\n\nmodule.exports = reusify\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vLi4vLnlhcm4vYmVycnkvY2FjaGUvcmV1c2lmeS1ucG0tMS4xLjAtOTYyNDJiZTU3Zi0xMGMwLnppcC9ub2RlX21vZHVsZXMvcmV1c2lmeS9yZXVzaWZ5LmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSIsInNvdXJjZXMiOlsiL1VzZXJzL3BvdXlhbmFmaXNpLy55YXJuL2JlcnJ5L2NhY2hlL3JldXNpZnktbnBtLTEuMS4wLTk2MjQyYmU1N2YtMTBjMC56aXAvbm9kZV9tb2R1bGVzL3JldXNpZnkvcmV1c2lmeS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxuZnVuY3Rpb24gcmV1c2lmeSAoQ29uc3RydWN0b3IpIHtcbiAgdmFyIGhlYWQgPSBuZXcgQ29uc3RydWN0b3IoKVxuICB2YXIgdGFpbCA9IGhlYWRcblxuICBmdW5jdGlvbiBnZXQgKCkge1xuICAgIHZhciBjdXJyZW50ID0gaGVhZFxuXG4gICAgaWYgKGN1cnJlbnQubmV4dCkge1xuICAgICAgaGVhZCA9IGN1cnJlbnQubmV4dFxuICAgIH0gZWxzZSB7XG4gICAgICBoZWFkID0gbmV3IENvbnN0cnVjdG9yKClcbiAgICAgIHRhaWwgPSBoZWFkXG4gICAgfVxuXG4gICAgY3VycmVudC5uZXh0ID0gbnVsbFxuXG4gICAgcmV0dXJuIGN1cnJlbnRcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbGVhc2UgKG9iaikge1xuICAgIHRhaWwubmV4dCA9IG9ialxuICAgIHRhaWwgPSBvYmpcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZ2V0OiBnZXQsXG4gICAgcmVsZWFzZTogcmVsZWFzZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmV1c2lmeVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../../../.yarn/berry/cache/reusify-npm-1.1.0-96242be57f-10c0.zip/node_modules/reusify/reusify.js\n");

/***/ })

};
;