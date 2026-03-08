# Ink Ecosystem — Third-Party Components Reference

## Official: `@inkjs/ui`

The official Ink component library. Install: `npm install @inkjs/ui`

Provides shadcn-style components: `TextInput`, `Select`, `MultiSelect`, `ConfirmInput`, `Spinner`, `ProgressBar`, `StatusMessage`, `UnorderedList`, `OrderedList`, `Badge`, `Alert`.

```tsx
import {TextInput, Select, Spinner} from '@inkjs/ui';

// Select
<Select
  options={[
    {label: 'Option A', value: 'a'},
    {label: 'Option B', value: 'b'},
  ]}
  onChange={value => console.log(value)}
/>

// TextInput
<TextInput placeholder="Type here..." onChange={setValue} onSubmit={handleSubmit} />

// Spinner
<Spinner label="Loading..." />
```

---

## Input Components

### `ink-text-input`

```sh
npm install ink-text-input
```

```tsx
import TextInput from "ink-text-input"
;<TextInput
  value={value}
  onChange={setValue}
  onSubmit={handleSubmit}
  placeholder="Type here..."
  focus={true} // auto-focus
  mask="*" // password masking
  highlightPastedText // highlight pasted content
  showCursor // default true
/>
```

### `ink-select-input`

```sh
npm install ink-select-input
```

```tsx
import SelectInput from "ink-select-input"
;<SelectInput
  items={[
    { label: "First", value: "first" },
    { label: "Second", value: "second" },
  ]}
  onSelect={(item) => console.log(item.value)}
  onHighlight={(item) => {}}
  initialIndex={0}
  limit={5} // max visible items
  isFocused={true}
/>
```

### `ink-multi-select`

```sh
npm install ink-multi-select
```

```tsx
import MultiSelect from "ink-multi-select"
;<MultiSelect
  items={[
    { label: "A", value: "a" },
    { label: "B", value: "b" },
  ]}
  onSubmit={(items) => console.log(items)}
/>
```

### `ink-confirm-input`

```sh
npm install ink-confirm-input
```

```tsx
import ConfirmInput from "ink-confirm-input"
;<ConfirmInput isChecked={confirmed} onChange={setConfirmed} />
```

### `ink-quicksearch-input`

```sh
npm install ink-quicksearch-input
```

Select component with keyboard-driven quicksearch filtering.

---

## Feedback / Status Components

### `ink-spinner`

```sh
npm install ink-spinner
```

```tsx
import Spinner from "ink-spinner"
;<Text color="green">
  <Spinner type="dots" /> Loading...
</Text>
```

Spinner types (from `cli-spinners`): `dots`, `dots2`, `line`, `pipe`, `star`, `bouncingBar`, `arc`, `clock`, `hamburger`, `arrow3`, and many more.

### `ink-progress-bar`

```sh
npm install ink-progress-bar
```

```tsx
import ProgressBar from "ink-progress-bar"
;<ProgressBar percent={0.5} />
```

### `ink-task-list`

```sh
npm install ink-task-list
```

```tsx
import { TaskList, Task } from "ink-task-list"
;<TaskList>
  <Task label="Install dependencies" state="success" />
  <Task label="Build project" state="loading" />
  <Task label="Deploy" state="pending" />
  <Task label="Failed step" state="error" output="Error details" />
  <Task label="Skipped" state="warning" />
</TaskList>
```

States: `'pending'`, `'loading'`, `'success'`, `'error'`, `'warning'`

---

## Layout Components

### `ink-table`

```sh
npm install ink-table
```

```tsx
import Table from "ink-table"
;<Table
  data={[
    { name: "Alice", age: 30, role: "Admin" },
    { name: "Bob", age: 25, role: "User" },
  ]}
/>
```

### `ink-divider`

```sh
npm install ink-divider
```

```tsx
import Divider from 'ink-divider';

<Divider title="Section Header" />
<Divider />  // plain line
```

### `ink-titled-box`

```sh
npm install ink-titled-box
```

```tsx
import TitledBox from "ink-titled-box"
;<TitledBox title="My Panel">
  <Text>Content inside</Text>
</TitledBox>
```

### `ink-tab`

```sh
npm install ink-tab
```

```tsx
import { Tabs, Tab } from "ink-tab"
;<Tabs onChange={(name) => setActive(name)}>
  <Tab name="one">One</Tab>
  <Tab name="two">Two</Tab>
</Tabs>
```

### `ink-scroll-view` / `ink-scroll-list`

```sh
npm install ink-scroll-view ink-scroll-list
```

Scrollable containers for content that exceeds terminal height.

### `ink-virtual-list`

```sh
npm install ink-virtual-list
```

Virtualized list — only renders visible items for large datasets.

### `ink-stepper`

```sh
npm install ink-stepper
```

Step-by-step wizard component.

---

## Visual / Text Effects

### `ink-gradient`

```sh
npm install ink-gradient
```

```tsx
import Gradient from "ink-gradient"

// Must be used inside <Transform> — wraps text in gradient
;<Gradient name="rainbow">
  <Text>Colorful gradient text</Text>
</Gradient>
```

### `ink-big-text`

```sh
npm install ink-big-text
```

```tsx
import BigText from 'ink-big-text';

<BigText text="Hello!" />
<BigText text="CLI" colors={['cyan', 'blue']} font="block" />
```

Fonts (from `figlet`): `block`, `simple`, `3d`, `simple3d`, `chrome`, `huge`, `shade`, `grid`

### `ink-ascii`

```sh
npm install ink-ascii
```

Like `ink-big-text` but with more Figlet font choices.

### `ink-link`

```sh
npm install ink-link
```

```tsx
import Link from "ink-link"
;<Link url="https://github.com">GitHub</Link>
```

Creates clickable hyperlinks in supporting terminals (iTerm2, Hyper, etc.).

### `ink-markdown`

```sh
npm install ink-markdown
```

```tsx
import Markdown from "ink-markdown"
;<Markdown>{markdownString}</Markdown>
```

Renders syntax-highlighted Markdown.

### `ink-syntax-highlight`

```sh
npm install ink-syntax-highlight
```

Code syntax highlighting in terminal.

### `ink-color-pipe`

```sh
npm install ink-color-pipe
```

Color text using shorthand style strings like `'green|My text'`.

### `ink-chart`

```sh
npm install ink-chart
```

Sparkline and bar charts in terminal.

### `ink-color-picker`

```sh
npm install ink-color-picker
```

Interactive color picker.

### `ink-picture`

```sh
npm install ink-picture
```

Display images in terminal.

---

## Forms

### `ink-form`

```sh
npm install ink-form
```

Full form management with validation.

```tsx
import InkForm from "ink-form"
;<InkForm
  form={{
    sections: [
      {
        title: "User Info",
        fields: [
          { type: "string", name: "name", label: "Name" },
          { type: "string", name: "email", label: "Email" },
          {
            type: "select",
            name: "role",
            label: "Role",
            options: [{ label: "Admin", value: "admin" }],
          },
        ],
      },
    ],
  }}
  onSubmit={(values) => console.log(values)}
/>
```

---

## Utilities

### `ink-spawn`

```sh
npm install ink-spawn
```

Spawn child processes and display their output.

### `ink-use-stdout-dimensions`

```sh
npm install ink-use-stdout-dimensions
```

```tsx
import useStdoutDimensions from "ink-use-stdout-dimensions"

const [columns, rows] = useStdoutDimensions()
```

Subscribe to terminal resize events.

### `ink-testing-library`

```sh
npm install --save-dev ink-testing-library
```

```tsx
import { render } from "ink-testing-library"

const { lastFrame, stdin, rerender, unmount, frames } = render(<MyComponent />)
lastFrame() === "Expected output"
stdin.write("q") // simulate input
```

---

## Routing

Use React Router's `MemoryRouter` for complex multi-screen TUIs (v7+).

```tsx
import { MemoryRouter, Routes, Route } from "react-router"

const App = () => (
  <MemoryRouter initialEntries={["/"]}>
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/details" element={<DetailScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
    </Routes>
  </MemoryRouter>
)

// In components, use standard hooks
import { useNavigate } from "react-router"
const navigate = useNavigate()
navigate("/details")
```
