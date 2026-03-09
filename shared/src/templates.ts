export interface TemplateArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  alignH: 'start' | 'center' | 'end'
  alignV: 'start' | 'center' | 'end'
  overflow: 'compress' | 'shrink'
  font: string
  fontSize: number
  textColor: string

  backplateOpacity: number
  backplateColor: string
}

export interface TemplateConfig {
  areas: TemplateArea[]
}
