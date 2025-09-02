/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/stats/route";
exports.ids = ["app/api/stats/route"];
exports.modules = {

/***/ "(rsc)/./app/api/stats/route.ts":
/*!********************************!*\
  !*** ./app/api/stats/route.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   dynamic: () => (/* binding */ dynamic),\n/* harmony export */   revalidate: () => (/* binding */ revalidate)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_server_sqlite__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/server/sqlite */ \"(rsc)/./lib/server/sqlite.ts\");\nconst dynamic = 'force-dynamic';\nconst revalidate = 0;\n\n\nasync function GET() {\n    const db = (0,_lib_server_sqlite__WEBPACK_IMPORTED_MODULE_1__.getDB)();\n    const entities = db.prepare('SELECT COUNT(*) AS c FROM entities').get().c ?? 0;\n    const members = db.prepare('SELECT COUNT(*) AS c FROM members').get().c ?? 0;\n    const events = db.prepare('SELECT COUNT(*) AS c FROM events').get().c ?? 0;\n    const iso = db.prepare('SELECT COUNT(*) AS c FROM iso').get().c ?? 0;\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        entities,\n        members,\n        events,\n        iso\n    }, {\n        headers: {\n            'Cache-Control': 'no-store, max-age=0'\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3N0YXRzL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQU8sTUFBTUEsVUFBVSxnQkFBZTtBQUMvQixNQUFNQyxhQUFhLEVBQUM7QUFFZTtBQUNDO0FBRXBDLGVBQWVHO0lBQ3BCLE1BQU1DLEtBQUtGLHlEQUFLQTtJQUNoQixNQUFNRyxXQUFXLEdBQUlDLE9BQU8sQ0FBQyxzQ0FBc0NDLEdBQUcsR0FBV0MsQ0FBQyxJQUFJO0lBQ3RGLE1BQU1DLFVBQVcsR0FBSUgsT0FBTyxDQUFDLHFDQUFxQ0MsR0FBRyxHQUFZQyxDQUFDLElBQUk7SUFDdEYsTUFBTUUsU0FBVyxHQUFJSixPQUFPLENBQUMsb0NBQW9DQyxHQUFHLEdBQWFDLENBQUMsSUFBSTtJQUN0RixNQUFNRyxNQUFXLEdBQUlMLE9BQU8sQ0FBQyxpQ0FBaUNDLEdBQUcsR0FBZ0JDLENBQUMsSUFBSTtJQUV0RixPQUFPUCxxREFBWUEsQ0FBQ1csSUFBSSxDQUFDO1FBQUVQO1FBQVVJO1FBQVNDO1FBQVFDO0lBQUksR0FBRztRQUMzREUsU0FBUztZQUFFLGlCQUFpQjtRQUFzQjtJQUNwRDtBQUNGIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXFJhbW1haFxcT25lRHJpdmVcXERlc2t0b3BcXFNQQUNFXFx5b3V0aC1wbGF0Zm9ybVxcYXBwXFxhcGlcXHN0YXRzXFxyb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZHluYW1pYyA9ICdmb3JjZS1keW5hbWljJyAgICAgIFxyXG5leHBvcnQgY29uc3QgcmV2YWxpZGF0ZSA9IDAgICAgICAgICAgICAgICAgICBcclxuXHJcbmltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJ1xyXG5pbXBvcnQgeyBnZXREQiB9IGZyb20gJ0AvbGliL3NlcnZlci9zcWxpdGUnXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKCkge1xyXG4gIGNvbnN0IGRiID0gZ2V0REIoKVxyXG4gIGNvbnN0IGVudGl0aWVzID0gKGRiLnByZXBhcmUoJ1NFTEVDVCBDT1VOVCgqKSBBUyBjIEZST00gZW50aXRpZXMnKS5nZXQoKSBhcyBhbnkpLmMgPz8gMFxyXG4gIGNvbnN0IG1lbWJlcnMgID0gKGRiLnByZXBhcmUoJ1NFTEVDVCBDT1VOVCgqKSBBUyBjIEZST00gbWVtYmVycycpLmdldCgpICBhcyBhbnkpLmMgPz8gMFxyXG4gIGNvbnN0IGV2ZW50cyAgID0gKGRiLnByZXBhcmUoJ1NFTEVDVCBDT1VOVCgqKSBBUyBjIEZST00gZXZlbnRzJykuZ2V0KCkgICBhcyBhbnkpLmMgPz8gMFxyXG4gIGNvbnN0IGlzbyAgICAgID0gKGRiLnByZXBhcmUoJ1NFTEVDVCBDT1VOVCgqKSBBUyBjIEZST00gaXNvJykuZ2V0KCkgICAgICBhcyBhbnkpLmMgPz8gMFxyXG5cclxuICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlbnRpdGllcywgbWVtYmVycywgZXZlbnRzLCBpc28gfSwge1xyXG4gICAgaGVhZGVyczogeyAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZSwgbWF4LWFnZT0wJyB9IFxyXG4gIH0pXHJcbn1cclxuIl0sIm5hbWVzIjpbImR5bmFtaWMiLCJyZXZhbGlkYXRlIiwiTmV4dFJlc3BvbnNlIiwiZ2V0REIiLCJHRVQiLCJkYiIsImVudGl0aWVzIiwicHJlcGFyZSIsImdldCIsImMiLCJtZW1iZXJzIiwiZXZlbnRzIiwiaXNvIiwianNvbiIsImhlYWRlcnMiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/stats/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/server/sqlite.ts":
/*!******************************!*\
  !*** ./lib/server/sqlite.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   ensureTables: () => (/* binding */ ensureTables),\n/* harmony export */   getDB: () => (/* binding */ getDB),\n/* harmony export */   uid: () => (/* binding */ uid)\n/* harmony export */ });\n/* harmony import */ var better_sqlite3__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! better-sqlite3 */ \"better-sqlite3\");\n/* harmony import */ var better_sqlite3__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(better_sqlite3__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ \"fs\");\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! crypto */ \"crypto\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nlet db = null;\nfunction init(d) {\n    d.exec(`\n    PRAGMA foreign_keys = ON;\n\n    CREATE TABLE IF NOT EXISTS users (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      email TEXT NOT NULL UNIQUE,\n      password TEXT,\n      role TEXT NOT NULL,\n      interests TEXT,\n      entityId TEXT,\n      permissions TEXT\n    );\n\n    CREATE TABLE IF NOT EXISTS governance (\n      id TEXT PRIMARY KEY,\n      type TEXT NOT NULL,\n      title TEXT,\n      description TEXT,\n      entityId TEXT,\n      status TEXT,\n      meta TEXT,\n      createdAt TEXT NOT NULL,\n      updatedAt TEXT NOT NULL\n    );\n    CREATE INDEX IF NOT EXISTS idx_gov_entity ON governance(entityId);\n    CREATE INDEX IF NOT EXISTS idx_gov_status ON governance(status);\n\n    CREATE TABLE IF NOT EXISTS entities (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      type TEXT,\n      contactEmail TEXT,\n      phone TEXT,\n      location TEXT,\n      documents TEXT,\n      createdAt TEXT NOT NULL,\n      createdBy TEXT\n    );\n  CREATE TABLE IF NOT EXISTS join_requests (\n    id TEXT PRIMARY KEY,\n    userId TEXT NOT NULL,\n    userName TEXT NOT NULL,\n    userEmail TEXT NOT NULL,\n    entityId TEXT NOT NULL,\n    entityName TEXT NOT NULL,\n    note TEXT,\n    status TEXT NOT NULL,            -- \"pending\" | \"approved\" | \"rejected\"\n    createdAt TEXT NOT NULL,\n    decidedAt TEXT,\n    decidedBy TEXT\n  );\n  CREATE INDEX IF NOT EXISTS idx_join_user   ON join_requests(userId);\n  CREATE INDEX IF NOT EXISTS idx_join_entity ON join_requests(entityId);\n  CREATE INDEX IF NOT EXISTS idx_join_status ON join_requests(status);\n\n  CREATE INDEX IF NOT EXISTS idx_users_entityId ON users(entityId);\n    CREATE TABLE IF NOT EXISTS members (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      email TEXT,\n      phone TEXT,\n      entityId TEXT,\n      roleInEntity TEXT,\n      joinedAt TEXT NOT NULL\n    );\n\n    CREATE TABLE IF NOT EXISTS events (\n      id TEXT PRIMARY KEY,\n      title TEXT NOT NULL,\n      date TEXT,\n      status TEXT NOT NULL,\n      entityId TEXT\n    );\n\n    CREATE TABLE IF NOT EXISTS iso (\n      id TEXT PRIMARY KEY,\n      title TEXT NOT NULL,\n      code TEXT,\n      status TEXT NOT NULL,\n      ownerEntityId TEXT\n    );\n  `);\n    try {\n        const memberCols = d.prepare(`PRAGMA table_info(members)`).all();\n        if (!memberCols.some((c)=>String(c?.name) === \"roleInEntity\")) {\n            d.prepare(`ALTER TABLE members ADD COLUMN roleInEntity TEXT`).run();\n        }\n    } catch  {}\n    try {\n        const entCols = d.prepare(`PRAGMA table_info(entities)`).all();\n        if (!entCols.some((c)=>String(c?.name) === \"createdBy\")) {\n            d.prepare(`ALTER TABLE entities ADD COLUMN createdBy TEXT`).run();\n            d.prepare(`CREATE INDEX IF NOT EXISTS idx_entities_createdBy ON entities(createdBy)`).run();\n        }\n    } catch  {}\n}\nfunction getDB() {\n    if (db) return db;\n    const dataDir = path__WEBPACK_IMPORTED_MODULE_2___default().join(process.cwd(), \"data\");\n    if (!fs__WEBPACK_IMPORTED_MODULE_1___default().existsSync(dataDir)) fs__WEBPACK_IMPORTED_MODULE_1___default().mkdirSync(dataDir, {\n        recursive: true\n    });\n    const file = path__WEBPACK_IMPORTED_MODULE_2___default().join(dataDir, \"app.db\");\n    db = new (better_sqlite3__WEBPACK_IMPORTED_MODULE_0___default())(file);\n    db.pragma(\"journal_mode = WAL\");\n    init(db);\n    return db;\n}\nfunction ensureTables() {\n    getDB();\n}\nfunction uid() {\n    try {\n        return (0,crypto__WEBPACK_IMPORTED_MODULE_3__.randomUUID)();\n    } catch  {\n        return \"id_\" + Math.random().toString(36).slice(2) + Date.now().toString(36);\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc2VydmVyL3NxbGl0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFzQztBQUNsQjtBQUNJO0FBQ1k7QUFFcEMsSUFBSUksS0FBK0I7QUFFbkMsU0FBU0MsS0FBS0MsQ0FBb0I7SUFDaENBLEVBQUVDLElBQUksQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBa0ZSLENBQUM7SUFFRCxJQUFJO1FBQ0YsTUFBTUMsYUFBYUYsRUFBRUcsT0FBTyxDQUFDLENBQUMsMEJBQTBCLENBQUMsRUFBRUMsR0FBRztRQUM5RCxJQUFJLENBQUNGLFdBQVdHLElBQUksQ0FBQ0MsQ0FBQUEsSUFBS0MsT0FBT0QsR0FBR0UsVUFBVSxpQkFBaUI7WUFDN0RSLEVBQUVHLE9BQU8sQ0FBQyxDQUFDLGdEQUFnRCxDQUFDLEVBQUVNLEdBQUc7UUFDbkU7SUFDRixFQUFFLE9BQU0sQ0FBQztJQUVULElBQUk7UUFDRixNQUFNQyxVQUFVVixFQUFFRyxPQUFPLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFQyxHQUFHO1FBQzVELElBQUksQ0FBQ00sUUFBUUwsSUFBSSxDQUFDQyxDQUFBQSxJQUFLQyxPQUFPRCxHQUFHRSxVQUFVLGNBQWM7WUFDdkRSLEVBQUVHLE9BQU8sQ0FBQyxDQUFDLDhDQUE4QyxDQUFDLEVBQUVNLEdBQUc7WUFDL0RULEVBQUVHLE9BQU8sQ0FBQyxDQUFDLHdFQUF3RSxDQUFDLEVBQUVNLEdBQUc7UUFDM0Y7SUFDRixFQUFFLE9BQU0sQ0FBQztBQUNYO0FBRU8sU0FBU0U7SUFDZCxJQUFJYixJQUFJLE9BQU9BO0lBQ2YsTUFBTWMsVUFBVWhCLGdEQUFTLENBQUNrQixRQUFRQyxHQUFHLElBQUk7SUFDekMsSUFBSSxDQUFDcEIsb0RBQWEsQ0FBQ2lCLFVBQVVqQixtREFBWSxDQUFDaUIsU0FBUztRQUFFTSxXQUFXO0lBQUs7SUFDckUsTUFBTUMsT0FBT3ZCLGdEQUFTLENBQUNnQixTQUFTO0lBQ2hDZCxLQUFLLElBQUlKLHVEQUFRQSxDQUFDeUI7SUFDbEJyQixHQUFHc0IsTUFBTSxDQUFDO0lBQ1ZyQixLQUFLRDtJQUNMLE9BQU9BO0FBQ1Q7QUFFTyxTQUFTdUI7SUFBaUJWO0FBQVM7QUFFbkMsU0FBU1c7SUFDZCxJQUFJO1FBQUUsT0FBT3pCLGtEQUFVQTtJQUFJLEVBQzNCLE9BQU07UUFBRSxPQUFPLFFBQVEwQixLQUFLQyxNQUFNLEdBQUdDLFFBQVEsQ0FBQyxJQUFJQyxLQUFLLENBQUMsS0FBS0MsS0FBS0MsR0FBRyxHQUFHSCxRQUFRLENBQUM7SUFBSztBQUN4RiIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxSYW1tYWhcXE9uZURyaXZlXFxEZXNrdG9wXFxTUEFDRVxceW91dGgtcGxhdGZvcm1cXGxpYlxcc2VydmVyXFxzcWxpdGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IERhdGFiYXNlIGZyb20gXCJiZXR0ZXItc3FsaXRlM1wiO1xyXG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tIFwiY3J5cHRvXCI7XHJcblxyXG5sZXQgZGI6IERhdGFiYXNlLkRhdGFiYXNlIHwgbnVsbCA9IG51bGw7XHJcblxyXG5mdW5jdGlvbiBpbml0KGQ6IERhdGFiYXNlLkRhdGFiYXNlKSB7XHJcbiAgZC5leGVjKGBcclxuICAgIFBSQUdNQSBmb3JlaWduX2tleXMgPSBPTjtcclxuXHJcbiAgICBDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyB1c2VycyAoXHJcbiAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksXHJcbiAgICAgIG5hbWUgVEVYVCBOT1QgTlVMTCxcclxuICAgICAgZW1haWwgVEVYVCBOT1QgTlVMTCBVTklRVUUsXHJcbiAgICAgIHBhc3N3b3JkIFRFWFQsXHJcbiAgICAgIHJvbGUgVEVYVCBOT1QgTlVMTCxcclxuICAgICAgaW50ZXJlc3RzIFRFWFQsXHJcbiAgICAgIGVudGl0eUlkIFRFWFQsXHJcbiAgICAgIHBlcm1pc3Npb25zIFRFWFRcclxuICAgICk7XHJcblxyXG4gICAgQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ292ZXJuYW5jZSAoXHJcbiAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksXHJcbiAgICAgIHR5cGUgVEVYVCBOT1QgTlVMTCxcclxuICAgICAgdGl0bGUgVEVYVCxcclxuICAgICAgZGVzY3JpcHRpb24gVEVYVCxcclxuICAgICAgZW50aXR5SWQgVEVYVCxcclxuICAgICAgc3RhdHVzIFRFWFQsXHJcbiAgICAgIG1ldGEgVEVYVCxcclxuICAgICAgY3JlYXRlZEF0IFRFWFQgTk9UIE5VTEwsXHJcbiAgICAgIHVwZGF0ZWRBdCBURVhUIE5PVCBOVUxMXHJcbiAgICApO1xyXG4gICAgQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X2dvdl9lbnRpdHkgT04gZ292ZXJuYW5jZShlbnRpdHlJZCk7XHJcbiAgICBDUkVBVEUgSU5ERVggSUYgTk9UIEVYSVNUUyBpZHhfZ292X3N0YXR1cyBPTiBnb3Zlcm5hbmNlKHN0YXR1cyk7XHJcblxyXG4gICAgQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZW50aXRpZXMgKFxyXG4gICAgICBpZCBURVhUIFBSSU1BUlkgS0VZLFxyXG4gICAgICBuYW1lIFRFWFQgTk9UIE5VTEwsXHJcbiAgICAgIHR5cGUgVEVYVCxcclxuICAgICAgY29udGFjdEVtYWlsIFRFWFQsXHJcbiAgICAgIHBob25lIFRFWFQsXHJcbiAgICAgIGxvY2F0aW9uIFRFWFQsXHJcbiAgICAgIGRvY3VtZW50cyBURVhULFxyXG4gICAgICBjcmVhdGVkQXQgVEVYVCBOT1QgTlVMTCxcclxuICAgICAgY3JlYXRlZEJ5IFRFWFRcclxuICAgICk7XHJcbiAgQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgam9pbl9yZXF1ZXN0cyAoXHJcbiAgICBpZCBURVhUIFBSSU1BUlkgS0VZLFxyXG4gICAgdXNlcklkIFRFWFQgTk9UIE5VTEwsXHJcbiAgICB1c2VyTmFtZSBURVhUIE5PVCBOVUxMLFxyXG4gICAgdXNlckVtYWlsIFRFWFQgTk9UIE5VTEwsXHJcbiAgICBlbnRpdHlJZCBURVhUIE5PVCBOVUxMLFxyXG4gICAgZW50aXR5TmFtZSBURVhUIE5PVCBOVUxMLFxyXG4gICAgbm90ZSBURVhULFxyXG4gICAgc3RhdHVzIFRFWFQgTk9UIE5VTEwsICAgICAgICAgICAgLS0gXCJwZW5kaW5nXCIgfCBcImFwcHJvdmVkXCIgfCBcInJlamVjdGVkXCJcclxuICAgIGNyZWF0ZWRBdCBURVhUIE5PVCBOVUxMLFxyXG4gICAgZGVjaWRlZEF0IFRFWFQsXHJcbiAgICBkZWNpZGVkQnkgVEVYVFxyXG4gICk7XHJcbiAgQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X2pvaW5fdXNlciAgIE9OIGpvaW5fcmVxdWVzdHModXNlcklkKTtcclxuICBDUkVBVEUgSU5ERVggSUYgTk9UIEVYSVNUUyBpZHhfam9pbl9lbnRpdHkgT04gam9pbl9yZXF1ZXN0cyhlbnRpdHlJZCk7XHJcbiAgQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X2pvaW5fc3RhdHVzIE9OIGpvaW5fcmVxdWVzdHMoc3RhdHVzKTtcclxuXHJcbiAgQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X3VzZXJzX2VudGl0eUlkIE9OIHVzZXJzKGVudGl0eUlkKTtcclxuICAgIENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIG1lbWJlcnMgKFxyXG4gICAgICBpZCBURVhUIFBSSU1BUlkgS0VZLFxyXG4gICAgICBuYW1lIFRFWFQgTk9UIE5VTEwsXHJcbiAgICAgIGVtYWlsIFRFWFQsXHJcbiAgICAgIHBob25lIFRFWFQsXHJcbiAgICAgIGVudGl0eUlkIFRFWFQsXHJcbiAgICAgIHJvbGVJbkVudGl0eSBURVhULFxyXG4gICAgICBqb2luZWRBdCBURVhUIE5PVCBOVUxMXHJcbiAgICApO1xyXG5cclxuICAgIENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGV2ZW50cyAoXHJcbiAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksXHJcbiAgICAgIHRpdGxlIFRFWFQgTk9UIE5VTEwsXHJcbiAgICAgIGRhdGUgVEVYVCxcclxuICAgICAgc3RhdHVzIFRFWFQgTk9UIE5VTEwsXHJcbiAgICAgIGVudGl0eUlkIFRFWFRcclxuICAgICk7XHJcblxyXG4gICAgQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgaXNvIChcclxuICAgICAgaWQgVEVYVCBQUklNQVJZIEtFWSxcclxuICAgICAgdGl0bGUgVEVYVCBOT1QgTlVMTCxcclxuICAgICAgY29kZSBURVhULFxyXG4gICAgICBzdGF0dXMgVEVYVCBOT1QgTlVMTCxcclxuICAgICAgb3duZXJFbnRpdHlJZCBURVhUXHJcbiAgICApO1xyXG4gIGApO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgbWVtYmVyQ29scyA9IGQucHJlcGFyZShgUFJBR01BIHRhYmxlX2luZm8obWVtYmVycylgKS5hbGwoKSBhcyBhbnlbXTtcclxuICAgIGlmICghbWVtYmVyQ29scy5zb21lKGMgPT4gU3RyaW5nKGM/Lm5hbWUpID09PSBcInJvbGVJbkVudGl0eVwiKSkge1xyXG4gICAgICBkLnByZXBhcmUoYEFMVEVSIFRBQkxFIG1lbWJlcnMgQUREIENPTFVNTiByb2xlSW5FbnRpdHkgVEVYVGApLnJ1bigpO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge31cclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGVudENvbHMgPSBkLnByZXBhcmUoYFBSQUdNQSB0YWJsZV9pbmZvKGVudGl0aWVzKWApLmFsbCgpIGFzIGFueVtdO1xyXG4gICAgaWYgKCFlbnRDb2xzLnNvbWUoYyA9PiBTdHJpbmcoYz8ubmFtZSkgPT09IFwiY3JlYXRlZEJ5XCIpKSB7XHJcbiAgICAgIGQucHJlcGFyZShgQUxURVIgVEFCTEUgZW50aXRpZXMgQUREIENPTFVNTiBjcmVhdGVkQnkgVEVYVGApLnJ1bigpO1xyXG4gICAgICBkLnByZXBhcmUoYENSRUFURSBJTkRFWCBJRiBOT1QgRVhJU1RTIGlkeF9lbnRpdGllc19jcmVhdGVkQnkgT04gZW50aXRpZXMoY3JlYXRlZEJ5KWApLnJ1bigpO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge31cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERCKCkge1xyXG4gIGlmIChkYikgcmV0dXJuIGRiO1xyXG4gIGNvbnN0IGRhdGFEaXIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCJkYXRhXCIpO1xyXG4gIGlmICghZnMuZXhpc3RzU3luYyhkYXRhRGlyKSkgZnMubWtkaXJTeW5jKGRhdGFEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gIGNvbnN0IGZpbGUgPSBwYXRoLmpvaW4oZGF0YURpciwgXCJhcHAuZGJcIik7XHJcbiAgZGIgPSBuZXcgRGF0YWJhc2UoZmlsZSk7XHJcbiAgZGIucHJhZ21hKFwiam91cm5hbF9tb2RlID0gV0FMXCIpO1xyXG4gIGluaXQoZGIpO1xyXG4gIHJldHVybiBkYjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVRhYmxlcygpIHsgZ2V0REIoKTsgfVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVpZCgpIHtcclxuICB0cnkgeyByZXR1cm4gcmFuZG9tVVVJRCgpOyB9XHJcbiAgY2F0Y2ggeyByZXR1cm4gXCJpZF9cIiArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpICsgRGF0ZS5ub3coKS50b1N0cmluZygzNik7IH1cclxufVxyXG4iXSwibmFtZXMiOlsiRGF0YWJhc2UiLCJmcyIsInBhdGgiLCJyYW5kb21VVUlEIiwiZGIiLCJpbml0IiwiZCIsImV4ZWMiLCJtZW1iZXJDb2xzIiwicHJlcGFyZSIsImFsbCIsInNvbWUiLCJjIiwiU3RyaW5nIiwibmFtZSIsInJ1biIsImVudENvbHMiLCJnZXREQiIsImRhdGFEaXIiLCJqb2luIiwicHJvY2VzcyIsImN3ZCIsImV4aXN0c1N5bmMiLCJta2RpclN5bmMiLCJyZWN1cnNpdmUiLCJmaWxlIiwicHJhZ21hIiwiZW5zdXJlVGFibGVzIiwidWlkIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic2xpY2UiLCJEYXRlIiwibm93Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/server/sqlite.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstats%2Froute&page=%2Fapi%2Fstats%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstats%2Froute.ts&appDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstats%2Froute&page=%2Fapi%2Fstats%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstats%2Froute.ts&appDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_Rammah_OneDrive_Desktop_SPACE_youth_platform_app_api_stats_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/stats/route.ts */ \"(rsc)/./app/api/stats/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/stats/route\",\n        pathname: \"/api/stats\",\n        filename: \"route\",\n        bundlePath: \"app/api/stats/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\Rammah\\\\OneDrive\\\\Desktop\\\\SPACE\\\\youth-platform\\\\app\\\\api\\\\stats\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_Rammah_OneDrive_Desktop_SPACE_youth_platform_app_api_stats_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZzdGF0cyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGc3RhdHMlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZzdGF0cyUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNSYW1tYWglNUNPbmVEcml2ZSU1Q0Rlc2t0b3AlNUNTUEFDRSU1Q3lvdXRoLXBsYXRmb3JtJTVDYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj1DJTNBJTVDVXNlcnMlNUNSYW1tYWglNUNPbmVEcml2ZSU1Q0Rlc2t0b3AlNUNTUEFDRSU1Q3lvdXRoLXBsYXRmb3JtJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUNzQztBQUNuSDtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiQzpcXFxcVXNlcnNcXFxcUmFtbWFoXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcU1BBQ0VcXFxceW91dGgtcGxhdGZvcm1cXFxcYXBwXFxcXGFwaVxcXFxzdGF0c1xcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvc3RhdHMvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9zdGF0c1wiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvc3RhdHMvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJDOlxcXFxVc2Vyc1xcXFxSYW1tYWhcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxTUEFDRVxcXFx5b3V0aC1wbGF0Zm9ybVxcXFxhcHBcXFxcYXBpXFxcXHN0YXRzXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstats%2Froute&page=%2Fapi%2Fstats%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstats%2Froute.ts&appDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "better-sqlite3":
/*!*********************************!*\
  !*** external "better-sqlite3" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("better-sqlite3");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstats%2Froute&page=%2Fapi%2Fstats%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstats%2Froute.ts&appDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CRammah%5COneDrive%5CDesktop%5CSPACE%5Cyouth-platform&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();