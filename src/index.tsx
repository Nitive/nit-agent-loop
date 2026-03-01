import process from "node:process"
import { Box, render, Text } from "ink"
import { useExitHandlers } from "./hooks/exit.js"

const App = () => {
  useExitHandlers()

  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24

  return (
    <Box width={width} height={height} flexDirection="row">
      <Box
        width="50%"
        height="100%"
        borderStyle="single"
        justifyContent="center"
        alignItems="center"
      >
        <Text>hello</Text>
      </Box>
      <Box
        width="50%"
        height="100%"
        borderStyle="single"
        justifyContent="center"
        alignItems="center"
      >
        <Text>world</Text>
      </Box>
    </Box>
  )
}

render(<App />)
