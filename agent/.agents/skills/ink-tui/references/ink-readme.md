# Ink — Official README (vadimdemedes/ink)

> React for CLIs. Build and test your CLI output using components.

## Install

```sh
npm install ink react
```

## Usage

```jsx
import React, {useState, useEffect} from 'react';
import {render, Text} from 'ink';

const Counter = () => {
	const [counter, setCounter] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setCounter(previousCounter => previousCounter + 1);
		}, 100);
		return () => clearInterval(timer);
	}, []);

	return <Text color="green">{counter} tests passed</Text>;
};

render(<Counter />);
```

## Scaffolding

```sh
npx create-ink-app my-ink-cli
npx create-ink-app --typescript my-ink-cli
```

---

## App Lifecycle

- App stays alive while there is active work in the event loop (timers, pending promises, `useInput` listening on stdin)
- Exit via: Ctrl+C (default), `exit()` from `useApp`, or `unmount()` from `render()`
- `waitUntilExit()` — runs code after the app is unmounted

```jsx
const {waitUntilExit} = render(<MyApp />);
await waitUntilExit();
console.log('App exited');
```

---

## Components

### `<Text>`

Renders text. Only accepts text nodes and nested `<Text>` components (no `<Box>` inside `<Text>`).

**Props:**
| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | string | — | chalk color (name, hex, rgb) |
| `backgroundColor` | string | — | chalk background color |
| `dimColor` | boolean | false | dim the color |
| `bold` | boolean | false | bold |
| `italic` | boolean | false | italic |
| `underline` | boolean | false | underline |
| `strikethrough` | boolean | false | strikethrough |
| `inverse` | boolean | false | invert fg/bg |
| `wrap` | `'wrap'|'truncate'|'truncate-start'|'truncate-middle'|'truncate-end'` | `'wrap'` | text overflow |

```jsx
<Text color="green">Green</Text>
<Text color="#005cc5">Blue</Text>
<Text bold italic underline>Styled</Text>
<Text wrap="truncate-middle">Long text</Text>
```

---

### `<Box>`

Flexbox container — like `<div style="display:flex">`. Every element is a flex container.

**Dimension props:** `width`, `height`, `minWidth`, `minHeight` — number or `"50%"`

**Padding props:** `padding`, `paddingX`, `paddingY`, `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`

**Margin props:** `margin`, `marginX`, `marginY`, `marginTop`, `marginBottom`, `marginLeft`, `marginRight`

**Gap props:** `gap`, `columnGap`, `rowGap`

**Flex props:**
| Prop | Type | Default | Values |
|---|---|---|---|
| `flexDirection` | string | `row` | `row`, `row-reverse`, `column`, `column-reverse` |
| `flexWrap` | string | `nowrap` | `nowrap`, `wrap`, `wrap-reverse` |
| `flexGrow` | number | 0 | — |
| `flexShrink` | number | 1 | — |
| `flexBasis` | number/string | — | — |
| `alignItems` | string | — | `flex-start`, `center`, `flex-end` |
| `alignSelf` | string | `auto` | `auto`, `flex-start`, `center`, `flex-end` |
| `justifyContent` | string | — | `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` |

**Visibility:** `display` (`flex`|`none`), `overflow`, `overflowX`, `overflowY` (`visible`|`hidden`)

**Border props:**
| Prop | Type | Values |
|---|---|---|
| `borderStyle` | string/object | `single`, `double`, `round`, `bold`, `singleDouble`, `doubleSingle`, `classic`, custom BoxStyle |
| `borderColor` | string | chalk color |
| `borderTopColor`, `borderRightColor`, `borderBottomColor`, `borderLeftColor` | string | chalk color |
| `borderDimColor` | boolean | — |
| `borderTop`, `borderRight`, `borderBottom`, `borderLeft` | boolean | true |

**Background:** `backgroundColor` — fills entire Box area, inherited by child `<Text>`

```jsx
// Flexbox layout
<Box flexDirection="column" gap={1}>
  <Box justifyContent="space-between">
    <Text>Left</Text>
    <Spacer />
    <Text>Right</Text>
  </Box>
</Box>

// Border
<Box borderStyle="round" borderColor="green" padding={1}>
  <Text>Bordered</Text>
</Box>

// Custom border
<Box borderStyle={{ topLeft: '↘', top: '↓', topRight: '↙', left: '→', bottomLeft: '↗', bottom: '↑', bottomRight: '↖', right: '←' }}>
  <Text>Custom</Text>
</Box>
```

---

### `<Newline>`

Adds `\n` characters. Must be inside `<Text>`.

```jsx
<Text>
  <Text color="green">Hello</Text>
  <Newline />
  <Text color="red">World</Text>
</Text>
```

**Props:** `count` (number, default 1)

---

### `<Spacer>`

Flexible space that expands along the major axis — useful for pushing items to opposite ends.

```jsx
<Box>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

---

### `<Static>`

Permanently renders output above everything else. For completed tasks, logs, etc. Only renders new items (ignores previously rendered ones).

```jsx
<Static items={tests}>
  {test => (
    <Box key={test.id}>
      <Text color="green">✔ {test.title}</Text>
    </Box>
  )}
</Static>
```

**Props:** `items` (Array), `style` (Box styles), `children(item, index)` (render function)

---

### `<Transform>`

Transform string output of child components before rendering. Used for gradients, links, text effects. Must only be applied to `<Text>` children and must not change dimensions.

```jsx
<Transform transform={output => output.toUpperCase()}>
  <Text>Hello World</Text>
</Transform>

// Hanging indent
<Transform transform={(line, index) => index === 0 ? line : '    ' + line}>
  {children}
</Transform>
```

**Props:** `transform(outputLine: string, index: number): string`

---

## Hooks

### `useInput(inputHandler, options?)`

Handle keyboard input. Called for each character; for pasted text (multi-char), called once with full string.

```jsx
useInput((input, key) => {
  if (input === 'q') exit();
  if (key.leftArrow) { /* left */ }
  if (key.return) { /* enter */ }
  if (key.ctrl && input === 'c') { /* ctrl+c */ }
});
```

**`key` object:**
- `leftArrow`, `rightArrow`, `upArrow`, `downArrow` — boolean
- `return` — Enter key
- `escape` — Escape key
- `ctrl`, `shift`, `tab`, `meta` — modifier keys
- `backspace`, `delete` — boolean
- `pageUp`, `pageDown`, `home`, `end` — boolean
- `super`, `hyper`, `capsLock`, `numLock` — requires kitty keyboard protocol
- `eventType` — `'press'|'repeat'|'release'` — requires kitty keyboard protocol

**Options:** `isActive` (boolean, default true) — enable/disable capturing

---

### `useApp()`

```jsx
const {exit} = useApp();
// exit() → resolves undefined
// exit(error) → rejects
// exit(value) → resolves with value
```

---

### `useStdin()`

```jsx
const {stdin, isRawModeSupported, setRawMode} = useStdin();
// Always use Ink's setRawMode, not process.stdin.setRawMode
// Check isRawModeSupported before calling setRawMode
```

---

### `useStdout()`

```jsx
const {stdout, write} = useStdout();
write('External output above Ink\n'); // won't conflict with Ink output
```

---

### `useStderr()`

```jsx
const {stderr, write} = useStderr();
write('Error message\n');
```

---

### `useFocus(options?)`

Makes component focusable. Tab cycles through focusable components.

```jsx
const {isFocused} = useFocus({
  autoFocus: false,  // auto-focus if nothing else is focused
  isActive: true,    // temporarily disable without losing position
  id: 'my-input',   // programmatic focus by ID
});
```

---

### `useFocusManager()`

```jsx
const {enableFocus, disableFocus, focusNext, focusPrevious, focus, activeId} = useFocusManager();
// focus('someId') — programmatically focus by ID
// activeId — ID of currently focused component
// Tab → focusNext(), Shift+Tab → focusPrevious()
```

---

### `useCursor()`

Control terminal cursor position for IME support.

```jsx
const {setCursorPosition} = useCursor();
setCursorPosition({x: stringWidth(prompt + text), y: 1});
// Pass undefined to hide cursor
// Use string-width for CJK/emoji
```

---

### `useIsScreenReaderEnabled()`

```jsx
const isEnabled = useIsScreenReaderEnabled();
```

---

## API

### `render(tree, options?)`

Returns `Instance` with: `rerender(tree)`, `unmount()`, `waitUntilExit()`, `cleanup()`, `clear()`

**Options:**
| Option | Type | Default | Description |
|---|---|---|---|
| `stdout` | stream.Writable | process.stdout | Output stream |
| `stdin` | stream.Readable | process.stdin | Input stream |
| `stderr` | stream.Writable | process.stderr | Error stream |
| `exitOnCtrlC` | boolean | true | Handle Ctrl+C |
| `patchConsole` | boolean | true | Prevent console.log from mixing with Ink output |
| `debug` | boolean | false | Each update as separate output |
| `maxFps` | number | 30 | Max render updates per second |
| `incrementalRendering` | boolean | false | Only update changed lines (reduces flicker) |
| `concurrent` | boolean | false | React concurrent mode (enables Suspense, useTransition) |
| `kittyKeyboard` | object | undefined | Enable kitty keyboard protocol |
| `isScreenReaderEnabled` | boolean | `INK_SCREEN_READER === 'true'` | Screen reader support |
| `onRender` | function | undefined | Called after each render with `{renderTime}` |

**kittyKeyboard options:**
- `mode`: `'auto'|'enabled'|'disabled'` — auto detects kitty/WezTerm/Ghostty
- `flags`: array of `'disambiguateEscapeCodes'|'reportEventTypes'|'reportAlternateKeys'|'reportAllKeysAsEscapeCodes'|'reportAssociatedText'`

### `renderToString(tree, options?)`

Renders to string synchronously, no terminal. Useful for tests, docs, file output. Options: `columns` (default 80).

### `measureElement(ref)`

```jsx
const ref = useRef();
useEffect(() => {
  const {width, height} = measureElement(ref.current);
}, []);
return <Box ref={ref}>...</Box>;
```

Returns `{width, height}`. Call from useEffect/useLayoutEffect, not during render.

---

## Testing

```jsx
import {render} from 'ink-testing-library';

const {lastFrame} = render(<Test />);
lastFrame() === 'Hello World'; //=> true
```

---

## Screen Reader / ARIA

```jsx
// Enable
render(<MyApp />, {isScreenReaderEnabled: true});
// Or: INK_SCREEN_READER=true my-cli

// ARIA props on Box and Text:
<Box aria-role="checkbox" aria-state={{checked: true}}>
  <Text>Accept terms and conditions</Text>
</Box>
// → "(checked) checkbox: Accept terms and conditions"

<Text aria-label="Progress: 50%">50%</Text>
<Box aria-hidden>...</Box>
```

Supported `aria-role` values: `button`, `checkbox`, `radio`, `radiogroup`, `list`, `listitem`, `menu`, `menuitem`, `progressbar`, `tab`, `tablist`, `timer`, `toolbar`, `table`

Supported `aria-state` values: `checked`, `disabled`, `expanded`, `selected`

---

## CI Behaviour

When `CI` env var is set: only last frame is rendered on exit, no terminal resize events.
Override with `CI=false node my-cli.js`.

---

## React Devtools

```sh
DEV=true my-cli   # run your app
npx react-devtools  # in another terminal
```

Requires `react-devtools-core` installed.

---

## Useful Components (Official List)

| Package | Description |
|---|---|
| `ink-text-input` | Text input |
| `ink-spinner` | Spinner |
| `ink-select-input` | Select/dropdown |
| `ink-link` | Clickable hyperlink |
| `ink-gradient` | Gradient color text |
| `ink-big-text` | Large ASCII art text |
| `ink-picture` | Display images |
| `ink-tab` | Tabs |
| `ink-color-pipe` | Color text with style strings |
| `ink-multi-select` | Multi-select list |
| `ink-divider` | Horizontal divider |
| `ink-progress-bar` | Progress bar |
| `ink-table` | Table |
| `ink-ascii` | ASCII art text (Figlet fonts) |
| `ink-markdown` | Syntax-highlighted Markdown |
| `ink-quicksearch-input` | Select with quicksearch |
| `ink-confirm-input` | Yes/No confirmation |
| `ink-syntax-highlight` | Code syntax highlighting |
| `ink-form` | Form with fields |
| `ink-task-list` | Task list |
| `ink-spawn` | Spawn child processes |
| `ink-titled-box` | Box with a title |
| `ink-chart` | Sparkline and bar chart |
| `ink-scroll-view` | Scroll container |
| `ink-scroll-list` | Scrollable list |
| `ink-stepper` | Step-by-step wizard |
| `ink-virtual-list` | Virtualized list |
| `ink-color-picker` | Color picker |
| `@inkjs/ui` | Official component library (TextInput, Select, etc.) |
| `ink-use-stdout-dimensions` | Subscribe to terminal dimensions |
| `ink-testing-library` | Testing utilities |
