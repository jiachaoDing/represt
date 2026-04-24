export type TemplateColor = {
  solid: string
  soft: string
  text: string
}

const templatePalette: TemplateColor[] = [
  { solid: '#2e6b5e', soft: '#d2e8e3', text: '#04201a' },
  { solid: '#2f5d9a', soft: '#d8e4ff', text: '#0f1f35' },
  { solid: '#8b5e34', soft: '#f5dfcb', text: '#2f1905' },
  { solid: '#8a4b7a', soft: '#f4d8eb', text: '#311128' },
  { solid: '#8a6a16', soft: '#f7e8b3', text: '#2f2400' },
]

export function getTemplateColor(index: number) {
  return templatePalette[((index % templatePalette.length) + templatePalette.length) % templatePalette.length]
}
