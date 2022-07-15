import Button, { ButtonKind } from '@src/components/Button'
import { Item } from '@src/generated/graphql'
import React from 'react'
import './Item.sass'

import IconDownload from '@src/assets/icons/download.svg'
import format from 'date-fns/format'
import UserInfo from './UserInfo'

const Item = (props: { item: Item }) => {
  return (
    <article className="archive--item">
      <Media item={props.item} />
      <div className="item--info">
        <ul>
          <li>
            <UserInfo user={props.item.creator} />
          </li>
          <li>{format(new Date(props.item.createdAt), 'MMMM Lo, yyyy')}</li>
        </ul>
        <Button icon={<IconDownload />}>Original</Button>
        <Button icon={<IconDownload />}>Compressed</Button>
      </div>
      <div className="item--content">
        <div className="text">
          <h2>Description</h2>
          <p>{props.item.description}</p>
        </div>
        <div className="text">
          <h2>Caption</h2>
          <p>{props.item.caption}</p>
        </div>
      </div>
    </article>
  )
}

export default Item

const Media = (props: { item: Item }) => {
  return (
    <div className="item--media">
      <video controls>
        <source src={`${props.item.compressedPath}.mp4`} />
      </video>
    </div>
  )
}
