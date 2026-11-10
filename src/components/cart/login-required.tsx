import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export function LoginRequired({ siteName }: { siteName: string }) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Login required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please log in to your {siteName} account to view your cart and checkout.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/login?next=/cart">Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup?next=/cart">Create an account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
