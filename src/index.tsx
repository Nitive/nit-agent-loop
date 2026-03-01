import fsp from "node:fs/promises"
import { render } from "ink"
import { App } from "./app.js"
import { defaultDataDir } from "./db/database.js"

await fsp.mkdir(defaultDataDir, { recursive: true })
render(<App />)
