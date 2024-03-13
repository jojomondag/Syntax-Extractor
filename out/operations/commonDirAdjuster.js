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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdjustedCommonDir = void 0;
const path = __importStar(require("path"));
function getAdjustedCommonDir(allSelections, commonDir) {
    let nextDirLevel = "";
    for (let selection of allSelections) {
        const relativePath = path.relative(commonDir, selection.fsPath);
        const splitPath = relativePath.split(path.sep);
        if (splitPath[0]) {
            nextDirLevel = splitPath[0];
            break;
        }
    }
    return path.join(commonDir, nextDirLevel);
}
exports.getAdjustedCommonDir = getAdjustedCommonDir;
//# sourceMappingURL=commonDirAdjuster.js.map