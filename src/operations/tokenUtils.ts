const { Tiktoken } = require("tiktoken/lite");
const cl100k_base = require("tiktoken/encoders/cl100k_base.json");

export function getTokenCount(text: string): number {
    const encoding = new Tiktoken(
        cl100k_base.bpe_ranks,
        cl100k_base.special_tokens,
        cl100k_base.pat_str
    );
    const tokens = encoding.encode(text);
    encoding.free();
    console.log(`Token count: ${tokens.length}`);
    return tokens.length;
}
