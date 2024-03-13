// Assuming this is in your 'operations.ts' file

import { Tiktoken } from "tiktoken/lite";
import * as cl100k_base from "tiktoken/encoders/cl100k_base.json";
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function getTokenCount(text: string): number {
    console.log("getting token count...");
    try {
        const encoding = new Tiktoken(
            cl100k_base.bpe_ranks,
            cl100k_base.special_tokens,
            cl100k_base.pat_str
        );
        const tokens = encoding.encode(text);
        encoding.free();
        console.log(`Token count: ${tokens.length}`);
        return tokens.length;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.stack || error.message : "An unknown error occurred";
        console.error('Error in getTokenCount:', message);

        // Log the error to a file on the desktop
        const desktopDir = path.join(os.homedir(), 'Desktop');
        const errorFilePath = path.join(desktopDir, 'token_count_error.log');
        const errorMessage = `Error in getTokenCount: ${message}\n`;

        fs.appendFileSync(errorFilePath, errorMessage);

        return 0;
    }
}