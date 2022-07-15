import { User } from '@src/generated/graphql'
import React from 'react'
import s from './UserInfo.module.sass'

const UserInfo = (props: { user: User | undefined | null }) => {
  if (!props.user) return <div className="userinfo">User does not exist</div>

  return (
    <div className={s.userinfo}>
      <img src={`${props.user.profilePicture}-32.jpeg`} />
      <div>{props.user.username}</div>
    </div>
  )
}

export default UserInfo
