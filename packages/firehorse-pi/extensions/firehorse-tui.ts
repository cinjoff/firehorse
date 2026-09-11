type NotifyType = "info" | "success" | "warning" | "error";

type ThemeColor =
  | "accent"
  | "border"
  | "borderAccent"
  | "success"
  | "error"
  | "warning"
  | "muted"
  | "dim"
  | "text";

interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
  dispose?(): void;
}

interface Theme {
  fg(color: ThemeColor | string, text: string): string;
  bg?(color: string, text: string): string;
  bold?(text: string): string;
}

interface TUI {
  requestRender(): void;
}

interface FooterData {
  getGitBranch(): string | null;
  getExtensionStatuses(): ReadonlyMap<string, string>;
  onBranchChange(callback: () => void): () => void;
}

interface ContextUsage {
  tokens: number | null;
  contextWindow: number;
  percent: number | null;
}

interface ModelLike {
  id?: string;
  contextWindow?: number;
}

interface MouseInputResult {
  consume?: boolean;
  data?: string;
}

interface OverlayOptions {
  width?: number | string;
  minWidth?: number;
  maxHeight?: number | string;
  anchor?: string;
  margin?: number;
}

interface ExtensionUIContext {
  theme?: Theme;
  notify?(message: string, type?: NotifyType): void;
  onTerminalInput?(handler: (data: string) => MouseInputResult | undefined): () => void;
  custom?<T>(
    factory: (
      tui: TUI,
      theme: Theme,
      keybindings: unknown,
      done: (result: T) => void,
    ) => Component | Promise<Component>,
    options?: { overlay?: boolean; overlayOptions?: OverlayOptions },
  ): Promise<T>;
  setFooter?(
    factory: ((tui: TUI, theme: Theme, footerData: FooterData) => Component) | undefined,
  ): void;
  setWidget?(
    key: string,
    content: ((tui: TUI, theme: Theme) => Component) | string[] | undefined,
    options?: { placement?: "aboveEditor" | "belowEditor" },
  ): void;
  setWorkingIndicator?(options?: { frames: string[]; intervalMs?: number }): void;
}

interface ExtensionContext {
  hasUI?: boolean;
  ui?: ExtensionUIContext;
  model?: ModelLike;
  getContextUsage?(): ContextUsage | undefined;
}

interface ExtensionAPI {
  on(
    event: "session_start",
    handler: (event: { reason?: string }, ctx: ExtensionContext) => void | Promise<void>,
  ): void;
  on(
    event: "session_shutdown",
    handler: (event: { reason?: string }, ctx?: ExtensionContext) => void | Promise<void>,
  ): void;
  on(
    event:
      | "agent_start"
      | "agent_end"
      | "turn_start"
      | "turn_end"
      | "tool_execution_start"
      | "tool_execution_end",
    handler: (
      event: { type?: string; turnIndex?: number; toolCallId?: string; toolName?: string },
      ctx: ExtensionContext,
    ) => void | Promise<void>,
  ): void;
  registerCommand?(
    name: string,
    options: {
      description?: string;
      handler: (args: string, ctx: ExtensionContext) => Promise<void> | void;
    },
  ): void;
}

interface MouseEventInfo {
  button: number;
  col: number;
  row: number;
  release: boolean;
}

interface FooterController {
  requestRender(): void;
  setBusy(active: boolean): void;
}

interface HorseSegment {
  color: ThemeColor;
  text: string;
}

interface CheatsheetItem {
  label: string;
  text: string;
}

interface CheatsheetSection {
  title: string;
  items: CheatsheetItem[];
}

type MouseTrackingMode = "none" | "passive" | "legacy";

const ANSI_PATTERN =
  /\x1B\[[0-?]*[ -/]*[@-~]|\x1B\][^\x07]*(?:\x07|\x1B\\)|\x1B[PX^_][\s\S]*?\x1B\\/g;
const ANSI_PREFIX_PATTERN =
  /^\x1B\[[0-?]*[ -/]*[@-~]|^\x1B\][^\x07]*(?:\x07|\x1B\\)|^\x1B[PX^_][\s\S]*?\x1B\\/;
const SGR_MOUSE_PATTERN = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/;

const HORSE_ANIMATION_INTERVAL_MS = 420;
const HORSE_FRAME_CYCLE = 6;

// Horse art from a compact ASCII silhouette. Keep the leading spaces so the
// shape stays intact; only the eye and fire mane are split into theme segments.
// The second frame keeps the same footprint while moving the legs.
const HORSE_GALLOP_FRAMES: HorseSegment[][][] = [
  [
    [
      { color: "warning", text: "      ^~^   " },
      { color: "accent", text: ".''" },
    ],
    [
      { color: "accent", text: "  ._.-.___.' (" },
      { color: "success", text: "`" },
      { color: "accent", text: "\\" },
    ],
    [{ color: "accent", text: " //(        ( `'" }],
    [{ color: "accent", text: "'/ )\\ ).__. ) " }],
    [{ color: "accent", text: "' <' `\\ ._/'\\" }],
    [{ color: "accent", text: "   `   \\     \\" }],
  ],
  [
    [
      { color: "warning", text: "     ~^~^   " },
      { color: "accent", text: ".''" },
    ],
    [
      { color: "accent", text: "  ._.-.___.' (" },
      { color: "success", text: "`" },
      { color: "accent", text: "\\" },
    ],
    [{ color: "accent", text: " //(        ( `'" }],
    [{ color: "accent", text: "'/ /\\ ).__. / " }],
    [{ color: "accent", text: "'  ) `\\ ._( '" }],
    [{ color: "accent", text: "  /`     /  `" }],
  ],
];

const CHEATSHEET_SECTIONS: CheatsheetSection[] = [
  {
    title: "Start here",
    items: [
      {
        label: "Install",
        text: "Install once with `pi install npm:firehorse-pi`, then run `/skill:firehorse-setup --check` or `/skill:firehorse-setup`.",
      },
      {
        label: "Setup",
        text: "Setup safely configures Superset MCP, memory project identity, the bundled claude-mem worker, and Firehorse agent roles.",
      },
    ],
  },
  {
    title: "Daily workflows",
    items: [
      {
        label: "Plan",
        text: "`/horse-create-plan` turns a messy request into a Planning Workspace, PRD, decisions, and issue drafts. `/horse-plan-review` stress-tests it before build.",
      },
      {
        label: "Build",
        text: "`/horse-build` implements one issue-sized vertical slice with TDD, evidence, and reviewer gates. `/horse-fix-bug` starts from reproduction and root cause.",
      },
      {
        label: "Review",
        text: "`/horse-review-code` reviews diffs against Verification Contracts. `/horse-ship` handles PR, changelog, tag/release, and tracker completion.",
      },
      {
        label: "New project",
        text: "`/horse-new-project` creates or configures a GitHub repo, tracker project, labels, and Firehorse setup manifest for future workflow runs.",
      },
    ],
  },
  {
    title: "Supporting skills",
    items: [
      {
        label: "Evidence",
        text: "Use `/skill:feedback-loop` for repeatable validation evidence and `/skill:verification-contract` to pin expected behavior and acceptance checks.",
      },
      {
        label: "Engineering",
        text: "Matt Pocock skills cover diagnose, TDD, triage, PRDs, issue breakdown, architecture improvement, prototypes, handoffs, and grill sessions.",
      },
      {
        label: "Frontend",
        text: "shadcn and Impeccable help with component registries, UI critique, styling, accessibility, product polish, and design language.",
      },
    ],
  },
  {
    title: "Bundled power tools",
    items: [
      {
        label: "Search",
        text: "pi-web-access and librarian fetch current docs and source-backed library evidence. pi-lens provides LSP and AST-aware code navigation.",
      },
      {
        label: "Context",
        text: "context-mode keeps large outputs out of chat, pi-subagents delegates bounded work, and pi-agent-memory recalls prior sessions via mem-search.",
      },
      {
        label: "Diagrams",
        text: "pi-mermaid renders Mermaid blocks inside Pi's TUI so architecture diagrams stay readable inside the agent session.",
      },
    ],
  },
  {
    title: "Footer tips",
    items: [
      {
        label: "Context",
        text: "The footer shows Git branch, context usage, active model, and this Cheatsheet button. The horse gallops only while Pi is busy.",
      },
      {
        label: "Clicking",
        text: "Footer clicks use passive terminal mouse tracking by default so scrollback keeps working. If your terminal does not support it, run `/fh-cheatsheet`.",
      },
    ],
  },
];

type RgbColor = readonly [number, number, number];

const CONTEXT_HEALTHY_RGB = [126, 156, 130] as const;
const CONTEXT_YELLOW_RGB = [204, 177, 84] as const;
const CONTEXT_ORANGE_RGB = [213, 132, 58] as const;
const CONTEXT_RED_RGB = [214, 82, 76] as const;

const footerControllers = new Set<FooterController>();
const footerWorkReasons = new Set<string>();
let footerBusy = false;
let cheatsheetHitbox: { start: number; end: number; row?: number } | undefined;
let terminalInputUnsubscribe: (() => void) | undefined;
let mouseTrackingMode: MouseTrackingMode = "none";
let cheatsheetOpen = false;
let cheatsheetHovered = false;
let activeCheatsheetClose: (() => void) | undefined;

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function shouldSkip(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_TUI) ||
    isTruthy(process.env.FIREHORSE_DISABLE_TUI) ||
    isTruthy(process.env.CI)
  );
}

function shouldHideHorse(): boolean {
  return isTruthy(process.env.FIREHORSE_HIDE_HORSE);
}

function shouldAnimate(): boolean {
  return !(
    isTruthy(process.env.FIREHORSE_TUI_STATIC) ||
    isTruthy(process.env.FIREHORSE_REDUCED_MOTION) ||
    isTruthy(process.env.NO_COLOR)
  );
}

function shouldDisableMouse(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_DISABLE_MOUSE) ||
    isTruthy(process.env.FIREHORSE_DISABLE_FOOTER_CLICK) ||
    isTruthy(process.env.CI)
  );
}

function shouldUseLegacyMouseCapture(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_ENABLE_LEGACY_MOUSE) ||
    isTruthy(process.env.FIREHORSE_FORCE_MOUSE_CAPTURE)
  );
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

function visibleWidth(value: string): number {
  return Array.from(stripAnsi(value)).length;
}

function truncateAnsi(value: string, width: number): string {
  if (width <= 0) return "";
  if (visibleWidth(value) <= width) return value;

  let result = "";
  let visible = 0;
  for (let index = 0; index < value.length && visible < width; ) {
    const rest = value.slice(index);
    const ansi = rest.match(ANSI_PREFIX_PATTERN);
    if (ansi?.index === 0) {
      result += ansi[0];
      index += ansi[0].length;
      continue;
    }

    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) break;
    const char = String.fromCodePoint(codePoint);
    result += char;
    visible += 1;
    index += char.length;
  }

  return `${result}\x1b[0m`;
}

function padAnsi(value: string, width: number): string {
  const truncated = truncateAnsi(value, width);
  const padding = Math.max(0, width - visibleWidth(truncated));
  return `${truncated}${" ".repeat(padding)}`;
}

function underline(value: string): string {
  return `\x1b[4m${value}\x1b[24m`;
}

function fgRgb([red, green, blue]: RgbColor, value: string): string {
  return `\x1b[38;2;${red};${green};${blue}m${value}\x1b[39m`;
}

function bold(theme: Theme, value: string): string {
  return theme.bold ? theme.bold(value) : `\x1b[1m${value}\x1b[22m`;
}

function contextColor(percent: number | null | undefined): RgbColor {
  if (percent === null || percent === undefined) return CONTEXT_HEALTHY_RGB;
  if (percent >= 50) return CONTEXT_RED_RGB;
  if (percent >= 40) return CONTEXT_ORANGE_RGB;
  if (percent >= 30) return CONTEXT_YELLOW_RGB;
  return CONTEXT_HEALTHY_RGB;
}

function rightAlign(line: string, width: number, inset = 2): string {
  const rawWidth = visibleWidth(line);
  const padding = Math.max(0, width - rawWidth - inset);
  return `${" ".repeat(padding)}${truncateAnsi(line, Math.max(0, width - padding))}`;
}

function horseLineWidth(line: HorseSegment[]): number {
  return line.reduce((width, segment) => width + Array.from(segment.text).length, 0);
}

const HORSE_BLOCK_WIDTH = Math.max(
  0,
  ...HORSE_GALLOP_FRAMES.flatMap((horseFrame) => horseFrame.map(horseLineWidth)),
);

function animateHorseText(segment: HorseSegment, frame: number): string {
  if (segment.color === "warning") {
    if (frame % 6 === 2) return segment.text.replace(/\^/g, "*").replace(/~/g, "^");
    if (frame % 6 === 4) return segment.text.replace(/\^/g, "~").replace(/~/g, "*");
  }

  return segment.text;
}

function renderHorseLine(theme: Theme, line: HorseSegment[], frame: number): string {
  return line.map((segment) => theme.fg(segment.color, animateHorseText(segment, frame))).join("");
}

function selectFooterHorse(frame: number): HorseSegment[][] {
  return HORSE_GALLOP_FRAMES[frame % HORSE_GALLOP_FRAMES.length] ?? [];
}

function renderFooterHorse(theme: Theme, width: number, frame: number): string[] {
  if (width < 96) return [];

  return selectFooterHorse(frame).map((line) =>
    rightAlign(padAnsi(renderHorseLine(theme, line, frame), HORSE_BLOCK_WIDTH), width),
  );
}

function keyCodeInput(data: string, code: number): boolean {
  return data === `\x1b[${code}u` || data === `\x1b[${code};1u`;
}

function isCloseInput(data: string): boolean {
  return (
    data === "\x1b" ||
    data === "\x03" ||
    data === "q" ||
    data === "Q" ||
    data === "\r" ||
    data === "\n" ||
    keyCodeInput(data, 27) ||
    keyCodeInput(data, 3) ||
    keyCodeInput(data, 13) ||
    keyCodeInput(data, 10) ||
    keyCodeInput(data, 113) ||
    keyCodeInput(data, 81)
  );
}

function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 1000) return String(Math.round(value));
  if (value < 1_000_000) {
    const amount = value / 1000;
    return `${amount < 10 ? amount.toFixed(1) : Math.round(amount)}k`;
  }
  return `${(value / 1_000_000).toFixed(1)}m`;
}

function compactModelId(model: ModelLike | undefined): string {
  const id = model?.id ?? "no-model";
  return id.replace(/^models\//, "").replace(/^anthropic\//, "");
}

function readContextUsage(ctx: ExtensionContext): ContextUsage | undefined {
  const usage = ctx.getContextUsage?.();
  if (usage) return usage;

  const contextWindow = ctx.model?.contextWindow ?? 0;
  if (!contextWindow) return undefined;

  return { tokens: null, contextWindow, percent: null };
}

function contextGauge(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) return "[??????????]";

  const bounded = Math.max(0, Math.min(100, percent));
  const filled = Math.max(0, Math.min(10, Math.round(bounded / 10)));
  return `[${"#".repeat(filled)}${".".repeat(10 - filled)}]`;
}

function contextLabel(usage: ContextUsage | undefined): string {
  if (!usage) return "ctx ?";

  const percent = usage.percent === null ? "?" : `${usage.percent.toFixed(0)}%`;
  const tokens = usage.tokens === null ? "?" : formatCount(usage.tokens);
  const window = usage.contextWindow ? formatCount(usage.contextWindow) : "?";
  return `ctx ${contextGauge(usage.percent)} ${percent} ${tokens}/${window}`;
}

function wrapPlainText(value: string, width: number): string[] {
  if (width <= 0) return [""];

  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (Array.from(next).length <= width) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function parseMouseEvent(data: string): MouseEventInfo | undefined {
  const match = data.match(SGR_MOUSE_PATTERN);
  if (match) {
    return {
      button: Number(match[1]),
      col: Number(match[2]),
      row: Number(match[3]),
      release: match[4] === "m",
    };
  }

  const legacyIndex = data.indexOf("\x1b[M");
  if (legacyIndex >= 0 && data.length >= legacyIndex + 6) {
    return {
      button: data.charCodeAt(legacyIndex + 3) - 32,
      col: data.charCodeAt(legacyIndex + 4) - 32,
      row: data.charCodeAt(legacyIndex + 5) - 32,
      release: false,
    };
  }

  return undefined;
}

function isWheelEvent(event: MouseEventInfo): boolean {
  return (event.button & 0b1000000) !== 0;
}

function isMouseMotion(event: MouseEventInfo): boolean {
  return (event.button & 0b100000) !== 0;
}

function isPrimaryMousePress(event: MouseEventInfo): boolean {
  const isWheelOrDrag = (event.button & 0b1100000) !== 0;
  return !event.release && !isWheelOrDrag && (event.button & 0b11) === 0;
}

function canInstallClickHandler(ctx: ExtensionContext): boolean {
  return Boolean(ctx.ui?.onTerminalInput) && !shouldDisableMouse() && process.stdout.isTTY;
}

function enableMouseTracking(): void {
  if (mouseTrackingMode !== "none" || shouldDisableMouse() || !process.stdout.isTTY) return;

  if (shouldUseLegacyMouseCapture()) {
    // Legacy xterm mouse tracking is intentionally opt-in because it captures
    // scroll wheel events in most terminals and prevents normal scrollback.
    process.stdout.write("\x1b[?1000h\x1b[?1006h");
    mouseTrackingMode = "legacy";
    return;
  }

  // DEC private mode 2029 is passive mouse tracking: terminals that support it
  // can send click events to the app while keeping native scrollback/selection.
  // Unsupported terminals ignore this sequence, leaving the /fh-cheatsheet
  // command fallback available without breaking scrolling.
  process.stdout.write("\x1b[?2029h\x1b[?1006h");
  mouseTrackingMode = "passive";
}

function disableMouseTracking(): void {
  if (mouseTrackingMode === "none" || !process.stdout.isTTY) {
    mouseTrackingMode = "none";
    return;
  }

  process.stdout.write(
    "\x1b[?2029l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1005l\x1b[?1006l\x1b[?1015l",
  );
  mouseTrackingMode = "none";
}

function rightAlignedStart(value: string, width: number, inset = 0): number {
  return Math.max(0, width - visibleWidth(value) - inset) + 1;
}

function updateCheatsheetHitbox(
  buttonLabel: string,
  width: number,
  rowsFromBottom = 0,
  inset = 0,
): void {
  const start = rightAlignedStart(buttonLabel, width, inset);
  const end = start + visibleWidth(buttonLabel) - 1;
  if (end > width) {
    cheatsheetHitbox = undefined;
    return;
  }

  const terminalRows = process.stdout.rows;
  const row = terminalRows === undefined ? undefined : Math.max(1, terminalRows - rowsFromBottom);
  cheatsheetHitbox = row === undefined ? { start, end } : { start, end, row };
}

function requestFooterRender(): void {
  for (const controller of footerControllers) {
    controller.requestRender();
  }
}

function setCheatsheetHovered(hovered: boolean): void {
  if (cheatsheetHovered === hovered) return;
  cheatsheetHovered = hovered;
  requestFooterRender();
}

function setFooterWorkReason(reason: string, active: boolean): void {
  const changed = active ? !footerWorkReasons.has(reason) : footerWorkReasons.has(reason);
  if (!changed) return;

  if (active) {
    footerWorkReasons.add(reason);
  } else {
    footerWorkReasons.delete(reason);
  }

  const busy = footerWorkReasons.size > 0;
  if (footerBusy === busy) return;

  footerBusy = busy;
  for (const controller of footerControllers) {
    controller.setBusy(busy);
  }
}

function clearFooterWork(): void {
  if (!footerBusy && footerWorkReasons.size === 0) return;

  footerWorkReasons.clear();
  footerBusy = false;
  for (const controller of footerControllers) {
    controller.setBusy(false);
  }
}

async function showCheatsheet(ctx: ExtensionContext): Promise<void> {
  if (cheatsheetOpen) return;

  if (!ctx.ui?.custom) {
    ctx.ui?.notify?.("Firehorse cheatsheet is available in interactive mode.", "info");
    return;
  }

  cheatsheetOpen = true;
  try {
    await ctx.ui.custom<void>(
      (_tui, theme, _keybindings, done) => {
        const close = () => done(undefined);
        activeCheatsheetClose = close;
        return new CheatsheetModal(theme, close);
      },
      {
        overlay: true,
        overlayOptions: {
          width: "72%",
          minWidth: 64,
          maxHeight: "85%",
          anchor: "center",
          margin: 2,
        },
      },
    );
  } finally {
    cheatsheetOpen = false;
    activeCheatsheetClose = undefined;
  }
}

function installClickHandler(ctx: ExtensionContext): void {
  terminalInputUnsubscribe?.();
  terminalInputUnsubscribe = undefined;

  if (!canInstallClickHandler(ctx)) {
    setCheatsheetHovered(false);
    disableMouseTracking();
    return;
  }

  terminalInputUnsubscribe = ctx.ui?.onTerminalInput?.((data) => {
    const mouse = parseMouseEvent(data);
    if (!mouse) return undefined;

    const hitbox = cheatsheetHitbox;
    const rowMatches = hitbox?.row === undefined || Math.abs(mouse.row - hitbox.row) <= 2;
    const colMatches = Boolean(hitbox && mouse.col >= hitbox.start && mouse.col <= hitbox.end);
    const insideHitbox = colMatches && rowMatches;

    if (cheatsheetOpen && isPrimaryMousePress(mouse)) {
      activeCheatsheetClose?.();
      return { consume: true };
    }

    if (!isWheelEvent(mouse) && !isMouseMotion(mouse)) {
      setCheatsheetHovered(insideHitbox);
    }

    if (insideHitbox && isPrimaryMousePress(mouse)) {
      void showCheatsheet(ctx);
      return { consume: true };
    }

    // Always swallow mouse escape sequences before they reach the editor. In
    // passive mouse mode the terminal still owns scrollback/selection, so this
    // only prevents stray SGR mouse bytes from becoming input text.
    return { consume: true };
  });

  enableMouseTracking();
}

function cleanupInteractiveHooks(): void {
  terminalInputUnsubscribe?.();
  terminalInputUnsubscribe = undefined;
  cheatsheetHovered = false;
  clearFooterWork();
  disableMouseTracking();
}

class CheatsheetModal implements Component {
  constructor(
    private readonly theme: Theme,
    private readonly close: () => void,
  ) {}

  handleInput(data: string): void {
    if (isCloseInput(data)) {
      this.close();
    }
  }

  invalidate(): void {}

  render(width: number): string[] {
    const boxWidth = Math.max(1, width);
    const innerWidth = Math.max(1, boxWidth - 4);
    const border = this.theme.fg("borderAccent", "─".repeat(innerWidth + 2));
    const sectionLines = CHEATSHEET_SECTIONS.flatMap((section, index) => [
      ...(index === 0 ? [] : [this.rule(innerWidth)]),
      this.section(section.title, innerWidth),
      ...section.items.flatMap((item) => this.item(item, innerWidth)),
    ]);
    const lines = [
      this.theme.fg("borderAccent", `╭${border}╮`),
      this.row(
        this.theme.fg("accent", bold(this.theme, "Firehorse Cheatsheet")) +
          this.theme.fg("dim", "  package guide"),
        innerWidth,
      ),
      this.row(
        this.theme.fg("dim", "Click the footer button or run /fh-cheatsheet anytime."),
        innerWidth,
      ),
      this.rule(innerWidth),
      ...sectionLines,
      this.rule(innerWidth),
      this.row(
        this.theme.fg("success", "Tip") +
          this.theme.fg("dim", ": Esc, q, Enter, Ctrl+C, or a modal click closes."),
        innerWidth,
      ),
      this.theme.fg("borderAccent", `╰${border}╯`),
    ];

    return lines.map((line) => truncateAnsi(line, boxWidth));
  }

  private section(title: string, innerWidth: number): string {
    return this.row(this.theme.fg("accent", bold(this.theme, title)), innerWidth);
  }

  private item(item: CheatsheetItem, innerWidth: number): string[] {
    const labelWidth = Math.min(13, Math.max(8, Math.floor(innerWidth / 3)));
    const bodyWidth = Math.max(8, innerWidth - labelWidth - 2);
    const bodyLines = wrapPlainText(item.text, bodyWidth);

    return bodyLines.map((line, index) => {
      const labelText =
        index === 0
          ? padAnsi(this.theme.fg("warning", item.label), labelWidth)
          : " ".repeat(labelWidth);
      return this.row(
        `${labelText}${this.theme.fg("dim", "│ ")}${this.theme.fg("text", truncateAnsi(line, bodyWidth))}`,
        innerWidth,
      );
    });
  }

  private rule(innerWidth: number): string {
    return this.row(this.theme.fg("border", "─".repeat(innerWidth)), innerWidth);
  }

  private row(content: string, innerWidth: number): string {
    const padded = padAnsi(content, innerWidth);
    return `${this.theme.fg("borderAccent", "│ ")}${padded}${this.theme.fg("borderAccent", " │")}`;
  }
}

class FirehorseFooter implements Component, FooterController {
  private frame = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private unsubscribe: (() => void) | undefined;
  private busy = false;

  constructor(
    private readonly ctx: ExtensionContext,
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly footerData: FooterData,
    private readonly showHorse: boolean,
    private readonly animateHorse: boolean,
  ) {
    footerControllers.add(this);
    this.unsubscribe = footerData.onBranchChange(() => this.tui.requestRender());
    this.setBusy(footerBusy);
  }

  requestRender(): void {
    this.tui.requestRender();
  }

  setBusy(active: boolean): void {
    if (this.busy === active) return;

    this.busy = active;
    if (active) {
      this.startHorseTimer();
    } else {
      this.stopHorseTimer();
      this.frame = 0;
    }

    this.tui.requestRender();
  }

  dispose(): void {
    footerControllers.delete(this);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.stopHorseTimer();
  }

  invalidate(): void {}

  render(width: number): string[] {
    const footerLine = this.renderFooterLine(width);
    const horseLines = this.renderHorseLines(width);
    if (!horseLines.length) return [footerLine];

    return [...horseLines, "", footerLine];
  }

  private startHorseTimer(): void {
    if (!this.showHorse || !this.animateHorse || this.timer) return;

    this.timer = setInterval(() => {
      this.frame = (this.frame + 1) % HORSE_FRAME_CYCLE;
      this.tui.requestRender();
    }, HORSE_ANIMATION_INTERVAL_MS);
    this.timer.unref?.();
  }

  private stopHorseTimer(): void {
    if (!this.timer) return;

    clearInterval(this.timer);
    this.timer = undefined;
  }

  private renderHorseLines(width: number): string[] {
    if (!this.showHorse) return [];

    return renderFooterHorse(this.theme, width, this.frame);
  }

  private renderFooterLine(width: number): string {
    const branch = this.footerData.getGitBranch();
    const usage = readContextUsage(this.ctx);

    const branchText = branch ? this.theme.fg("dim", branch) : "";
    const contextText = fgRgb(contextColor(usage?.percent), contextLabel(usage));
    const modelText = this.theme.fg("muted", compactModelId(this.ctx.model));
    const separator = this.theme.fg("dim", "  ");
    const left = [branchText, contextText, modelText].filter(Boolean).join(separator);

    if (width < 72) {
      cheatsheetHitbox = undefined;
      return truncateAnsi(left, width);
    }

    const clickReady = canInstallClickHandler(this.ctx) && mouseTrackingMode !== "none";
    const buttonLabel = width >= 84 ? "[Cheatsheet]" : "[Sheet]";
    const commandLabel = width >= 84 ? "/fh-cheatsheet" : "/fh";
    const rightLabel = clickReady ? buttonLabel : commandLabel;
    const buttonText = this.theme.fg("warning", rightLabel);
    const right = clickReady && cheatsheetHovered ? underline(buttonText) : buttonText;

    if (clickReady) {
      updateCheatsheetHitbox(buttonLabel, width);
    } else {
      cheatsheetHitbox = undefined;
    }

    const rightWidth = visibleWidth(right);
    const leftWidth = Math.max(0, width - rightWidth - 1);
    const renderedLeft = truncateAnsi(left, leftWidth);
    const gap = Math.max(1, width - visibleWidth(renderedLeft) - rightWidth);

    return truncateAnsi(`${renderedLeft}${" ".repeat(gap)}${right}`, width);
  }
}

function installFirehorseTui(ctx: ExtensionContext): void {
  if (shouldSkip() || ctx.hasUI === false || !ctx.ui) {
    cleanupInteractiveHooks();
    return;
  }

  ctx.ui.setFooter?.(
    (tui, theme, footerData) =>
      new FirehorseFooter(ctx, tui, theme, footerData, !shouldHideHorse(), shouldAnimate()),
  );
  installClickHandler(ctx);

  const theme = ctx.ui.theme;
  if (theme && !isTruthy(process.env.FIREHORSE_SKIP_WORKING_INDICATOR)) {
    ctx.ui.setWorkingIndicator?.({
      frames: [
        theme.fg("dim", "."),
        theme.fg("muted", ":"),
        theme.fg("accent", "*"),
        theme.fg("warning", "*"),
        theme.fg("accent", "*"),
        theme.fg("muted", ":"),
      ],
      intervalMs: 120,
    });
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand?.("firehorse-cheatsheet", {
    description: "Show the Firehorse package quick reference",
    handler: async (_args, ctx) => showCheatsheet(ctx),
  });

  pi.registerCommand?.("fh-cheatsheet", {
    description: "Alias for /firehorse-cheatsheet",
    handler: async (_args, ctx) => showCheatsheet(ctx),
  });

  pi.registerCommand?.("fh", {
    description: "Short alias for /firehorse-cheatsheet",
    handler: async (_args, ctx) => showCheatsheet(ctx),
  });

  pi.on("agent_start", () => setFooterWorkReason("agent", true));
  pi.on("agent_end", () => clearFooterWork());
  pi.on("turn_start", () => setFooterWorkReason("turn", true));
  pi.on("turn_end", () => setFooterWorkReason("turn", false));
  pi.on("tool_execution_start", (event) => {
    setFooterWorkReason(`tool:${event.toolCallId ?? event.toolName ?? "active"}`, true);
  });
  pi.on("tool_execution_end", (event) => {
    setFooterWorkReason(`tool:${event.toolCallId ?? event.toolName ?? "active"}`, false);
  });

  pi.on("session_start", (_event, ctx) => {
    try {
      installFirehorseTui(ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui?.notify?.(`Firehorse TUI setup failed: ${message}`, "warning");
    }
  });

  pi.on("session_shutdown", () => {
    cleanupInteractiveHooks();
  });
}
