import { Item, usePostQuery } from '@src/generated/graphql'
import React from 'react'
import { useParams } from 'react-router-dom'
import { default as ItemComponent } from '@src/components/Item'

import s from './Post.module.sass'

const Post = () => {
  const { id } = useParams()
  const { data, loading } = usePostQuery({
    variables: { id: id as string },
  })

  if (loading) {
    return <div>Loading...</div>
  }

  const post = data?.node?.__typename === 'Post' ? data.node : null

  if (!post) {
    return <div>Post not found</div>
  }

  return (
    <div className={s.post}>
      <section className="archive--tintbar extended">
        <div className={`archive--tintbar--inner vertical ${s.bar}`}>
          <h1 className={s.title}>{post.title}</h1>
          <div>
            <span>created by {post.creator?.username}</span>
          </div>
          <div className={s.tags}>
            {post.tags.map((tag) => (
              <span className={s.tag} key={tag.id}>
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </section>
      <div className={s.content}>
        {post.items?.edges?.map((edge) =>
          edge?.node ? (
            <ItemComponent key={edge.node.id} item={edge.node as Item} />
          ) : undefined,
        )}
      </div>
    </div>
  )
}

export default Post
