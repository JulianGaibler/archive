import { User } from '@src/generated/graphql'
import React from 'react'
import './UserInfo.sass'

const UserInfo = (props: { user: User | undefined | null }) => {
  if (!props.user) return <div className="userinfo">User does not exist</div>

  return (
    <div className="archive--userinfo">
      <img src={`${props.user.profilePicture}-32.jpeg`} />
      <div className="userinfo--name">{props.user.username}</div>
    </div>
  )
}

export default UserInfo
