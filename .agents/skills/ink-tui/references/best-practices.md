# Ink TUI — Best Practices

## Project Setup

### TypeScript (Recommended)

```sh
npx create-ink-app --typescript my-cli
```

### Manual TypeScript Setup

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "jsx": "react-jsx"
  }
}
```

### ESM + TypeScript (`package.json`)

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.tsx",
    "test": "vitest"
  },
  "dependencies": {
    "ink": "^5.0.0",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

---

## Architecture Patterns

### Single Entry Point

```tsx
// src/index.tsx
import { render } from "ink"
import { App } from "./app.js"

render(<App />, {
  exitOnCtrlC: true,
  patchConsole: true,
  incrementalRendering: true, // minimize flicker on updates/resize
})
```

### Async Exit Pattern

```tsx
const { waitUntilExit } = render(<App />)
await waitUntilExit()
process.exit(0)
```

### Error Handling

```tsx
const App = () => {
  const { exit } = useApp()

  useEffect(() => {
    const handleError = (err: Error) => exit(err)
    process.on("uncaughtException", handleError)
    return () => process.off("uncaughtException", handleError)
  }, [])

  return <MainUI />
}
```

---

## Layout Patterns

### Full-Screen App

```tsx
const App = () => {
  const [cols, rows] = useStdoutDimensions() // ink-use-stdout-dimensions

  return (
    <Box width={cols} height={rows} flexDirection="column">
      <Header />
      <Box flexGrow={1}>
        <Content />
      </Box>
      <StatusBar />
    </Box>
  )
}
```

### Split Pane

```tsx
<Box flexDirection="row" gap={1}>
  <Box width="30%" flexDirection="column">
    <Sidebar />
  </Box>
  <Box flexGrow={1}>
    <MainContent />
  </Box>
</Box>
```

### Centered Content

```tsx
<Box justifyContent="center" alignItems="center" height={10}>
  <Text>Centered</Text>
</Box>
```

### Status Bar

```tsx
<Box
  justifyContent="space-between"
  borderStyle="single"
  borderTop
  borderBottom={false}
  borderLeft={false}
  borderRight={false}
>
  <Text dimColor>q: quit ↑↓: navigate enter: select</Text>
  <Text>{status}</Text>
</Box>
```

---

## Input Handling Patterns

### Global Keyboard Router

```tsx
const App = () => {
  const { exit } = useApp()

  useInput((input, key) => {
    // Global shortcuts always handled
    if (input === "q" || (key.ctrl && input === "c")) {
      exit()
    }
  })

  return <Screen />
}
```

### Conditional Input (Active Panel Only)

```tsx
const Panel = ({ isActive }: { isActive: boolean }) => {
  useInput(
    (input, key) => {
      if (key.upArrow) navigate(-1)
      if (key.downArrow) navigate(1)
      if (key.return) select()
    },
    { isActive },
  ) // Only fires when isActive=true

  return <Box>...</Box>
}
```

### Multi-Screen Navigation

```tsx
type Screen = "list" | "detail" | "confirm"

const App = () => {
  const [screen, setScreen] = useState<Screen>("list")
  const { exit } = useApp()

  useInput((input, key) => {
    if (key.escape) {
      if (screen !== "list") setScreen("list")
      else exit()
    }
  })

  if (screen === "list")
    return <ListScreen onSelect={() => setScreen("detail")} />
  if (screen === "detail")
    return <DetailScreen onBack={() => setScreen("list")} />
  return null
}
```

### Arrow Key List Navigation

```tsx
const useListNav = (items: unknown[], onSelect: (i: number) => void) => {
  const [index, setIndex] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1))
    if (key.downArrow) setIndex((i) => Math.min(items.length - 1, i + 1))
    if (key.return) onSelect(index)
  })

  return index
}
```

---

## State Management Patterns

### Loading State

```tsx
const App = () => {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData()
      .then((d) => {
        setData(d)
        setState("ready")
      })
      .catch(() => setState("error"))
  }, [])

  if (state === "loading")
    return (
      <Text>
        <Spinner /> Loading...
      </Text>
    )
  if (state === "error") return <Text color="red">Error loading data</Text>
  return <DataView data={data} />
}
```

### Async Operations with Progress

```tsx
const App = () => {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const run = async () => {
      for (let i = 0; i <= 100; i += 10) {
        await doWork(i)
        setProgress(i)
      }
      setDone(true)
    }
    run()
  }, [])

  if (done) return <Text color="green">Done!</Text>
  return <ProgressBar percent={progress / 100} />
}
```

---

## Performance Patterns

### Static for Completed Items (Critical)

```tsx
// DO: Use <Static> for completed/immutable output — it doesn't re-render
;<>
  <Static items={completedTasks}>
    {(task) => (
      <Box key={task.id}>
        <Text color="green">✔ {task.name}</Text>
      </Box>
    )}
  </Static>
  <Box>
    <Text>Current task: {currentTask}</Text>
  </Box>
</>

// DON'T: Re-render everything on every update
{
  allTasks.map((t) => <Text key={t.id}>{t.name}</Text>)
}
```

### Throttle Fast Updates

```tsx
// Use maxFps to prevent excessive re-renders
render(<App />, { maxFps: 15 }) // 15fps for heavy UIs

// For very frequent data updates, batch state
const [stats, setStats] = useState({ cpu: 0, mem: 0 })
// Update both at once, not in separate setState calls
setStats({ cpu: newCpu, mem: newMem })
```

### Incremental Rendering for Frequent Updates

```tsx
render(<App />, { incrementalRendering: true }) // only redraws changed lines
```

### Virtual Lists for Large Datasets

```tsx
// Use ink-virtual-list for 100+ items
import VirtualList from "ink-virtual-list"

;<VirtualList items={largeArray} itemHeight={1}>
  {(item) => <Text key={item.id}>{item.name}</Text>}
</VirtualList>
```

---

## Focus Management

### Tab-Based Navigation Between Panels

```tsx
const Panel = ({ id, label }: { id: string; label: string }) => {
  const { isFocused } = useFocus({ id })

  return (
    <Box borderStyle="single" borderColor={isFocused ? "blue" : undefined}>
      <Text>
        {isFocused ? "▶ " : "  "}
        {label}
      </Text>
    </Box>
  )
}

// Programmatic focus
const App = () => {
  const { focus } = useFocusManager()

  useInput((input) => {
    if (input === "1") focus("panel-1")
    if (input === "2") focus("panel-2")
  })

  return (
    <>
      <Panel id="panel-1" label="Files" />
      <Panel id="panel-2" label="Preview" />
    </>
  )
}
```

---

## Testing Patterns

```tsx
import { render } from "ink-testing-library"
import { expect, test } from "vitest"
import { act } from "react" // React 19+ exports act directly

test("renders correctly", () => {
  const { lastFrame } = render(<MyComponent />)
  expect(lastFrame()).toBe("Hello World")
})

test("handles input", async () => {
  const { lastFrame, stdin } = render(<Counter />)
  expect(lastFrame()).toContain("0")

  await act(async () => {
    stdin.write("j") // simulate keypress
  })

  expect(lastFrame()).toContain("1")
})

test("async component", async () => {
  const { lastFrame } = render(<AsyncComponent />)

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  expect(lastFrame()).toContain("Loaded")
})
```

---

## Common Pitfalls

### Text must wrap Text

```tsx
// WRONG — Box cannot be inside Text
<Text><Box>...</Box></Text>

// RIGHT — Text wraps text, Box wraps layout
<Box>
  <Text>Label: </Text>
  <Text color="green">{value}</Text>
</Box>
```

### measureElement timing

```tsx
// WRONG — called during render, returns {0, 0}
const { width } = measureElement(ref.current) // in render body

// RIGHT — called after layout
useEffect(() => {
  const { width, height } = measureElement(ref.current)
}, [content]) // re-measure when content changes
```

### Raw mode safety

```tsx
const { isRawModeSupported, setRawMode } = useStdin()

useEffect(() => {
  if (!isRawModeSupported) return // guard!
  setRawMode(true)
  return () => setRawMode(false) // always cleanup
}, [])
```

### Avoid console.log (use patchConsole or useStdout)

```tsx
// BAD — will fight with Ink's output
console.log("Debug:", value)

// GOOD — use patchConsole (default: true) or write to stdout explicitly
const { write } = useStdout()
write(`Debug: ${value}\n`)
```

### Clean up timers and listeners

```tsx
useEffect(() => {
  const timer = setInterval(tick, 100)
  return () => clearInterval(timer) // always cleanup
}, [])
```

---

## Accessibility

```tsx
// Provide ARIA roles and labels
;<Box aria-role="progressbar" aria-label={`Progress: ${percent}%`}>
  <Box width={`${percent}%`} backgroundColor="green" />
</Box>

// Screen reader-aware rendering
const Checkbox = ({ checked, label }) => {
  const isScreenReader = useIsScreenReaderEnabled()

  return (
    <Box aria-role="checkbox" aria-state={{ checked }}>
      <Text>
        {isScreenReader ? "" : checked ? "☑" : "☐"} {label}
      </Text>
    </Box>
  )
}
```

---

## CI Compatibility

```tsx
// Detect CI and adjust behavior
const isCI = process.env.CI === "true"

render(<App />, {
  // In CI, Ink only renders last frame — this is automatic
  // Use Static for progress output that should persist
})
```

Always use `<Static>` for build logs/task output in CI — it ensures output is not overwritten.
