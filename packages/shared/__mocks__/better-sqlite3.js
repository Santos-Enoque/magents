/**
 * Mock for better-sqlite3 module
 */

class MockDatabase {
  constructor() {
    this.isOpen = true;
  }

  prepare(sql) {
    return {
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      get: jest.fn().mockReturnValue(null),
      all: jest.fn().mockReturnValue([]),
      bind: jest.fn().mockReturnThis(),
    };
  }

  exec(sql) {
    return this;
  }

  close() {
    this.isOpen = false;
    return this;
  }

  pragma(pragmaString) {
    return this;
  }

  backup(destinationPath) {
    return Promise.resolve();
  }

  transaction(fn) {
    return function(...args) {
      return fn.apply(this, args);
    };
  }
}

module.exports = MockDatabase;