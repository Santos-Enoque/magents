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
exports.AgentService = void 0;
const cli_1 = require("@magents/cli");
const AgentManagerDB_1 = require("./AgentManagerDB");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * AgentService factory that provides the appropriate implementation
 * based on whether the database has been initialized
 */
class AgentService {
    /**
     * Get the appropriate AgentManager implementation
     * This allows for graceful transition from CLI-only to database-backed storage
     */
    static getInstance() {
        if (!AgentService.instance) {
            // Check if database file exists to determine which implementation to use
            const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
            AgentService.useDatabase = fs.existsSync(dbPath);
            if (AgentService.useDatabase) {
                console.log('[AgentService] Using database-backed implementation');
                AgentService.instance = AgentManagerDB_1.AgentManagerDB.getInstance();
            }
            else {
                console.log('[AgentService] Using CLI-only implementation');
                AgentService.instance = new cli_1.DockerAgentManager();
            }
        }
        return AgentService.instance;
    }
    /**
     * Force the service to use database implementation
     * Useful after running migration
     */
    static useDatabaseImplementation() {
        console.log('[AgentService] Switching to database-backed implementation');
        AgentService.useDatabase = true;
        AgentService.instance = AgentManagerDB_1.AgentManagerDB.getInstance();
    }
    /**
     * Check if currently using database implementation
     */
    static isUsingDatabase() {
        return AgentService.useDatabase;
    }
    /**
     * Reset the instance (useful for testing)
     */
    static reset() {
        AgentService.instance = null;
        AgentService.useDatabase = false;
    }
}
exports.AgentService = AgentService;
AgentService.useDatabase = false;
//# sourceMappingURL=AgentService.js.map