import type { TemplateArea } from 'archive-shared/src/templates'

export type DragMode =
  | 'move'
  | 'resize-nw'
  | 'resize-ne'
  | 'resize-sw'
  | 'resize-se'
  | 'rotate'

export interface EditorArea extends TemplateArea {
  selected: boolean
}

export interface Point {
  x: number
  y: number
}
