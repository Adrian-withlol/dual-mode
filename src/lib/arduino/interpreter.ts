/**
 * A small interpreter for the subset of Arduino C++ that hobby sketches use:
 * globals, functions, arrays, if/for/while/do/switch, #define, and the core
 * Arduino API (pinMode, digitalWrite/Read, analogRead/Write, millis, delay,
 * tone, Serial, map, constrain, random...).
 *
 * It is a tree-walking interpreter (no eval), so it runs under a strict CSP.
 * Execution is a generator: `delay()` suspends it, and the host resumes it on
 * a virtual clock, which is what lets the lab fast-forward a 10-minute timer.
 *
 * Numbers follow Arduino Uno widths on assignment (int = 16-bit, long =
 * 32-bit, byte = 8-bit), and `/` truncates unless a float is involved.
 * Intermediate overflow inside a single expression is not emulated.
 */

// ---------------------------------------------------------------- errors

export class SketchError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

// ---------------------------------------------------------------- lexer

type TokKind = "num" | "str" | "char" | "id" | "op" | "eof";
interface Tok {
  k: TokKind;
  v: string;
  line: number;
  float?: boolean;
  num?: number;
}

const OPS = [
  "<<=",
  ">>=",
  "...",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<",
  ">>",
  "->",
  "::",
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "<",
  ">",
  "!",
  "~",
  "&",
  "|",
  "^",
  "?",
  ":",
  ";",
  ",",
  ".",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
];

function lex(src: string, defines = new Map<string, Tok[]>()): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  let line = 1;
  let atLineStart = true;

  const push = (t: Tok) => {
    if (t.k === "id" && defines.has(t.v)) {
      for (const d of defines.get(t.v)!) toks.push({ ...d, line: t.line });
    } else toks.push(t);
  };

  while (i < src.length) {
    const c = src[i];
    if (c === "\n") {
      line++;
      i++;
      atLineStart = true;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }
    if (c === "#" && atLineStart) {
      let end = i;
      while (end < src.length && src[end] !== "\n") end++;
      const directive = src.slice(i + 1, end).trim();
      if (/^define\s+[A-Za-z_]\w*\(/.test(directive)) {
        throw new SketchError(
          "Function-style #define macros aren't supported. Use a function instead.",
          line,
        );
      }
      const m = /^define\s+([A-Za-z_]\w*)(\s+(.*))?$/.exec(directive);
      if (m) {
        defines.set(
          m[1],
          (m[3] ?? "").trim()
            ? lex(m[3]!, defines).filter((t) => t.k !== "eof")
            : [],
        );
      } else if (
        !/^(include|pragma|ifndef|ifdef|endif|if|else|undef)\b/.test(directive)
      ) {
        throw new SketchError(
          `Unsupported preprocessor line: #${directive}`,
          line,
        );
      }
      i = end;
      continue;
    }
    atLineStart = false;

    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      let text: string;
      let float = false;
      let num: number;
      if (c === "0" && /[xX]/.test(src[i + 1] ?? "")) {
        j += 2;
        while (/[0-9a-fA-F]/.test(src[j] ?? "")) j++;
        text = src.slice(i, j);
        num = parseInt(text, 16);
      } else if (c === "0" && /[bB]/.test(src[i + 1] ?? "")) {
        j += 2;
        while (/[01]/.test(src[j] ?? "")) j++;
        text = src.slice(i, j);
        num = parseInt(text.slice(2), 2);
      } else {
        while (/[0-9]/.test(src[j] ?? "")) j++;
        if (src[j] === ".") {
          float = true;
          j++;
          while (/[0-9]/.test(src[j] ?? "")) j++;
        }
        if (/[eE]/.test(src[j] ?? "")) {
          float = true;
          j++;
          if (/[+-]/.test(src[j] ?? "")) j++;
          while (/[0-9]/.test(src[j] ?? "")) j++;
        }
        text = src.slice(i, j);
        num = Number(text);
      }
      while (/[uUlLfF]/.test(src[j] ?? "")) {
        if (/[fF]/.test(src[j])) float = true;
        j++;
      }
      push({ k: "num", v: src.slice(i, j), line, float, num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (/\w/.test(src[j] ?? "")) j++;
      push({ k: "id", v: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let out = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\n")
          throw new SketchError("Unterminated string.", line);
        if (src[j] === "\\") {
          const e = src[j + 1];
          out += e === "n" ? "\n" : e === "t" ? "\t" : e === "0" ? "\0" : e;
          j += 2;
        } else out += src[j++];
      }
      if (j >= src.length) throw new SketchError("Unterminated string.", line);
      push(
        c === '"'
          ? { k: "str", v: out, line }
          : { k: "char", v: out, line, num: out.charCodeAt(0) || 0 },
      );
      i = j + 1;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new SketchError(`Unexpected character "${c}".`, line);
    push({ k: "op", v: op, line });
    i += op.length;
  }
  toks.push({ k: "eof", v: "", line });
  return toks;
}

// ---------------------------------------------------------------- types

/** Storage kinds with Uno widths. */
type Kind =
  "void" | "bool" | "u8" | "i8" | "i16" | "u16" | "i32" | "u32" | "float";

const TYPE_WORDS = new Set([
  "void",
  "int",
  "long",
  "short",
  "char",
  "byte",
  "bool",
  "boolean",
  "float",
  "double",
  "word",
  "unsigned",
  "signed",
  "uint8_t",
  "int8_t",
  "uint16_t",
  "int16_t",
  "uint32_t",
  "int32_t",
  "size_t",
  "const",
  "static",
  "volatile",
  "String",
]);

const SIZE: Record<Kind, number> = {
  void: 0,
  bool: 1,
  u8: 1,
  i8: 1,
  i16: 2,
  u16: 2,
  i32: 4,
  u32: 4,
  float: 4,
};

function coerce(kind: Kind, v: number): number {
  switch (kind) {
    case "float":
      return v;
    case "bool":
      return v ? 1 : 0;
    case "void":
      return 0;
    default: {
      const t = Math.trunc(v);
      if (!Number.isFinite(t)) return 0;
      switch (kind) {
        case "u8":
          return ((t % 256) + 256) % 256;
        case "i8":
          return ((((t + 128) % 256) + 256) % 256) - 128;
        case "u16":
          return ((t % 65536) + 65536) % 65536;
        case "i16":
          return ((((t + 32768) % 65536) + 65536) % 65536) - 32768;
        case "u32":
          return t >>> 0;
        case "i32":
          return t | 0;
      }
      return t;
    }
  }
}

// ---------------------------------------------------------------- AST

type Expr =
  | { t: "num"; v: number; f: boolean; line: number }
  | { t: "str"; v: string; line: number; f: false }
  | { t: "var"; name: string; line: number; f: boolean }
  | { t: "index"; arr: string; idx: Expr; line: number; f: boolean }
  | { t: "call"; name: string; args: Expr[]; line: number; f: boolean }
  | { t: "unary"; op: string; e: Expr; line: number; f: boolean }
  | {
      t: "update";
      op: "++" | "--";
      prefix: boolean;
      target: Expr;
      line: number;
      f: boolean;
    }
  | { t: "bin"; op: string; a: Expr; b: Expr; line: number; f: boolean }
  | {
      t: "assign";
      op: string;
      target: Expr;
      value: Expr;
      line: number;
      f: boolean;
    }
  | { t: "cond"; c: Expr; a: Expr; b: Expr; line: number; f: boolean }
  | { t: "cast"; kind: Kind; e: Expr; line: number; f: boolean }
  | { t: "sizeof"; e: Expr; line: number; f: false };

interface Decl {
  name: string;
  kind: Kind;
  size?: Expr | null;
  isArray: boolean;
  init?: Expr | Expr[] | string;
  line: number;
}

type Stmt =
  | { t: "decl"; decls: Decl[]; line: number }
  | { t: "expr"; e: Expr; line: number }
  | { t: "block"; body: Stmt[]; line: number }
  | { t: "if"; c: Expr; a: Stmt; b?: Stmt; line: number }
  | { t: "while"; c: Expr; body: Stmt; line: number }
  | { t: "do"; c: Expr; body: Stmt; line: number }
  | { t: "for"; init?: Stmt; c?: Expr; step?: Expr; body: Stmt; line: number }
  | {
      t: "switch";
      e: Expr;
      cases: { test: Expr | null; body: Stmt[] }[];
      line: number;
    }
  | { t: "return"; e?: Expr; line: number }
  | { t: "break"; line: number }
  | { t: "continue"; line: number }
  | { t: "empty"; line: number };

interface Fn {
  name: string;
  ret: Kind;
  params: { name: string; kind: Kind; isArray: boolean }[];
  body: Stmt;
  line: number;
}

interface Program {
  globals: Decl[];
  fns: Map<string, Fn>;
}

// ---------------------------------------------------------------- builtins

export const BUILTIN_CONSTANTS: Record<string, number> = {
  HIGH: 1,
  LOW: 0,
  INPUT: 0,
  OUTPUT: 1,
  INPUT_PULLUP: 2,
  LED_BUILTIN: 13,
  true: 1,
  false: 0,
  A0: 14,
  A1: 15,
  A2: 16,
  A3: 17,
  A4: 18,
  A5: 19,
  DEC: 10,
  HEX: 16,
  BIN: 2,
  OCT: 8,
  PI: Math.PI,
  HALF_PI: Math.PI / 2,
  TWO_PI: Math.PI * 2,
};

const FLOAT_BUILTINS = new Set([
  "sqrt",
  "sin",
  "cos",
  "tan",
  "pow",
  "fabs",
  "floor",
  "ceil",
  "atan2",
  "exp",
  "log",
]);

// ---------------------------------------------------------------- parser

class Parser {
  private p = 0;
  private scopes: Map<string, { kind: Kind; isArray: boolean }>[] = [new Map()];
  private fnRet = new Map<string, Kind>();
  private toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }

  private get cur() {
    return this.toks[this.p];
  }
  private peek(n = 1) {
    return this.toks[this.p + n];
  }
  private is(v: string) {
    return this.cur.k === "op" && this.cur.v === v;
  }
  private isWord(v: string) {
    return this.cur.k === "id" && this.cur.v === v;
  }
  private next() {
    return this.toks[this.p++];
  }
  private expect(v: string, what?: string): Tok {
    if (this.cur.v !== v || (this.cur.k !== "op" && this.cur.k !== "id")) {
      // A missing ";" belongs to the end of the previous line, not where the
      // next statement starts.
      const prev = this.toks[this.p - 1];
      const line = v === ";" && prev ? prev.line : this.cur.line;
      throw new SketchError(
        `Expected "${v}"${what ? ` ${what}` : ""} but found "${this.cur.v || "end of code"}".`,
        line,
      );
    }
    return this.next();
  }
  private ident(what: string): Tok {
    if (this.cur.k !== "id")
      throw new SketchError(
        `Expected ${what} but found "${this.cur.v || "end of code"}".`,
        this.cur.line,
      );
    return this.next();
  }

  private addSymbol(name: string, kind: Kind, isArray: boolean) {
    this.scopes[this.scopes.length - 1].set(name, { kind, isArray });
  }
  private lookup(name: string) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const s = this.scopes[i].get(name);
      if (s) return s;
    }
    return undefined;
  }

  private atType(): boolean {
    if (this.cur.k !== "id" || !TYPE_WORDS.has(this.cur.v)) return false;
    return true;
  }

  private parseType(): Kind {
    const words: string[] = [];
    while (this.atType()) words.push(this.next().v);
    const w = words.filter(
      (x) => x !== "const" && x !== "static" && x !== "volatile",
    );
    const has = (x: string) => w.includes(x);
    const line = this.cur.line;
    if (has("String"))
      throw new SketchError(
        'String objects aren\'t supported in the lab. Use numbers or "text" in Serial.print.',
        line,
      );
    if (has("void")) return "void";
    if (has("float") || has("double")) return "float";
    if (has("bool") || has("boolean")) return "bool";
    if (has("byte") || has("uint8_t")) return "u8";
    if (has("int8_t")) return "i8";
    if (has("char")) return has("unsigned") ? "u8" : "i8";
    if (has("uint16_t") || has("word")) return "u16";
    if (has("int16_t")) return "i16";
    if (has("uint32_t") || has("size_t")) return "u32";
    if (has("int32_t")) return "i32";
    if (has("long")) return has("unsigned") ? "u32" : "i32";
    if (has("int") || has("short") || has("unsigned") || has("signed"))
      return has("unsigned") ? "u16" : "i16";
    throw new SketchError("Missing a type.", line);
  }

  parseProgram(): Program {
    const globals: Decl[] = [];
    const fns = new Map<string, Fn>();
    // Pre-scan function return types so calls before definitions type-check.
    for (let i = 0; i < this.toks.length - 2; i++) {
      const a = this.toks[i],
        b = this.toks[i + 1],
        c = this.toks[i + 2];
      if (
        a.k === "id" &&
        TYPE_WORDS.has(a.v) &&
        b.k === "id" &&
        !TYPE_WORDS.has(b.v) &&
        c.k === "op" &&
        c.v === "("
      ) {
        this.fnRet.set(
          b.v,
          a.v === "float" || a.v === "double" ? "float" : "i16",
        );
      }
    }
    while (this.cur.k !== "eof") {
      if (this.is(";")) {
        this.next();
        continue;
      }
      const line = this.cur.line;
      if (!this.atType())
        throw new SketchError(
          `Expected a declaration or function but found "${this.cur.v}".`,
          line,
        );
      const kind = this.parseType();
      const name = this.ident("a name");
      if (this.is("(")) {
        const fn = this.parseFunction(kind, name.v, line);
        if (fn) {
          if (fns.has(fn.name))
            throw new SketchError(
              `Function "${fn.name}" is defined twice.`,
              line,
            );
          fns.set(fn.name, fn);
        }
      } else {
        this.p--;
        globals.push(...this.parseDeclarators(kind, line));
        this.expect(";", "after the declaration");
      }
    }
    return { globals, fns };
  }

  private parseFunction(ret: Kind, name: string, line: number): Fn | null {
    this.fnRet.set(name, ret);
    this.expect("(");
    const params: Fn["params"] = [];
    this.scopes.push(new Map());
    if (!this.is(")")) {
      if (this.isWord("void") && this.peek().v === ")") this.next();
      else {
        do {
          const kind = this.parseType();
          if (this.is("&") || this.is("*"))
            throw new SketchError(
              "Pointers and references aren't supported in the lab.",
              this.cur.line,
            );
          const pn = this.ident("a parameter name").v;
          let isArray = false;
          if (this.is("[")) {
            this.next();
            this.expect("]");
            isArray = true;
          }
          params.push({ name: pn, kind, isArray });
          this.addSymbol(pn, kind, isArray);
        } while (this.is(",") && this.next());
      }
    }
    this.expect(")");
    if (this.is(";")) {
      this.next();
      this.scopes.pop();
      return null;
    } // prototype
    const body = this.parseBlock();
    this.scopes.pop();
    return { name, ret, params, body, line };
  }

  private parseDeclarators(kind: Kind, line: number): Decl[] {
    const out: Decl[] = [];
    do {
      if (this.is("*") || this.is("&"))
        throw new SketchError(
          "Pointers and references aren't supported in the lab.",
          this.cur.line,
        );
      const name = this.ident("a variable name").v;
      let isArray = false;
      let size: Expr | null = null;
      if (this.is("[")) {
        this.next();
        isArray = true;
        if (!this.is("]")) size = this.parseExpr();
        this.expect("]");
        if (this.is("["))
          throw new SketchError(
            "Multi-dimensional arrays aren't supported in the lab.",
            this.cur.line,
          );
      }
      let init: Decl["init"];
      if (this.is("=")) {
        this.next();
        if (this.is("{")) {
          this.next();
          const items: Expr[] = [];
          while (!this.is("}")) {
            items.push(this.parseAssign());
            if (!this.is("}")) this.expect(",");
          }
          this.next();
          init = items;
        } else if (isArray && this.cur.k === "str") init = this.next().v;
        else init = this.parseAssign();
      }
      this.addSymbol(name, kind, isArray);
      out.push({ name, kind, isArray, size, init, line });
    } while (this.is(",") && this.next());
    return out;
  }

  private parseBlock(): Stmt {
    const line = this.expect("{").line;
    this.scopes.push(new Map());
    const body: Stmt[] = [];
    while (!this.is("}")) {
      if (this.cur.k === "eof")
        throw new SketchError('Missing a closing "}".', line);
      body.push(this.parseStmt());
    }
    this.next();
    this.scopes.pop();
    return { t: "block", body, line };
  }

  private parseStmt(): Stmt {
    const line = this.cur.line;
    if (this.is("{")) return this.parseBlock();
    if (this.is(";")) {
      this.next();
      return { t: "empty", line };
    }
    if (this.cur.k === "id") {
      switch (this.cur.v) {
        case "if": {
          this.next();
          this.expect("(");
          const c = this.parseExpr();
          this.expect(")");
          const a = this.parseStmt();
          let b: Stmt | undefined;
          if (this.isWord("else")) {
            this.next();
            b = this.parseStmt();
          }
          return { t: "if", c, a, b, line };
        }
        case "while": {
          this.next();
          this.expect("(");
          const c = this.parseExpr();
          this.expect(")");
          return { t: "while", c, body: this.parseStmt(), line };
        }
        case "do": {
          this.next();
          const body = this.parseStmt();
          if (!this.isWord("while"))
            throw new SketchError(
              'Expected "while" after a do block.',
              this.cur.line,
            );
          this.next();
          this.expect("(");
          const c = this.parseExpr();
          this.expect(")");
          this.expect(";");
          return { t: "do", c, body, line };
        }
        case "for": {
          this.next();
          this.expect("(");
          this.scopes.push(new Map());
          let init: Stmt | undefined;
          if (this.atType()) {
            const kind = this.parseType();
            init = {
              t: "decl",
              decls: this.parseDeclarators(kind, line),
              line,
            };
          } else if (!this.is(";"))
            init = { t: "expr", e: this.parseExpr(), line };
          this.expect(";");
          const c = this.is(";") ? undefined : this.parseExpr();
          this.expect(";");
          const step = this.is(")") ? undefined : this.parseExpr();
          this.expect(")");
          const body = this.parseStmt();
          this.scopes.pop();
          return { t: "for", init, c, step, body, line };
        }
        case "switch": {
          this.next();
          this.expect("(");
          const e = this.parseExpr();
          this.expect(")");
          this.expect("{");
          const cases: { test: Expr | null; body: Stmt[] }[] = [];
          this.scopes.push(new Map());
          while (!this.is("}")) {
            if (this.isWord("case")) {
              this.next();
              const test = this.parseExpr();
              this.expect(":");
              cases.push({ test, body: [] });
            } else if (this.isWord("default")) {
              this.next();
              this.expect(":");
              cases.push({ test: null, body: [] });
            } else {
              if (!cases.length)
                throw new SketchError(
                  'Expected "case" inside switch.',
                  this.cur.line,
                );
              cases[cases.length - 1].body.push(this.parseStmt());
            }
          }
          this.next();
          this.scopes.pop();
          return { t: "switch", e, cases, line };
        }
        case "return": {
          this.next();
          const e = this.is(";") ? undefined : this.parseExpr();
          this.expect(";");
          return { t: "return", e, line };
        }
        case "break":
          this.next();
          this.expect(";");
          return { t: "break", line };
        case "continue":
          this.next();
          this.expect(";");
          return { t: "continue", line };
      }
      if (this.atType() && !(this.peek().k === "op" && this.peek().v === "(")) {
        const kind = this.parseType();
        const decls = this.parseDeclarators(kind, line);
        this.expect(";", "after the declaration");
        return { t: "decl", decls, line };
      }
    }
    const e = this.parseExpr();
    this.expect(";", "at the end of the line");
    return { t: "expr", e, line };
  }

  // Expressions --------------------------------------------------------

  parseExpr(): Expr {
    let e = this.parseAssign();
    while (this.is(",")) {
      const line = this.next().line;
      const b = this.parseAssign();
      e = { t: "bin", op: ",", a: e, b, line, f: b.f };
    }
    return e;
  }

  private parseAssign(): Expr {
    const left = this.parseCond();
    if (
      this.cur.k === "op" &&
      [
        "=",
        "+=",
        "-=",
        "*=",
        "/=",
        "%=",
        "&=",
        "|=",
        "^=",
        "<<=",
        ">>=",
      ].includes(this.cur.v)
    ) {
      const line = this.cur.line;
      const op = this.next().v;
      if (left.t !== "var" && left.t !== "index")
        throw new SketchError(
          "Can only assign to a variable or array element.",
          line,
        );
      const value = this.parseAssign();
      return { t: "assign", op, target: left, value, line, f: left.f };
    }
    return left;
  }

  private parseCond(): Expr {
    const c = this.parseBin(0);
    if (this.is("?")) {
      const line = this.next().line;
      const a = this.parseAssign();
      this.expect(":");
      const b = this.parseAssign();
      return { t: "cond", c, a, b, line, f: a.f || b.f };
    }
    return c;
  }

  private static LEVELS = [
    ["||"],
    ["&&"],
    ["|"],
    ["^"],
    ["&"],
    ["==", "!="],
    ["<", ">", "<=", ">="],
    ["<<", ">>"],
    ["+", "-"],
    ["*", "/", "%"],
  ];

  private parseBin(level: number): Expr {
    if (level >= Parser.LEVELS.length) return this.parseUnary();
    let a = this.parseBin(level + 1);
    while (this.cur.k === "op" && Parser.LEVELS[level].includes(this.cur.v)) {
      const line = this.cur.line;
      const op = this.next().v;
      const b = this.parseBin(level + 1);
      const cmp = ["||", "&&", "==", "!=", "<", ">", "<=", ">="].includes(op);
      a = { t: "bin", op, a, b, line, f: !cmp && (a.f || b.f) };
    }
    return a;
  }

  private parseUnary(): Expr {
    const line = this.cur.line;
    if (this.cur.k === "op") {
      if (this.is("++") || this.is("--")) {
        const op = this.next().v as "++" | "--";
        const target = this.parseUnary();
        if (target.t !== "var" && target.t !== "index")
          throw new SketchError(`"${op}" needs a variable.`, line);
        return { t: "update", op, prefix: true, target, line, f: target.f };
      }
      if (this.is("!") || this.is("-") || this.is("+") || this.is("~")) {
        const op = this.next().v;
        const e = this.parseUnary();
        return { t: "unary", op, e, line, f: op === "!" ? false : e.f };
      }
      if (
        this.is("(") &&
        this.peek().k === "id" &&
        TYPE_WORDS.has(this.peek().v)
      ) {
        this.next();
        const kind = this.parseType();
        this.expect(")");
        const e = this.parseUnary();
        return { t: "cast", kind, e, line, f: kind === "float" };
      }
      if (this.is("*") || this.is("&"))
        throw new SketchError("Pointers aren't supported in the lab.", line);
    }
    if (this.isWord("sizeof")) {
      this.next();
      this.expect("(");
      let e: Expr;
      if (this.atType()) {
        const kind = this.parseType();
        e = { t: "num", v: SIZE[kind], f: false, line };
      } else e = this.parseExpr();
      this.expect(")");
      return { t: "sizeof", e, line, f: false };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let e = this.parsePrimary();
    while (this.is("++") || this.is("--")) {
      const line = this.cur.line;
      const op = this.next().v as "++" | "--";
      if (e.t !== "var" && e.t !== "index")
        throw new SketchError(`"${op}" needs a variable.`, line);
      e = { t: "update", op, prefix: false, target: e, line, f: e.f };
    }
    return e;
  }

  private parsePrimary(): Expr {
    const tok = this.cur;
    const line = tok.line;
    if (tok.k === "num") {
      this.next();
      return { t: "num", v: tok.num!, f: !!tok.float, line };
    }
    if (tok.k === "char") {
      this.next();
      return { t: "num", v: tok.num!, f: false, line };
    }
    if (tok.k === "str") {
      this.next();
      let v = tok.v;
      while (this.cur.k === "str") v += this.next().v; // adjacent literals concatenate
      return { t: "str", v, line, f: false };
    }
    if (this.is("(")) {
      this.next();
      const e = this.parseExpr();
      this.expect(")");
      return e;
    }
    if (tok.k === "id") {
      this.next();
      let name = tok.v;
      if (this.is(".") || this.is("::")) {
        this.next();
        name += "." + this.ident("a member name").v;
      }
      if (this.is("(")) {
        this.next();
        const args: Expr[] = [];
        while (!this.is(")")) {
          args.push(this.parseAssign());
          if (!this.is(")")) this.expect(",");
        }
        this.next();
        const ret = this.fnRet.get(name);
        const f =
          ret === "float" ||
          FLOAT_BUILTINS.has(name) ||
          (["min", "max", "abs", "constrain"].includes(name) &&
            args.some((a) => a.f));
        return { t: "call", name, args, line, f };
      }
      if (this.is("[")) {
        this.next();
        const idx = this.parseExpr();
        this.expect("]");
        const s = this.lookup(name);
        return { t: "index", arr: name, idx, line, f: s?.kind === "float" };
      }
      const s = this.lookup(name);
      if (!s && !(name in BUILTIN_CONSTANTS))
        throw new SketchError(`"${name}" isn't declared.`, line);
      return {
        t: "var",
        name,
        line,
        f:
          s?.kind === "float" ||
          name === "PI" ||
          name === "HALF_PI" ||
          name === "TWO_PI",
      };
    }
    throw new SketchError(`Unexpected "${tok.v || "end of code"}".`, line);
  }
}

export function parseSketch(source: string): Program {
  const prog = new Parser(lex(source)).parseProgram();
  if (!prog.fns.has("setup"))
    throw new SketchError("Every sketch needs a setup() function.", 1);
  if (!prog.fns.has("loop"))
    throw new SketchError("Every sketch needs a loop() function.", 1);
  return prog;
}

// ---------------------------------------------------------------- runtime

export interface Hardware {
  pinMode(pin: number, mode: number): void;
  digitalWrite(pin: number, value: number): void;
  digitalRead(pin: number): number;
  analogRead(pin: number): number;
  analogWrite(pin: number, value: number): void;
  tone(pin: number, freq: number, durationMs?: number): void;
  noTone(pin: number): void;
  serial(text: string): void;
}

interface Cell {
  kind: Kind;
  value: number[] | number;
  isArray: boolean;
}

class Env {
  vars = new Map<string, Cell>();
  parent: Env | null;
  constructor(parent: Env | null) {
    this.parent = parent;
  }
  get(name: string): Cell | undefined {
    return this.vars.get(name) ?? this.parent?.get(name);
  }
}

type Yield = { type: "delay"; ms: number } | { type: "slice" };

class Signal {
  kind: "break" | "continue" | "return";
  value: number;
  constructor(kind: "break" | "continue" | "return", value = 0) {
    this.kind = kind;
    this.value = value;
  }
}

/** Statements executed before the machine yields so the page stays responsive. */
const SLICE = 4000;
/** Approximate Uno cost of one interpreted statement, in ms of virtual time. */
const STMT_MS = 0.0005;

export class Machine {
  private prog: Program;
  private gen: Generator<Yield, void, void> | null = null;
  private globals = new Env(null);
  private steps = 0;
  private depth = 0;
  /** Virtual time the sketch sees, in ms. */
  time = 0;
  private wakeAt = 0;
  private seed = 1;
  error: SketchError | null = null;
  private hw: Hardware;

  constructor(source: string, hw: Hardware) {
    this.hw = hw;
    this.prog = parseSketch(source);
  }

  millis() {
    return Math.floor(this.time) >>> 0;
  }

  /**
   * Run the sketch up to virtual time `until`. Delays are honored exactly
   * (time jumps to each wake-up), so fast-forwarding keeps timing correct.
   */
  runUntil(until: number): void {
    if (this.error) return;
    if (!this.gen) this.gen = this.main();
    let budget = 60; // slices per call keeps a busy sketch from freezing the tab
    try {
      while (budget-- > 0) {
        if (this.wakeAt > this.time) {
          if (this.wakeAt > until) {
            this.time = until;
            return;
          }
          this.time = this.wakeAt;
        }
        const r = this.gen.next();
        if (r.done) return;
        if (r.value.type === "delay")
          this.wakeAt = this.time + Math.max(0, r.value.ms);
        else this.time = Math.min(until, this.time + SLICE * STMT_MS);
      }
      if (this.wakeAt <= this.time) this.time = Math.max(this.time, until);
    } catch (e) {
      this.error =
        e instanceof SketchError
          ? e
          : new SketchError(e instanceof Error ? e.message : String(e), 0);
    }
  }

  private *main(): Generator<Yield, void, void> {
    for (const d of this.prog.globals) yield* this.declareVar(d, this.globals);
    yield* this.callUser("setup", [], 0);
    for (;;) {
      yield* this.callUser("loop", [], 0);
      yield { type: "slice" };
    }
  }

  private *tick(line: number): Generator<Yield, void, void> {
    if (++this.steps % SLICE === 0) yield { type: "slice" };
    void line;
  }

  private *declareVar(d: Decl, env: Env): Generator<Yield, void, void> {
    if (env.vars.has(d.name))
      throw new SketchError(`"${d.name}" is already declared here.`, d.line);
    if (d.isArray) {
      let n = d.size ? coerce("i32", yield* this.eval(d.size, env)) : -1;
      let values: number[] = [];
      if (Array.isArray(d.init)) {
        for (const x of d.init)
          values.push(coerce(d.kind, yield* this.eval(x, env)));
      } else if (typeof d.init === "string") {
        values = [...d.init].map((ch) => ch.charCodeAt(0)).concat(0);
      }
      if (n < 0) n = values.length;
      if (n <= 0 || n > 4096)
        throw new SketchError(
          `Array "${d.name}" needs a size between 1 and 4096.`,
          d.line,
        );
      if (values.length > n)
        throw new SketchError(`Too many values for "${d.name}[${n}]".`, d.line);
      while (values.length < n) values.push(0);
      env.vars.set(d.name, { kind: d.kind, value: values, isArray: true });
    } else {
      const v =
        d.init === undefined
          ? 0
          : coerce(d.kind, yield* this.eval(d.init as Expr, env));
      env.vars.set(d.name, { kind: d.kind, value: v, isArray: false });
    }
  }

  private *callUser(
    name: string,
    args: (number | Cell)[],
    line: number,
  ): Generator<Yield, number, void> {
    const fn = this.prog.fns.get(name)!;
    if (args.length !== fn.params.length)
      throw new SketchError(
        `${name}() expects ${fn.params.length} argument(s).`,
        line,
      );
    if (++this.depth > 200)
      throw new SketchError(
        "Too much recursion (more than 200 nested calls).",
        line,
      );
    const env = new Env(this.globals);
    fn.params.forEach((p, i) => {
      const a = args[i];
      if (p.isArray) {
        if (typeof a === "number")
          throw new SketchError(
            `${name}() expects an array for "${p.name}".`,
            line,
          );
        env.vars.set(p.name, a); // arrays pass by reference, like C
      } else
        env.vars.set(p.name, {
          kind: p.kind,
          value: coerce(p.kind, typeof a === "number" ? a : 0),
          isArray: false,
        });
    });
    try {
      const sig = yield* this.exec(fn.body, env);
      if (sig && sig.kind === "return") return coerce(fn.ret, sig.value);
      return 0;
    } finally {
      this.depth--;
    }
  }

  private *exec(s: Stmt, env: Env): Generator<Yield, Signal | void, void> {
    yield* this.tick(s.line);
    switch (s.t) {
      case "empty":
        return;
      case "expr":
        yield* this.eval(s.e, env);
        return;
      case "decl":
        for (const d of s.decls) yield* this.declareVar(d, env);
        return;
      case "block": {
        const inner = new Env(env);
        for (const st of s.body) {
          const sig = yield* this.exec(st, inner);
          if (sig) return sig;
        }
        return;
      }
      case "if":
        if (yield* this.eval(s.c, env)) return yield* this.exec(s.a, env);
        if (s.b) return yield* this.exec(s.b, env);
        return;
      case "while":
        while (yield* this.eval(s.c, env)) {
          const sig = yield* this.exec(s.body, env);
          if (sig?.kind === "break") break;
          if (sig?.kind === "return") return sig;
          yield* this.tick(s.line);
        }
        return;
      case "do":
        do {
          const sig = yield* this.exec(s.body, env);
          if (sig?.kind === "break") break;
          if (sig?.kind === "return") return sig;
        } while (yield* this.eval(s.c, env));
        return;
      case "for": {
        const inner = new Env(env);
        if (s.init) yield* this.exec(s.init, inner);
        while (!s.c || (yield* this.eval(s.c, inner))) {
          const sig = yield* this.exec(s.body, inner);
          if (sig?.kind === "break") break;
          if (sig?.kind === "return") return sig;
          if (s.step) yield* this.eval(s.step, inner);
          yield* this.tick(s.line);
        }
        return;
      }
      case "switch": {
        const v = yield* this.eval(s.e, env);
        let matched = -1;
        for (let i = 0; i < s.cases.length && matched < 0; i++) {
          const t = s.cases[i].test;
          if (t && (yield* this.eval(t, env)) === v) matched = i;
        }
        if (matched < 0) matched = s.cases.findIndex((c) => c.test === null);
        if (matched < 0) return;
        const inner = new Env(env);
        for (let i = matched; i < s.cases.length; i++) {
          for (const st of s.cases[i].body) {
            const sig = yield* this.exec(st, inner);
            if (sig?.kind === "break") return;
            if (sig) return sig;
          }
        }
        return;
      }
      case "return":
        return new Signal("return", s.e ? yield* this.eval(s.e, env) : 0);
      case "break":
        return new Signal("break");
      case "continue":
        return new Signal("continue");
    }
  }

  private cell(name: string, env: Env, line: number): Cell {
    const c = env.get(name);
    if (!c) throw new SketchError(`"${name}" isn't declared.`, line);
    return c;
  }

  private *read(target: Expr, env: Env): Generator<Yield, number, void> {
    if (target.t === "var") {
      if (!env.get(target.name) && target.name in BUILTIN_CONSTANTS)
        return BUILTIN_CONSTANTS[target.name];
      const c = this.cell(target.name, env, target.line);
      if (c.isArray)
        throw new SketchError(
          `"${target.name}" is an array; use ${target.name}[i].`,
          target.line,
        );
      return c.value as number;
    }
    if (target.t === "index") {
      const c = this.cell(target.arr, env, target.line);
      if (!c.isArray)
        throw new SketchError(`"${target.arr}" isn't an array.`, target.line);
      const i = coerce("i32", yield* this.eval(target.idx, env));
      const arr = c.value as number[];
      if (i < 0 || i >= arr.length)
        throw new SketchError(
          `Index ${i} is outside ${target.arr}[${arr.length}]. On a real board this reads garbage memory.`,
          target.line,
        );
      return arr[i];
    }
    return yield* this.eval(target, env);
  }

  private *write(
    target: Expr,
    v: number,
    env: Env,
  ): Generator<Yield, number, void> {
    if (target.t === "var") {
      if (!env.get(target.name) && target.name in BUILTIN_CONSTANTS)
        throw new SketchError(
          `"${target.name}" is a built-in constant.`,
          target.line,
        );
      const c = this.cell(target.name, env, target.line);
      if (c.isArray)
        throw new SketchError(
          `Can't assign to the whole array "${target.name}".`,
          target.line,
        );
      c.value = coerce(c.kind, v);
      return c.value;
    }
    if (target.t === "index") {
      const c = this.cell(target.arr, env, target.line);
      const i = coerce("i32", yield* this.eval(target.idx, env));
      const arr = c.value as number[];
      if (i < 0 || i >= arr.length)
        throw new SketchError(
          `Index ${i} is outside ${target.arr}[${arr.length}]. On a real board this corrupts memory.`,
          target.line,
        );
      arr[i] = coerce(c.kind, v);
      return arr[i];
    }
    throw new SketchError(
      "Can only assign to a variable or array element.",
      target.line,
    );
  }

  private binop(
    op: string,
    a: number,
    b: number,
    isFloat: boolean,
    line: number,
  ): number {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        if (b === 0) {
          if (isFloat) return a / b;
          throw new SketchError("Division by zero.", line);
        }
        return isFloat ? a / b : Math.trunc(a / b);
      case "%":
        if (b === 0) throw new SketchError("Modulo by zero.", line);
        return isFloat ? a % b : Math.trunc(a) % Math.trunc(b);
      case "<<":
        return Math.trunc(a) * 2 ** Math.trunc(b);
      case ">>":
        return a >= 0 ? Math.floor(a / 2 ** b) : a >> b;
      case "&":
        return (a & b) >>> 0;
      case "|":
        return (a | b) >>> 0;
      case "^":
        return (a ^ b) >>> 0;
      case "==":
        return a === b ? 1 : 0;
      case "!=":
        return a !== b ? 1 : 0;
      case "<":
        return a < b ? 1 : 0;
      case ">":
        return a > b ? 1 : 0;
      case "<=":
        return a <= b ? 1 : 0;
      case ">=":
        return a >= b ? 1 : 0;
    }
    throw new SketchError(`Unsupported operator "${op}".`, line);
  }

  private *eval(e: Expr, env: Env): Generator<Yield, number, void> {
    switch (e.t) {
      case "num":
        return e.v;
      case "str":
        throw new SketchError(
          "Text can only be used inside Serial.print().",
          e.line,
        );
      case "var":
      case "index":
        return yield* this.read(e, env);
      case "sizeof": {
        const x = e.e;
        if (x.t === "num") return x.v;
        if (x.t === "var") {
          const c = env.get(x.name);
          if (c)
            return (
              (c.isArray ? (c.value as number[]).length : 1) *
              (SIZE[c.kind] || 1)
            );
        }
        if (x.t === "index") {
          const c = env.get(x.arr);
          if (c) return SIZE[c.kind] || 1;
        }
        return 2;
      }
      case "unary": {
        const v = yield* this.eval(e.e, env);
        if (e.op === "!") return v ? 0 : 1;
        if (e.op === "-") return -v;
        if (e.op === "~") return ~v;
        return v;
      }
      case "cast":
        return coerce(e.kind, yield* this.eval(e.e, env));
      case "cond":
        return (yield* this.eval(e.c, env))
          ? yield* this.eval(e.a, env)
          : yield* this.eval(e.b, env);
      case "update": {
        const old = yield* this.read(e.target, env);
        const nv = yield* this.write(
          e.target,
          e.op === "++" ? old + 1 : old - 1,
          env,
        );
        return e.prefix ? nv : old;
      }
      case "assign": {
        let v = yield* this.eval(e.value, env);
        if (e.op !== "=")
          v = this.binop(
            e.op.slice(0, -1),
            yield* this.read(e.target, env),
            v,
            e.f || e.value.f,
            e.line,
          );
        return yield* this.write(e.target, v, env);
      }
      case "bin": {
        if (e.op === "&&")
          return (yield* this.eval(e.a, env))
            ? (yield* this.eval(e.b, env))
              ? 1
              : 0
            : 0;
        if (e.op === "||")
          return (yield* this.eval(e.a, env))
            ? 1
            : (yield* this.eval(e.b, env))
              ? 1
              : 0;
        if (e.op === ",") {
          yield* this.eval(e.a, env);
          return yield* this.eval(e.b, env);
        }
        const a = yield* this.eval(e.a, env);
        const b = yield* this.eval(e.b, env);
        return this.binop(e.op, a, b, e.a.f || e.b.f, e.line);
      }
      case "call":
        return yield* this.call(e, env);
    }
  }

  private *args(
    e: Extract<Expr, { t: "call" }>,
    env: Env,
    n: number | [number, number],
  ): Generator<Yield, number[], void> {
    const [lo, hi] = typeof n === "number" ? [n, n] : n;
    if (e.args.length < lo || e.args.length > hi) {
      throw new SketchError(
        `${e.name}() expects ${lo === hi ? lo : `${lo} to ${hi}`} argument(s).`,
        e.line,
      );
    }
    const out: number[] = [];
    for (const a of e.args) out.push(yield* this.eval(a, env));
    return out;
  }

  private *call(
    e: Extract<Expr, { t: "call" }>,
    env: Env,
  ): Generator<Yield, number, void> {
    if (this.prog.fns.has(e.name)) {
      const fn = this.prog.fns.get(e.name)!;
      const vals: (number | Cell)[] = [];
      for (let i = 0; i < e.args.length; i++) {
        const a = e.args[i];
        if (fn.params[i]?.isArray && a.t === "var")
          vals.push(this.cell(a.name, env, a.line));
        else vals.push(yield* this.eval(a, env));
      }
      return yield* this.callUser(e.name, vals, e.line);
    }
    const hw = this.hw;
    switch (e.name) {
      case "pinMode": {
        const [p, m] = yield* this.args(e, env, 2);
        hw.pinMode(p, m);
        return 0;
      }
      case "digitalWrite": {
        const [p, v] = yield* this.args(e, env, 2);
        hw.digitalWrite(p, v ? 1 : 0);
        return 0;
      }
      case "digitalRead": {
        const [p] = yield* this.args(e, env, 1);
        return hw.digitalRead(p);
      }
      case "analogRead": {
        const [p] = yield* this.args(e, env, 1);
        return hw.analogRead(p < 14 ? p + 14 : p);
      }
      case "analogWrite": {
        const [p, v] = yield* this.args(e, env, 2);
        hw.analogWrite(p, Math.max(0, Math.min(255, Math.trunc(v))));
        return 0;
      }
      case "millis":
        yield* this.args(e, env, 0);
        return this.millis();
      case "micros":
        yield* this.args(e, env, 0);
        return Math.floor(this.time * 1000) >>> 0;
      case "delay": {
        const [ms] = yield* this.args(e, env, 1);
        yield { type: "delay", ms: Math.max(0, ms) };
        return 0;
      }
      case "delayMicroseconds": {
        const [us] = yield* this.args(e, env, 1);
        yield { type: "delay", ms: Math.max(0, us) / 1000 };
        return 0;
      }
      case "tone": {
        const v = yield* this.args(e, env, [2, 3]);
        hw.tone(v[0], v[1], v[2]);
        return 0;
      }
      case "noTone": {
        const [p] = yield* this.args(e, env, 1);
        hw.noTone(p);
        return 0;
      }
      case "random": {
        const v = yield* this.args(e, env, [1, 2]);
        const [lo, hi] = v.length === 1 ? [0, v[0]] : v;
        this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
        return hi <= lo ? lo : lo + (this.seed % Math.trunc(hi - lo));
      }
      case "randomSeed": {
        const [s] = yield* this.args(e, env, 1);
        this.seed = Math.abs(Math.trunc(s)) || 1;
        return 0;
      }
      case "map": {
        const [x, a, b, c, d] = yield* this.args(e, env, 5);
        if (b === a)
          throw new SketchError(
            "map() needs fromLow and fromHigh to differ.",
            e.line,
          );
        return Math.trunc(((x - a) * (d - c)) / (b - a) + c);
      }
      case "constrain": {
        const [x, a, b] = yield* this.args(e, env, 3);
        return Math.min(Math.max(x, a), b);
      }
      case "min": {
        const [a, b] = yield* this.args(e, env, 2);
        return Math.min(a, b);
      }
      case "max": {
        const [a, b] = yield* this.args(e, env, 2);
        return Math.max(a, b);
      }
      case "abs":
      case "fabs": {
        const [a] = yield* this.args(e, env, 1);
        return Math.abs(a);
      }
      case "sqrt": {
        const [a] = yield* this.args(e, env, 1);
        return Math.sqrt(a);
      }
      case "pow": {
        const [a, b] = yield* this.args(e, env, 2);
        return a ** b;
      }
      case "sin":
      case "cos":
      case "tan":
      case "floor":
      case "ceil":
      case "exp":
      case "log": {
        const [a] = yield* this.args(e, env, 1);
        return (Math[e.name] as (x: number) => number)(a);
      }
      case "atan2": {
        const [a, b] = yield* this.args(e, env, 2);
        return Math.atan2(a, b);
      }
      case "bitRead": {
        const [x, n] = yield* this.args(e, env, 2);
        return (x >> n) & 1;
      }
      case "Serial.begin":
        yield* this.args(e, env, [1, 2]);
        return 0;
      case "Serial.print":
      case "Serial.println": {
        if (e.args.length > 2)
          throw new SketchError(
            `${e.name}() takes a value and an optional format.`,
            e.line,
          );
        let text = "";
        const first = e.args[0];
        if (first) {
          if (first.t === "str") text = first.v;
          else {
            const v = yield* this.eval(first, env);
            const fmt = e.args[1]
              ? yield* this.eval(e.args[1], env)
              : first.f
                ? -1
                : 10;
            text =
              fmt === -1
                ? v.toFixed(2)
                : first.f && e.args[1]
                  ? v.toFixed(Math.max(0, Math.trunc(fmt)))
                  : Math.trunc(v)
                      .toString(Math.trunc(fmt) || 10)
                      .toUpperCase();
          }
        }
        hw.serial(e.name === "Serial.println" ? text + "\n" : text);
        return 0;
      }
    }
    throw new SketchError(
      `${e.name}() isn't supported in the lab yet.`,
      e.line,
    );
  }
}
