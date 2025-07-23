import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Edit } from 'lucide-react'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { ToastContainer } from 'react-toastify'
import Header from './components/Header'

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <Header />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
        <Route path='/rooms/:id' element={<EditorPage />} />
      </Routes>
    </>
  )
}

export default App
