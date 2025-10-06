import LinkBlogClean from './components/LinkBlogClean'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <LinkBlogClean />
    </ErrorBoundary>
  )
}

export default App