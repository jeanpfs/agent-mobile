import { describe, it, expect } from "vitest"
import { escapeYamlString, parseArgs, parseHierarchy } from "../utils.js"

describe("escapeYamlString", () => {
  it("escapes backslash before quotes to avoid double-escape collision", () => {
    expect(escapeYamlString('a\\b"c')).toBe('a\\\\b\\"c')
  })

  it("escapes newlines, carriage returns, and tabs", () => {
    expect(escapeYamlString("line1\nline2\rline3\tline4")).toBe("line1\\nline2\\rline3\\tline4")
  })

  it("leaves plain ASCII untouched", () => {
    expect(escapeYamlString("hello world")).toBe("hello world")
  })

  it("is idempotent on already-escaped-looking strings (no unescaping)", () => {
    expect(escapeYamlString("\\n")).toBe("\\\\n")
  })

  it("handles empty string", () => {
    expect(escapeYamlString("")).toBe("")
  })
})

describe("parseArgs", () => {
  it("returns empty args for empty input", () => {
    const r = parseArgs([])
    expect(r._count).toBe("0")
  })

  it("parses positional args as _0, _1, …", () => {
    const r = parseArgs(["foo", "bar"])
    expect(r._0).toBe("foo")
    expect(r._1).toBe("bar")
    expect(r._count).toBe("2")
  })

  it("parses --flag value pairs", () => {
    const r = parseArgs(["--output", "/tmp/x.png"])
    expect(r.output).toBe("/tmp/x.png")
    expect(r._count).toBe("0")
  })

  it("treats a bare --flag as 'true'", () => {
    const r = parseArgs(["--verbose"])
    expect(r.verbose).toBe("true")
  })

  it("treats --a --b as two boolean flags, not a=--b", () => {
    const r = parseArgs(["--a", "--b"])
    expect(r.a).toBe("true")
    expect(r.b).toBe("true")
  })

  it("mixes positional and flags", () => {
    const r = parseArgs(["m3", "hello world", "--platform", "ios"])
    expect(r._0).toBe("m3")
    expect(r._1).toBe("hello world")
    expect(r.platform).toBe("ios")
    expect(r._count).toBe("2")
  })
})

describe("parseHierarchy", () => {
  const button = (label: string, extra: Record<string, string> = {}) => ({
    attributes: { text: label, clickable: "true", bounds: "[0,0][100,40]", ...extra },
  })

  it("keeps the children of a root that has zero bounds and enabled=false (iOS)", () => {
    const tree = {
      attributes: { bounds: "[0,0][0,0]", enabled: "false" },
      children: [button("Display & Brightness"), button("General")],
    }
    expect(parseHierarchy(tree).map((e) => e.label)).toEqual(["Display & Brightness", "General"])
  })

  it("still prunes an invisible subtree below the root", () => {
    const tree = {
      attributes: { bounds: "[0,0][390,844]" },
      children: [
        { attributes: { visible: "false" }, children: [button("Hidden")] },
        { attributes: { bounds: "[0,0][0,0]" }, children: [button("Collapsed")] },
        button("Shown"),
      ],
    }
    expect(parseHierarchy(tree).map((e) => e.label)).toEqual(["Shown"])
  })
})
