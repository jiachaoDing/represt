export type TemplateColor = {
  solid: string
  soft: string
  text: string
}

const templatePalette: TemplateColor[] = [
  {
    solid: 'var(--template-1)',
    soft: 'var(--template-1-container)',
    text: 'var(--on-template-1-container)',
  },
  {
    solid: 'var(--template-2)',
    soft: 'var(--template-2-container)',
    text: 'var(--on-template-2-container)',
  },
  {
    solid: 'var(--template-3)',
    soft: 'var(--template-3-container)',
    text: 'var(--on-template-3-container)',
  },
  {
    solid: 'var(--template-4)',
    soft: 'var(--template-4-container)',
    text: 'var(--on-template-4-container)',
  },
  {
    solid: 'var(--template-5)',
    soft: 'var(--template-5-container)',
    text: 'var(--on-template-5-container)',
  },
]

export function getTemplateColor(index: number) {
  return templatePalette[((index % templatePalette.length) + templatePalette.length) % templatePalette.length]
}
