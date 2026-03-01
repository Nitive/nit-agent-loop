import { render, Text } from "ink"
import { useExitHandlers } from "./hooks/exit.js"

const App = () => {
  useExitHandlers()

  return <Text color="green">Hello world</Text>
}

render(<App />)
