import React from 'react'
import s from './PostWall.module.sass'
import { Post, usePostsQuery } from '@src/generated/graphql'
import { Link } from 'react-router-dom'

const PostWall = () => {
  const { data } = usePostsQuery()
  const [columns] = React.useState(4)

  const sortedPosts = React.useMemo(() => {
    if (!data || !data.posts) return []

    const sortedPosts: Post[][] = []
    const heights = new Array(columns).fill(0)
    // Create array of columns empty arrays

    data.posts.edges?.forEach((post) => {
      if (!post?.node) return

      const shortestColumn = heights.indexOf(Math.min(...heights))
      if (sortedPosts[shortestColumn] === undefined) {
        sortedPosts[shortestColumn] = []
      }
      sortedPosts[shortestColumn].push(post.node as Post)
      heights[shortestColumn] +=
        post.node.items?.edges?.[0]?.node?.relativeHeight ?? 128
    })
    return sortedPosts
  }, [columns, data])

  return (
    <div className={s.postwall}>
      {sortedPosts.map((posts, i) => {
        return (
          <div key={i} className={s.column}>
            {posts.map((post) => {
              return <PostItem key={post.id} post={post} />
            })}
          </div>
        )
      })}
    </div>
  )
}

const PostItem = (props: { post: Post }) => {
  return (
    <Link
      to={`/${props.post.id}`}
      className={s.post}
      style={{
        paddingBottom: `${
          props.post.items?.edges?.[0]?.node?.relativeHeight ?? 128
        }%`,
      }}
    >
      {
        <img
          loading="lazy"
          className={s.image}
          src={`${props.post.items?.edges?.[0]?.node?.thumbnailPath}.jpeg`}
        />
      }

      <div className={s.info}>
        <div className={s.title}>{props.post.title}</div>
        <div className={s.creator}>
          <img src={`${props.post.creator?.profilePicture}-32.jpeg`} />
        </div>
        <div className={s.items}>{props.post.items?.totalCount ?? 0}</div>
      </div>
    </Link>
  )
}

export default PostWall
