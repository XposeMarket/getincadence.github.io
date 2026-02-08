import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-cadence-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cadence-pink rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cadence-teal rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cadence-orange rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity">
            <Image src="/logo.png" alt="Cadence" width={48} height={48} className="rounded-lg" />
            <span className="text-3xl font-semibold">Cadence</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            Your relationships,<br />in perfect rhythm.
          </h1>
          <p className="text-lg text-gray-300 max-w-md">
            A modern CRM built for service businesses. Manage contacts, track deals, and close more clients — without the enterprise bloat.
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center justify-center gap-3 mb-8 hover:opacity-90 transition-opacity">
            <Image src="/logo.png" alt="Cadence" width={40} height={40} className="rounded-lg" />
            <span className="text-2xl font-semibold text-cadence-navy">Cadence</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
