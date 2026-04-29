import type { Equipment } from './types'

export const equipment: Equipment[] = [
  { id: 'barbell', aliases: ['bar', 'olympic barbell'] },
  { id: 'dumbbell', aliases: ['db', 'free weights'] },
  { id: 'cableMachine', aliases: ['cable stack', 'pulley machine', 'cable station'] },
  { id: 'smithMachine', aliases: ['smith'] },
  { id: 'bench', aliases: ['flat bench', 'incline bench', 'adjustable bench'] },
  { id: 'rack', aliases: ['power rack', 'squat rack', 'bench rack'] },
  { id: 'pullUpBar', aliases: ['chin up bar', 'high bar'] },
  { id: 'dipBars', aliases: ['parallel bars', 'dip station'] },
  { id: 'machine', aliases: ['selectorized machine', 'plate loaded machine', 'lever machine'] },
  { id: 'bodyweight', aliases: ['no equipment', 'calisthenics'] },
  { id: 'kettlebell', aliases: ['kb'] },
  { id: 'resistanceBand', aliases: ['band', 'exercise band'] },
]
