import Button, { ButtonKind } from '@src/components/Button'
import PostWall from '@src/components/PostWall'
import React from 'react'
import './Home.sass'

const Home = () => {
  return (
    <>
      <nav className="archive--tintbar">
        <div className="archive--tintbar--inner">
          <input placeholder="Search..." />
          <Button kind={ButtonKind.SECONDARY_TINTBAR} large={true}>
            New post
          </Button>
        </div>
      </nav>
      <main className="archive--home">
        <PostWall />
      </main>
    </>
  )
}

export default Home
