import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/transfer-status/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/transfer-status/$id"!</div>
}
