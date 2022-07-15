import React from 'react'
import './app.sass'
import ArchiveHeader from '@src/components/ArchiveHeader'
import { Routes, Route } from 'react-router-dom'
import Login from '@src/routes/Login'
import Home from '@src/routes/Home'
import Post from '@src/routes/Post'

const App = () => {
  return (
    <React.StrictMode>
      <div id="app">
        <ArchiveHeader />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path=":id" element={<Post />} />
        </Routes>
      </div>
    </React.StrictMode>
  )
}

export default App
