import Button from '@src/components/Button'
import { Item as GqlItem } from '@src/generated/graphql'
import React from 'react'
import s from './Item.module.sass'

import IconDownload from '@src/assets/icons/download.svg'
import format from 'date-fns/format'
import UserInfo from './UserInfo'

const Item = (props: { item: GqlItem }) => {
  return (
    <article className={s.item}>
      <Media item={props.item} />
      <div className={s.info}>
        <ul>
          <li>
            <UserInfo user={props.item.creator} />
          </li>
          <li>{format(new Date(props.item.createdAt), 'MMMM Lo, yyyy')}</li>
        </ul>
        <Button icon={<IconDownload />}>Original</Button>
        <Button icon={<IconDownload />}>Compressed</Button>
      </div>
      <div className={s.content}>
        <div className={s.text}>
          <h2>Description</h2>
          <p>{props.item.description}</p>
        </div>
        <div className={s.text}>
          <h2>Caption</h2>
          <p>{props.item.caption}</p>
        </div>
      </div>
    </article>
  )
}

export default Item

const Media = (props: { item: GqlItem }) => {
  return (
    <div className={s.media}>
      <video controls>
        <source src={`${props.item.compressedPath}.mp4`} />
      </video>
    </div>
  )
}
