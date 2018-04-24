declare const fs: any;
declare const jsesc: any;
declare const pkg: any;
declare const dependencies: string[];
declare const unicodeVersion: string;
declare const highSurrogate: (codePoint: any) => number;
declare const lowSurrogate: (codePoint: any) => number;
declare const codePointToString: (codePoint: any) => string;
declare const createRange: (codePoints: any) => {
    bmp: string;
    astral: string;
    isBmpLast: boolean;
};
declare const createBmpRange: (r: any, { addBrackets }?: {
    addBrackets: boolean;
}) => string;
declare const assemble: ({ name, alias, codePoints }: {
    name: any;
    alias: any;
    codePoints: any;
}) => {
    name: any;
};
declare const writeFile: (name: any, object: any) => void;
