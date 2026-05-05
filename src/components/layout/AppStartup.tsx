import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

type AppStartupProps = {
  visible: boolean
}

const dotTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 28,
  mass: 0.72,
} as const

export function AppStartup({ visible }: AppStartupProps) {
  const reduceMotion = useReducedMotion()

  const markInitial = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }
  const markAnimate = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
  const dotInitial = reduceMotion ? { opacity: 0 } : { opacity: 0, r: 0 }
  const dotAnimate = reduceMotion ? { opacity: 1 } : { opacity: 1, r: 8.1105204 }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-[var(--surface)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.08 : 0.18 }}
        >
          <motion.svg
            aria-hidden="true"
            className="h-[10rem] w-[10rem]"
            viewBox="0 0 270.93333 270.93333"
          >
            <g transform="translate(-4.9018872 8.8085288)">
              <motion.g
                initial={markInitial}
                animate={markAnimate}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 34,
                  mass: 0.78,
                }}
              >
                <motion.path
                  fill="var(--brand-mark)"
                  d="m 186.2046,195.96631 h 20.74363 l -48.9219,-59.27278 c 0,0 33.9437,-9.79339 33.54013,-36.959622 -0.40357,-27.166234 -19.20218,-42.423547 -32.93869,-42.383868 -13.73651,0.03968 -69.796218,0 -69.796218,0 v 17.327034 c 0,0 45.356728,0 66.611398,0 9.43517,0 17.93185,11.178266 17.93185,23.060295 0,11.882031 -8.32355,20.808181 -17.93185,20.808181 -10.96743,0 -35.61797,0.30326 -35.61797,0.30326 z"
                />
                <motion.circle
                  fill="var(--brand-dot-1)"
                  cx="83.716614"
                  cy="188.2332"
                  r="8.1105204"
                  initial={dotInitial}
                  animate={dotAnimate}
                  transition={{ ...dotTransition, delay: reduceMotion ? 0 : 0.14 }}
                />
                <motion.circle
                  fill="var(--brand-dot-2)"
                  cx="111.74717"
                  cy="188.06285"
                  r="8.1105204"
                  initial={dotInitial}
                  animate={dotAnimate}
                  transition={{ ...dotTransition, delay: reduceMotion ? 0 : 0.22 }}
                />
                <motion.circle
                  fill="var(--brand-dot-3)"
                  cx="139.70076"
                  cy="188.10852"
                  r="8.1105204"
                  initial={dotInitial}
                  animate={dotAnimate}
                  transition={{ ...dotTransition, delay: reduceMotion ? 0 : 0.3 }}
                />
              </motion.g>
            </g>
          </motion.svg>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
