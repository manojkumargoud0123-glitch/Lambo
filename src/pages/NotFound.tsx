import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Shield } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { EASE } from '@/components/ui/motion'

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }} className="flex flex-col items-center">
        <Shield className="h-16 w-auto opacity-90" />
        <p className="eyebrow mt-8 text-gold">Error 404</p>
        <h1 className="mt-3 font-wide text-[clamp(1.8rem,5vw,3.2rem)] font-light uppercase">Off the fairway</h1>
        <p className="mt-3 max-w-md text-ink-2">This page isn't part of the course. Head back to the live map to find your fleet.</p>
        <Link to="/" className="mt-8">
          <Button variant="primary">
            Return to live map <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
