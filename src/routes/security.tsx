import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/security')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/security"!</div>
}
