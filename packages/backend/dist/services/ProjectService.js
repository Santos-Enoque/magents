"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const ProjectManager_1 = require("./ProjectManager");
const ProjectManagerDB_1 = require("./ProjectManagerDB");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * ProjectService factory that provides the appropriate implementation
 * based on whether the database has been initialized
 */
class ProjectService {
    /**
     * Get the appropriate ProjectManager implementation
     * This allows for graceful transition from file-based to database-based storage
     */
    static getInstance() {
        if (!ProjectService.instance) {
            // Check if database file exists to determine which implementation to use
            const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
            ProjectService.useDatabase = fs.existsSync(dbPath);
            if (ProjectService.useDatabase) {
                console.log('[ProjectService] Using database-backed implementation');
                ProjectService.instance = ProjectManagerDB_1.ProjectManagerDB.getInstance();
            }
            else {
                console.log('[ProjectService] Using file-based implementation');
                ProjectService.instance = ProjectManager_1.ProjectManager.getInstance();
            }
        }
        return ProjectService.instance;
    }
    /**
     * Force the service to use database implementation
     * Useful after running migration
     */
    static useDatabaseImplementation() {
        console.log('[ProjectService] Switching to database-backed implementation');
        ProjectService.useDatabase = true;
        ProjectService.instance = ProjectManagerDB_1.ProjectManagerDB.getInstance();
    }
    /**
     * Check if currently using database implementation
     */
    static isUsingDatabase() {
        return ProjectService.useDatabase;
    }
    /**
     * Reset the instance (useful for testing)
     */
    static reset() {
        ProjectService.instance = null;
        ProjectService.useDatabase = false;
    }
}
exports.ProjectService = ProjectService;
ProjectService.useDatabase = false;
//# sourceMappingURL=ProjectService.js.map