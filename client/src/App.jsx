import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Edit } from 'lucide-react'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import { ToastContainer, toast } from 'react-toastify'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/rooms/:id' element={<EditorPage />} />
      </Routes>
      <ToastContainer />
    </>
  )
}

export default App
