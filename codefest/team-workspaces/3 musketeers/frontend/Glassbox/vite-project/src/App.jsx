import React from 'react'
import {Route, Routes} from "react-router"
import Login from './pages/Login' 
import Data from './pages/Data'

const App = () => {
  return (
    <div data-theme= 'luxury'>
      <Routes>
        <Route path ="/" element={<Login />}/>
        <Route path ="/:id" element={<Data />}/>
      </Routes>
    </div>
  )
}

export default App;